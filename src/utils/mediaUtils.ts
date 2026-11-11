import { Category } from '../types';

// Import bundled high-speed 4K local assets for 100% reliable Vite resolution
import spaceNebulaImg from '../assets/images/wallpaper_space_nebula_1792241809155.jpg';
import natureMountainsImg from '../assets/images/wallpaper_nature_mountains_1792241809437.jpg';
import gamingCyberpunkImg from '../assets/images/wallpaper_gaming_cyberpunk_1792241811144.jpg';
import supercarNeonImg from '../assets/images/wallpaper_supercar_neon_1792241811336.jpg';
import animeSceneryImg from '../assets/images/wallpaper_anime_scenery_1792241811689.jpg';

/**
 * Maps categories to guaranteed local 4K fallback images.
 * Uses Vite-resolved assets so they are bundled into production with zero 404s.
 */
export const LOCAL_CATEGORY_FALLBACKS: Record<Category | string, string> = {
  Space: spaceNebulaImg,
  Nature: natureMountainsImg,
  Gaming: gamingCyberpunkImg,
  Cars: supercarNeonImg,
  Anime: animeSceneryImg,
  Minimalist: natureMountainsImg,
  Journal: spaceNebulaImg,
  'Mobile Live': gamingCyberpunkImg,
};

export const DEFAULT_FALLBACK_IMAGE = spaceNebulaImg;

/**
 * Global cache of failed image/video URLs to prevent repeated browser network hangs,
 * memory thrashing, and flickering.
 */
const failedUrls = new Set<string>();

export function markUrlAsFailed(url: string) {
  if (url && !url.startsWith('data:')) {
    failedUrls.add(url);
  }
}

export function isUrlFailed(url: string | undefined): boolean {
  if (!url) return true;
  return failedUrls.has(url);
}

/**
 * Detects whether a URL represents a video stream or video file.
 */
export function isVideoUrl(url: string | undefined): boolean {
  if (!url) return false;
  return (
    /\.(mp4|webm|mov|avi|mkv|m4v)($|\?)/i.test(url) ||
    url.startsWith('data:video/')
  );
}

/**
 * Normalizes legacy asset paths (e.g., from old localStorage sessions) to working URLs.
 */
export function normalizeMediaUrl(url: string | undefined, category: string = 'Space'): string {
  if (!url) return getCategoryFallback(category);

  if (url.startsWith('/wallpapers/')) return url;
  if (url.includes('wallpaper_space_nebula')) return '/wallpapers/wallpaper_space_nebula_1792241809155.jpg';
  if (url.includes('wallpaper_nature_mountains')) return '/wallpapers/wallpaper_nature_mountains_1792241809437.jpg';
  if (url.includes('wallpaper_gaming_cyberpunk')) return '/wallpapers/wallpaper_gaming_cyberpunk_1792241811144.jpg';
  if (url.includes('wallpaper_supercar_neon')) return '/wallpapers/wallpaper_supercar_neon_1792241811336.jpg';
  if (url.includes('wallpaper_anime_scenery')) return '/wallpapers/wallpaper_anime_scenery_1792241811689.jpg';

  // Stale blob URL from a previous browser session (browser revokes blob: on reload)
  if (url.startsWith('blob:') && !activeBlobRegistry.has(url)) {
    return getCategoryFallback(category);
  }

  return url;
}

/**
 * Global Object URL Registry for strict Memory Management.
 * Keeps track of created blob URLs and allows mass revocation to prevent browser memory leaks.
 */
const activeBlobRegistry = new Set<string>();

export function registerBlobUrl(url: string): string {
  if (url && url.startsWith('blob:')) {
    activeBlobRegistry.add(url);
  }
  return url;
}

export function revokeBlobUrl(url: string | undefined) {
  if (!url || !url.startsWith('blob:')) return;
  try {
    URL.revokeObjectURL(url);
    activeBlobRegistry.delete(url);
  } catch {
    // ignore
  }
}

export function revokeAllRegisteredBlobUrls() {
  activeBlobRegistry.forEach((url) => {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  });
  activeBlobRegistry.clear();
}

/**
 * Returns a high-speed, lightweight preview URL for grid cards.
 * - If url is a video, NEVER pass to <img> tag; returns fallback image or poster.
 * - If Unsplash, downscales to 960px with q=80 to eliminate browser freezing.
 * - If marked failed, returns category fallback immediately.
 */
export function getOptimizedPreviewUrl(
  url: string | undefined,
  targetWidth: number = 960,
  category: string = 'Space'
): string {
  if (!url || isUrlFailed(url)) {
    return getCategoryFallback(category);
  }

  const normalized = normalizeMediaUrl(url, category);

  // If the URL is actually a video file, it cannot be rendered in an <img> tag!
  if (isVideoUrl(normalized)) {
    return getCategoryFallback(category);
  }

  // Data URLs or local bundled assets
  if (normalized.startsWith('data:') || normalized.startsWith('blob:') || normalized.startsWith('/') || normalized.startsWith('./')) {
    return normalized;
  }

  // Unsplash image optimization: ensure fast loading and low memory footprint
  if (normalized.includes('images.unsplash.com')) {
    try {
      const parsed = new URL(normalized);
      parsed.searchParams.set('w', targetWidth.toString());
      parsed.searchParams.set('q', '80');
      parsed.searchParams.set('auto', 'format');
      return parsed.toString();
    } catch {
      return normalized.replace(/w=\d+/, `w=${targetWidth}`).replace(/q=\d+/, 'q=80');
    }
  }

  return normalized;
}

/**
 * Retrieves the local fallback image according to the wallpaper category.
 */
export function getCategoryFallback(category: Category | string): string {
  return LOCAL_CATEGORY_FALLBACKS[category] || DEFAULT_FALLBACK_IMAGE;
}

/**
 * Extracts a thumbnail poster frame from a video file or blob URL.
 * Safely resolves with empty string if unreadable or timed out (never hangs).
 */
export function extractVideoPoster(fileOrBlobUrl: string | File): Promise<string> {
  return new Promise((resolve) => {
    let timeoutId: any;
    let tempBlobUrl: string | null = null;

    try {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.playsInline = true;
      video.preload = 'metadata';

      const src =
        typeof fileOrBlobUrl === 'string'
          ? fileOrBlobUrl
          : (tempBlobUrl = registerBlobUrl(URL.createObjectURL(fileOrBlobUrl)));

      video.src = src;

      timeoutId = setTimeout(() => {
        cleanup();
        resolve('');
      }, 2500);

      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        video.src = '';
        video.load();
        if (tempBlobUrl) {
          revokeBlobUrl(tempBlobUrl);
        }
      };

      video.onloadedmetadata = () => {
        video.currentTime = Math.min(0.5, (video.duration || 1) / 2);
      };

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 640;
          canvas.height = 360;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const thumb = canvas.toDataURL('image/jpeg', 0.82);
            cleanup();
            resolve(thumb);
            return;
          }
        } catch {
          // ignore canvas taint
        }
        cleanup();
        resolve('');
      };

      video.onerror = () => {
        cleanup();
        resolve('');
      };
    } catch {
      if (timeoutId) clearTimeout(timeoutId);
      resolve('');
    }
  });
}

/**
 * Generates an ultra-lightweight JPEG thumbnail (max 640px) from any File or Blob
 * to ensure grid loading is instantaneous and memory-efficient.
 */
export function createThumbnailFromImage(fileOrBlob: File | Blob, maxWidth: number = 640): Promise<string> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      const tempUrl = URL.createObjectURL(fileOrBlob);
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.naturalWidth || 640;
          let height = img.naturalHeight || 360;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const thumb = canvas.toDataURL('image/jpeg', 0.82);
            URL.revokeObjectURL(tempUrl);
            resolve(thumb);
            return;
          }
        } catch {
          // ignore canvas taint
        }
        URL.revokeObjectURL(tempUrl);
        resolve('');
      };
      img.onerror = () => {
        URL.revokeObjectURL(tempUrl);
        resolve('');
      };
      img.src = tempUrl;
    } catch {
      resolve('');
    }
  });
}

/**
 * Generates an SVG Data URL fallback placeholder with 4K badge and sleek dark aesthetics.
 * Uses the Dark Neon styling to eliminate black screens and duplicate fallback glitches.
 */
export function getSvgCardPlaceholder(title: string, category: string): string {
  const cleanTitle = (title || '4K Ultra HD Wallpaper').replace(/[<>&"]/g, '').slice(0, 40);
  const cleanCat = (category || 'Gallery').replace(/[<>&"]/g, '').slice(0, 25);

  let neon = '#00F0FF';
  let secondary = '#3B82F6';
  if (category === 'Space') {
    neon = '#A855F7';
    secondary = '#06B6D4';
  } else if (category === 'Anime') {
    neon = '#F472B6';
    secondary = '#FDE047';
  } else if (category === 'Gaming') {
    neon = '#00F0FF';
    secondary = '#FF007F';
  } else if (category === 'Cars') {
    neon = '#EF4444';
    secondary = '#F59E0B';
  } else if (category === 'Nature') {
    neon = '#10B981';
    secondary = '#34D399';
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="100%" height="100%">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#08090E"/>
        <stop offset="50%" stop-color="#121420"/>
        <stop offset="100%" stop-color="#06070B"/>
      </linearGradient>
      <radialGradient id="neonGlow" cx="50%" cy="50%" r="55%">
        <stop offset="0%" stop-color="${neon}" stop-opacity="0.25"/>
        <stop offset="60%" stop-color="${secondary}" stop-opacity="0.08"/>
        <stop offset="100%" stop-color="#06070B" stop-opacity="0"/>
      </radialGradient>
      <pattern id="gridPattern" width="60" height="60" patternUnits="userSpaceOnUse">
        <path d="M 60 0 L 0 0 0 60" fill="none" stroke="${neon}" stroke-opacity="0.04" stroke-width="1.2"/>
      </pattern>
    </defs>
    <rect width="1920" height="1080" fill="url(#bg)"/>
    <rect width="1920" height="1080" fill="url(#gridPattern)"/>
    <rect width="1920" height="1080" fill="url(#neonGlow)"/>
    <rect x="80" y="80" width="1760" height="920" rx="32" fill="none" stroke="${neon}" stroke-opacity="0.16" stroke-width="1.5" stroke-dasharray="16 12"/>
    <circle cx="960" cy="500" r="260" fill="none" stroke="${neon}" stroke-opacity="0.12" stroke-width="2"/>
    <g transform="translate(960, 480)" text-anchor="middle">
      <rect x="-140" y="-120" width="280" height="60" rx="30" fill="#0D0F18" stroke="${neon}" stroke-width="2.5"/>
      <text y="-80" fill="#FFFFFF" font-family="system-ui, -apple-system, sans-serif" font-size="26" font-weight="900" letter-spacing="4">4K ULTRA HD</text>
      <text y="50" fill="#F8FAFC" font-family="system-ui, -apple-system, sans-serif" font-size="44" font-weight="800">${cleanTitle}</text>
      <text y="110" fill="${neon}" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="600" letter-spacing="2">${cleanCat.toUpperCase()} · DESKSPACE4K</text>
    </g>
    <g transform="translate(960, 930)" text-anchor="middle">
      <text fill="#64748B" font-family="monospace, sans-serif" font-size="18" font-weight="500" letter-spacing="1">3840 × 2160 · 60 FPS ENGINE · CALIBRATED OLED OPTICS</text>
    </g>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
