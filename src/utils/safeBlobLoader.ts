import { Wallpaper, Category } from '../types';
import { getMediaFromIndexedDB, storeBlobInIndexedDB } from './storageManager';
import { getCategoryFallback, registerBlobUrl, revokeBlobUrl } from './mediaUtils';

/**
 * Global In-Memory Object URL Cache to prevent redundant Blob-to-URL allocations
 * and prevent memory leaks.
 */
const activeObjectUrlCache = new Map<string, string>();

/**
 * Generates an ultra-crisp, high-fidelity Dark Neon Placeholder SVG
 * matching the visual identity of DeskSpace4K.
 * Eliminates black screens, broken icons, or duplicate image glitches.
 */
export function getDarkNeonPlaceholder(title: string, category: Category | string = 'Space'): string {
  const safeTitle = (title || '4K Ultra HD Wallpaper').replace(/[<>&"]/g, '').slice(0, 36);
  const safeCat = (category || 'Gallery').replace(/[<>&"]/g, '').slice(0, 24);

  // Dynamic neon cyber accents matching category
  let neonColor = '#00F0FF'; // Cyan default
  let accentSecondary = '#3B82F6';
  if (category === 'Space') {
    neonColor = '#A855F7';
    accentSecondary = '#06B6D4';
  } else if (category === 'Anime') {
    neonColor = '#F472B6';
    accentSecondary = '#FDE047';
  } else if (category === 'Gaming') {
    neonColor = '#00F0FF';
    accentSecondary = '#FF007F';
  } else if (category === 'Cars') {
    neonColor = '#EF4444';
    accentSecondary = '#F59E0B';
  } else if (category === 'Nature') {
    neonColor = '#10B981';
    accentSecondary = '#34D399';
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="100%" height="100%">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#08090E"/>
        <stop offset="45%" stop-color="#10121C"/>
        <stop offset="100%" stop-color="#06070B"/>
      </linearGradient>
      <radialGradient id="centerGlow" cx="50%" cy="50%" r="55%">
        <stop offset="0%" stop-color="${neonColor}" stop-opacity="0.22"/>
        <stop offset="60%" stop-color="${accentSecondary}" stop-opacity="0.08"/>
        <stop offset="100%" stop-color="#08090E" stop-opacity="0"/>
      </radialGradient>
      <pattern id="cyberGrid" width="60" height="60" patternUnits="userSpaceOnUse">
        <path d="M 60 0 L 0 0 0 60" fill="none" stroke="${neonColor}" stroke-opacity="0.04" stroke-width="1.2"/>
      </pattern>
      <filter id="neonBlur" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="18" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    
    <!-- Deep Dark Cyber Canvas -->
    <rect width="1920" height="1080" fill="url(#bgGrad)"/>
    <rect width="1920" height="1080" fill="url(#cyberGrid)"/>
    <rect width="1920" height="1080" fill="url(#centerGlow)"/>

    <!-- Subtle Geometric Neon Framing -->
    <rect x="80" y="80" width="1760" height="920" rx="32" fill="none" stroke="${neonColor}" stroke-opacity="0.15" stroke-width="1.5" stroke-dasharray="16 12"/>
    <circle cx="960" cy="500" r="260" fill="none" stroke="${neonColor}" stroke-opacity="0.12" stroke-width="2"/>
    <circle cx="960" cy="500" r="320" fill="none" stroke="${accentSecondary}" stroke-opacity="0.06" stroke-width="1"/>

    <!-- Central Cyber Emblem & Typography -->
    <g transform="translate(960, 480)" text-anchor="middle">
      <!-- 4K Badge -->
      <rect x="-140" y="-120" width="280" height="60" rx="30" fill="#0E1018" stroke="${neonColor}" stroke-width="2.5" filter="url(#neonBlur)"/>
      <text y="-80" fill="#FFFFFF" font-family="system-ui, -apple-system, sans-serif" font-size="26" font-weight="900" letter-spacing="4">4K ULTRA HD</text>

      <!-- Wallpaper Title -->
      <text y="50" fill="#F8FAFC" font-family="system-ui, -apple-system, sans-serif" font-size="44" font-weight="800">${safeTitle}</text>
      
      <!-- Category & Brand Subtitle -->
      <text y="110" fill="${neonColor}" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="600" letter-spacing="2">${safeCat.toUpperCase()} · DESKSPACE4K</text>
    </g>

    <!-- Bottom Tech Specs -->
    <g transform="translate(960, 930)" text-anchor="middle">
      <text fill="#64748B" font-family="monospace, sans-serif" font-size="18" font-weight="500" letter-spacing="1">3840 × 2160 · 60 FPS ENGINE · CALIBRATED OLED OPTICS</text>
    </g>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * SafeBlobLoader: Safely resolves a media URL from IndexedDB or remote sources.
 * - Detects stale, dead blob URLs from prior sessions and revives them from IndexedDB.
 * - Resolves custom `idb://media/:id` protocol references into fresh in-memory Blob URLs.
 * - Caches active URLs in memory to eliminate repeated allocation.
 * - Falls back cleanly to Dark Neon Placeholder on corrupted assets.
 */
export async function safeResolveMediaUrl(
  mediaId: string,
  rawUrl: string | undefined,
  category: Category | string = 'Space',
  fallbackTitle: string = 'DeskSpace4K Wallpaper'
): Promise<string> {
  if (!rawUrl) {
    return getCategoryFallback(category);
  }

  // Case 1: Bundled local asset or public path (/assets/... or ./assets/...)
  if (rawUrl.startsWith('/') || rawUrl.startsWith('./')) {
    return rawUrl;
  }

  // Case 2: Standard Base64 Data URL or SVG Data URL
  if (rawUrl.startsWith('data:')) {
    return rawUrl;
  }

  // Case 3: Remote Direct HTTP/HTTPS URL (Unsplash, Imgur, Pixabay, Pexels, CDN)
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
    return rawUrl;
  }

  // Case 4: Stale or Active Blob URL (blob:http...)
  // Notice: If browser was refreshed, existing blob: URLs are dead and will error.
  const lookupKey = rawUrl.startsWith('idb://media/')
    ? rawUrl.replace('idb://media/', '')
    : mediaId;

  // We check if we already generated a fresh active URL in current session:
  if (rawUrl.startsWith('blob:') || rawUrl.startsWith('idb://')) {
    if (activeObjectUrlCache.has(lookupKey)) {
      return activeObjectUrlCache.get(lookupKey)!;
    }
  }

  // Case 5: Custom IndexedDB scheme `idb://media/:id` or dead blob revival:
  // Retrieve the original raw binary Blob stored permanently in IndexedDB:
  try {
    const mediaRecord = await getMediaFromIndexedDB(lookupKey);
    if (mediaRecord) {
      if (mediaRecord.blob) {
        // Revoke any previous object URL for this lookupKey to prevent memory leaks
        const existing = activeObjectUrlCache.get(lookupKey);
        if (existing) {
          revokeBlobUrl(existing);
        }

        const freshUrl = URL.createObjectURL(mediaRecord.blob);
        registerBlobUrl(freshUrl);
        activeObjectUrlCache.set(lookupKey, freshUrl);
        return freshUrl;
      }

      if (mediaRecord.base64) {
        return mediaRecord.base64;
      }
    }
  } catch (err) {
    console.warn(`SafeBlobLoader: Failed to retrieve media for ${lookupKey} from IndexedDB:`, err);
  }

  // If URL was a dead blob: and could not be revived from IndexedDB, return Dark Neon Placeholder
  if (rawUrl.startsWith('blob:') || rawUrl.startsWith('idb://')) {
    return getDarkNeonPlaceholder(fallbackTitle, category);
  }

  return rawUrl;
}

/**
 * Revokes an object URL when a media item is deleted or replaced
 */
export function revokeMediaObjectUrl(mediaId: string): void {
  const existing = activeObjectUrlCache.get(mediaId);
  if (existing) {
    revokeBlobUrl(existing);
    activeObjectUrlCache.delete(mediaId);
  }
}

/**
 * Revokes all cached active Object URLs (e.g. on unmount or reset)
 */
export function revokeAllMediaObjectUrls(): void {
  activeObjectUrlCache.forEach((url) => {
    revokeBlobUrl(url);
  });
  activeObjectUrlCache.clear();
}
