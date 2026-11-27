import { useEffect } from 'react';
import { Language, Wallpaper } from '../types';
import { cleanWallpaperTitle, extractResolutionFromTitle } from './titleSanitizer';
import { isVideoUrl } from './mediaUtils';

export const SITE_NAME = 'DeskSpace4K';
export const WALLPAPER_JSONLD_SCRIPT_ID = 'deskspace-wallpaper-jsonld';
const DEFAULT_OG_IMAGE_PATH = '/wallpapers/wallpaper_space_nebula_1792241809155.jpg';

function getOriginSafe(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }
  return 'https://deskspace4k.com';
}

function resolvePublicMediaUrl(rawUrl: string | undefined | null, fallbackUrl?: string): string {
  const origin = getOriginSafe();
  if (typeof rawUrl === 'string') {
    const trimmed = rawUrl.trim();
    if (
      trimmed &&
      !trimmed.startsWith('idb://') &&
      !trimmed.startsWith('blob:') &&
      !trimmed.startsWith('data:')
    ) {
      if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
      }
      if (trimmed.startsWith('//')) {
        return `https:${trimmed}`;
      }
      if (trimmed.startsWith('/')) {
        return `${origin}${trimmed}`;
      }
      return `${origin}/${trimmed}`;
    }
  }
  if (fallbackUrl) return fallbackUrl;
  return `${origin}${DEFAULT_OG_IMAGE_PATH}`;
}

function extractLocalizedDescription(
  wallpaper: Wallpaper,
  lang: Language,
  cleanTitle: string,
  resolutionLabel: string,
  isLive: boolean
): string {
  const rawDesc = wallpaper.description;
  let explicitDesc = '';

  if (typeof rawDesc === 'string') {
    explicitDesc = rawDesc.trim();
  } else if (rawDesc && typeof rawDesc === 'object') {
    explicitDesc = (rawDesc[lang] || rawDesc.en || rawDesc.ar || '').trim();
  }

  if (explicitDesc && explicitDesc.length >= 30) {
    return explicitDesc.length > 165 ? `${explicitDesc.slice(0, 162).trimEnd()}...` : explicitDesc;
  }

  const formatLabelEn = isLive ? 'Live Motion 4K' : '4K Ultra HD';
  const formatLabelAr = isLive ? 'متحركة حية بدقة 4K' : 'فائقة الدقة 4K Ultra HD';

  if (lang === 'ar') {
    return `حمل خلفية ${cleanTitle} (${formatLabelAr}) بدقة ${resolutionLabel} من قسم ${wallpaper.category} مجاناً للكمبيوتر والهاتف على ${SITE_NAME}.`;
  }

  return `Download ${cleanTitle} ${formatLabelEn} wallpaper (${resolutionLabel}) in ${wallpaper.category} free for desktop and mobile on ${SITE_NAME}.`;
}

function getResolutionDimensions(wallpaper: Wallpaper, rawTitle: string): {
  label: string;
  width: number;
  height: number;
} {
  const isMobile = Boolean(
    wallpaper.deviceFormat === 'mobile' ||
      wallpaper.aspectRatio === '9:16' ||
      wallpaper.isMobile ||
      wallpaper.category === 'Mobile'
  );
  const defaultWidth = isMobile ? 2160 : 3840;
  const defaultHeight = isMobile ? 3840 : 2160;

  const width = Number.isFinite(wallpaper.width) && wallpaper.width > 0 ? wallpaper.width : defaultWidth;
  const height = Number.isFinite(wallpaper.height) && wallpaper.height > 0 ? wallpaper.height : defaultHeight;

  const fromTitle = extractResolutionFromTitle(rawTitle);
  const label =
    fromTitle ||
    (wallpaper.resolution ? wallpaper.resolution.replace(/\s*[xX]\s*/g, '×').trim() : `${width}×${height}`);

  return { label, width, height };
}

function inferImageMimeType(url: string): string {
  const lower = url.toLowerCase().split('?')[0];
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.avif')) return 'image/avif';
  return 'image/jpeg';
}

function inferVideoMimeType(url: string): string {
  const lower = url.toLowerCase().split('?')[0];
  if (lower.endsWith('.webm')) return 'video/webm';
  return 'video/mp4';
}

function isIsoDateValid(value: string | undefined): boolean {
  if (!value) return false;
  const time = Date.parse(value);
  return Number.isFinite(time);
}

export class SEOManager {
  static upsertMetaTag(attrName: 'name' | 'property', attrValue: string, content: string): void {
    if (typeof document === 'undefined' || !document.head) return;

    let el = document.head.querySelector(`meta[${attrName}="${attrValue}"]`) as HTMLMetaElement | null;
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attrName, attrValue);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }

  static removeMetaTag(attrName: 'name' | 'property', attrValue: string): void {
    if (typeof document === 'undefined' || !document.head) return;
    const el = document.head.querySelector(`meta[${attrName}="${attrValue}"]`);
    if (el) {
      el.remove();
    }
  }

  static upsertLinkTag(rel: string, href: string): void {
    if (typeof document === 'undefined' || !document.head) return;

    let el = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
    if (!el) {
      el = document.createElement('link');
      el.setAttribute('rel', rel);
      document.head.appendChild(el);
    }
    el.setAttribute('href', href);
  }

  static getCanonicalUrl(wallpaper?: Wallpaper | null): string {
    const origin = getOriginSafe();
    if (typeof window !== 'undefined' && window.location?.pathname) {
      const cleanPath = window.location.pathname.replace(/\/+$/, '') || '/';
      if (!wallpaper || cleanPath.startsWith('/wallpaper/')) {
        return `${origin}${cleanPath}`;
      }
    }
    if (wallpaper) {
      const slugOrId = wallpaper.slug || wallpaper.id;
      return `${origin}/wallpaper/${encodeURIComponent(slugOrId)}`;
    }
    return `${origin}/`;
  }

  static buildWallpaperJsonLd(wallpaper: Wallpaper, lang: Language = 'en'): Record<string, unknown> {
    const origin = getOriginSafe();
    const canonicalUrl = SEOManager.getCanonicalUrl(wallpaper);
    const rawTitle = wallpaper.title?.[lang] || wallpaper.title?.en || wallpaper.title?.ar || '4K Wallpaper';
    const cleanTitle = cleanWallpaperTitle(rawTitle);
    const altTitle = cleanWallpaperTitle(
      lang === 'ar'
        ? wallpaper.title?.en || rawTitle
        : wallpaper.title?.ar || rawTitle
    );

    const isLive = Boolean(
      wallpaper.isLive &&
        (wallpaper.videoUrl ||
          wallpaper.formatType === 'video' ||
          isVideoUrl(wallpaper.url) ||
          isVideoUrl(wallpaper.videoUrl))
    );

    const { label: resolutionLabel, width, height } = getResolutionDimensions(wallpaper, rawTitle);
    const description = extractLocalizedDescription(wallpaper, lang, cleanTitle, resolutionLabel, isLive);

    const defaultImg = `${origin}${DEFAULT_OG_IMAGE_PATH}`;
    const primaryImageCandidate = isLive
      ? wallpaper.posterUrl || wallpaper.thumbnailUrl
      : wallpaper.url || wallpaper.posterUrl || wallpaper.thumbnailUrl;
    const publicImageUrl = resolvePublicMediaUrl(primaryImageCandidate, defaultImg);
    const publicThumbnailUrl = resolvePublicMediaUrl(
      wallpaper.thumbnailUrl || wallpaper.posterUrl || primaryImageCandidate,
      publicImageUrl
    );
    const rawVideoCandidate = wallpaper.videoUrl || (isVideoUrl(wallpaper.url) ? wallpaper.url : '');
    const publicVideoUrl =
      isLive && rawVideoCandidate ? resolvePublicMediaUrl(rawVideoCandidate, '') : '';

    const safeTags = Array.isArray(wallpaper.tags)
      ? wallpaper.tags.map((t) => String(t).trim()).filter(Boolean)
      : [];
    const keywordList = Array.from(
      new Set([
        ...safeTags,
        wallpaper.category,
        resolutionLabel,
        isLive ? 'Live Wallpaper' : '4K Wallpaper',
        SITE_NAME,
      ])
    );

    const publisherOrg = {
      '@type': 'Organization',
      name: SITE_NAME,
      url: origin,
    };

    const imageObject: Record<string, unknown> = {
      '@type': 'ImageObject',
      '@id': `${canonicalUrl}#image`,
      name: cleanTitle,
      ...(altTitle && altTitle !== cleanTitle ? { alternateName: altTitle } : {}),
      description,
      url: canonicalUrl,
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': canonicalUrl,
      },
      contentUrl: publicImageUrl,
      thumbnailUrl: publicThumbnailUrl,
      encodingFormat: inferImageMimeType(publicImageUrl),
      width,
      height,
      ...(wallpaper.fileSize ? { contentSize: wallpaper.fileSize } : {}),
      genre: wallpaper.category,
      keywords: keywordList.join(', '),
      inLanguage: lang,
      representativeOfPage: true,
      isAccessibleForFree: true,
      ...(isIsoDateValid(wallpaper.createdAt) ? { datePublished: wallpaper.createdAt } : {}),
      creator: publisherOrg,
      publisher: publisherOrg,
      interactionStatistic: [
        {
          '@type': 'InteractionCounter',
          interactionType: 'https://schema.org/DownloadAction',
          userInteractionCount: Number(wallpaper.downloads) || 0,
        },
        {
          '@type': 'InteractionCounter',
          interactionType: 'https://schema.org/LikeAction',
          userInteractionCount: Number(wallpaper.favorites) || 0,
        },
      ],
    };

    const graphNodes: Record<string, unknown>[] = [imageObject];

    if (publicVideoUrl) {
      const videoObject: Record<string, unknown> = {
        '@type': 'VideoObject',
        '@id': `${canonicalUrl}#video`,
        name: `${cleanTitle} (${isLive ? 'Live Motion 4K' : '4K'})`,
        description,
        thumbnailUrl: publicThumbnailUrl,
        contentUrl: publicVideoUrl,
        encodingFormat: inferVideoMimeType(publicVideoUrl),
        ...(isIsoDateValid(wallpaper.createdAt) ? { uploadDate: wallpaper.createdAt } : {}),
        publisher: publisherOrg,
      };
      graphNodes.push(videoObject);
    }

    const breadcrumbList: Record<string, unknown> = {
      '@type': 'BreadcrumbList',
      '@id': `${canonicalUrl}#breadcrumb`,
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: SITE_NAME,
          item: `${origin}/`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: wallpaper.category,
          item: `${origin}/?category=${encodeURIComponent(wallpaper.category)}`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: cleanTitle,
          item: canonicalUrl,
        },
      ],
    };
    graphNodes.push(breadcrumbList);

    return {
      '@context': 'https://schema.org',
      '@graph': graphNodes,
    };
  }

  static injectJsonLd(
    data: Record<string, unknown>,
    scriptId: string = WALLPAPER_JSONLD_SCRIPT_ID
  ): void {
    if (typeof document === 'undefined' || !document.head) return;

    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      script.setAttribute('data-seo-managed', 'wallpaper');
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
  }

  static removeWallpaperJsonLd(scriptId: string = WALLPAPER_JSONLD_SCRIPT_ID): void {
    if (typeof document === 'undefined') return;
    const existing = document.getElementById(scriptId);
    if (existing) {
      existing.remove();
    }
  }

  static updateWallpaperSEO(wallpaper: Wallpaper, lang: Language = 'en'): void {
    if (typeof document === 'undefined') return;

    const origin = getOriginSafe();
    const canonicalUrl = SEOManager.getCanonicalUrl(wallpaper);
    const rawTitle = wallpaper.title?.[lang] || wallpaper.title?.en || wallpaper.title?.ar || '4K Wallpaper';
    const cleanTitle = cleanWallpaperTitle(rawTitle);

    const isLive = Boolean(
      wallpaper.isLive &&
        (wallpaper.videoUrl ||
          wallpaper.formatType === 'video' ||
          isVideoUrl(wallpaper.url) ||
          isVideoUrl(wallpaper.videoUrl))
    );

    const { label: resolutionLabel, width, height } = getResolutionDimensions(wallpaper, rawTitle);
    const pageTitle =
      lang === 'ar'
        ? `${cleanTitle} - خلفية ${isLive ? 'حية ' : ''}${resolutionLabel} · ${SITE_NAME}`
        : `${cleanTitle} - ${isLive ? 'Live ' : ''}4K Ultra HD Wallpaper (${resolutionLabel}) · ${SITE_NAME}`;

    const pageDescription = extractLocalizedDescription(
      wallpaper,
      lang,
      cleanTitle,
      resolutionLabel,
      isLive
    );

    const safeTags = Array.isArray(wallpaper.tags)
      ? wallpaper.tags.map((t) => String(t).trim()).filter(Boolean)
      : [];
    const keywords = Array.from(
      new Set([
        cleanTitle,
        wallpaper.category,
        resolutionLabel,
        isLive ? 'Live Wallpaper 4K' : '4K Wallpaper',
        ...safeTags,
        SITE_NAME,
      ])
    ).join(', ');

    const defaultImg = `${origin}${DEFAULT_OG_IMAGE_PATH}`;
    const imageCandidate = isLive
      ? wallpaper.posterUrl || wallpaper.thumbnailUrl
      : wallpaper.url || wallpaper.posterUrl || wallpaper.thumbnailUrl;
    const ogImage = resolvePublicMediaUrl(imageCandidate, defaultImg);

    const rawVideoCandidate = wallpaper.videoUrl || (isVideoUrl(wallpaper.url) ? wallpaper.url : '');
    const ogVideo = isLive && rawVideoCandidate ? resolvePublicMediaUrl(rawVideoCandidate, '') : '';

    document.title = pageTitle;

    // Standard meta tags
    SEOManager.upsertMetaTag('name', 'description', pageDescription);
    SEOManager.upsertMetaTag('name', 'keywords', keywords);
    SEOManager.upsertLinkTag('canonical', canonicalUrl);

    // OpenGraph tags
    SEOManager.upsertMetaTag('property', 'og:type', 'article');
    SEOManager.upsertMetaTag('property', 'og:site_name', SITE_NAME);
    SEOManager.upsertMetaTag('property', 'og:title', pageTitle);
    SEOManager.upsertMetaTag('property', 'og:description', pageDescription);
    SEOManager.upsertMetaTag('property', 'og:url', canonicalUrl);
    SEOManager.upsertMetaTag('property', 'og:image', ogImage);
    SEOManager.upsertMetaTag('property', 'og:image:width', String(width));
    SEOManager.upsertMetaTag('property', 'og:image:height', String(height));
    SEOManager.upsertMetaTag('property', 'og:image:alt', `${cleanTitle} (${resolutionLabel})`);
    if (ogVideo) {
      SEOManager.upsertMetaTag('property', 'og:video', ogVideo);
    } else {
      SEOManager.removeMetaTag('property', 'og:video');
    }

    // Twitter / X card tags
    SEOManager.upsertMetaTag('name', 'twitter:card', 'summary_large_image');
    SEOManager.upsertMetaTag('name', 'twitter:title', pageTitle);
    SEOManager.upsertMetaTag('name', 'twitter:description', pageDescription);
    SEOManager.upsertMetaTag('name', 'twitter:image', ogImage);

    // Dynamic JSON-LD structured data for this wallpaper
    const jsonLd = SEOManager.buildWallpaperJsonLd(wallpaper, lang);
    SEOManager.injectJsonLd(jsonLd);
  }

  static clearWallpaperSEO(lang: Language = 'en'): void {
    if (typeof document === 'undefined') return;

    const origin = getOriginSafe();
    const defaultImg = `${origin}${DEFAULT_OG_IMAGE_PATH}`;
    const defaultTitle =
      lang === 'ar'
        ? `${SITE_NAME} - خلفيات 4K مجانية وخلفيات حية متحركة`
        : `${SITE_NAME} - Free 4K Wallpapers & Live Wallpapers`;
    const defaultDesc =
      lang === 'ar'
        ? 'حمل مجاناً خلفيات سطح المكتب بدقة 4K وخلفيات Ultra HD وخلفيات متحركة حية للكمبيوتر والهاتف على DeskSpace4K.'
        : 'Download free 4K desktop wallpapers, Ultra HD backgrounds, and live motion wallpapers for PC and mobile on DeskSpace4K.';

    SEOManager.removeWallpaperJsonLd();
    SEOManager.removeMetaTag('property', 'og:video');
    SEOManager.removeMetaTag('property', 'og:image:width');
    SEOManager.removeMetaTag('property', 'og:image:height');
    SEOManager.removeMetaTag('property', 'og:image:alt');

    SEOManager.upsertMetaTag('property', 'og:type', 'website');
    SEOManager.upsertMetaTag('property', 'og:image', defaultImg);
    SEOManager.upsertMetaTag('property', 'og:url', `${origin}/`);
    SEOManager.upsertMetaTag('name', 'twitter:image', defaultImg);
    SEOManager.upsertMetaTag('name', 'twitter:title', defaultTitle);
    SEOManager.upsertMetaTag('name', 'twitter:description', defaultDesc);
    SEOManager.upsertMetaTag(
      'name',
      'keywords',
      'Wallpaper 4K, 4K Desktop Backgrounds, Live Wallpapers, Anime 4K, Ultra HD Wallpapers.'
    );
    SEOManager.upsertLinkTag('canonical', `${origin}/`);
  }
}

/**
 * React hook for WallpaperDetailsPage to dynamically synchronize meta tags,
 * canonical URL, OpenGraph/Twitter social cards, and Schema.org JSON-LD.
 */
export function useWallpaperSEO(wallpaper: Wallpaper | null, lang: Language): void {
  const tagsSignature = Array.isArray(wallpaper?.tags) ? wallpaper.tags.join('|') : '';
  const descSignature =
    typeof wallpaper?.description === 'string'
      ? wallpaper.description
      : wallpaper?.description
      ? `${wallpaper.description.en || ''}|${wallpaper.description.ar || ''}`
      : '';

  useEffect(() => {
    if (!wallpaper) {
      SEOManager.removeWallpaperJsonLd();
      return;
    }

    SEOManager.updateWallpaperSEO(wallpaper, lang);

    return () => {
      SEOManager.clearWallpaperSEO(lang);
    };
  }, [
    wallpaper?.id,
    wallpaper?.slug,
    wallpaper?.title?.en,
    wallpaper?.title?.ar,
    descSignature,
    wallpaper?.category,
    wallpaper?.resolution,
    wallpaper?.width,
    wallpaper?.height,
    wallpaper?.url,
    wallpaper?.posterUrl,
    wallpaper?.thumbnailUrl,
    wallpaper?.videoUrl,
    wallpaper?.isLive,
    wallpaper?.downloads,
    wallpaper?.favorites,
    tagsSignature,
    lang,
  ]);
}
