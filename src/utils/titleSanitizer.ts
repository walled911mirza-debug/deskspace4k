/**
 * Title Sanitizer & Resolution Parser Utility
 * Cleans wallpaper titles by stripping resolution suffixes (e.g., ".3840x2160", "_1920x1080", "4K UHD")
 * and formatting titles into clean Title Case while preserving Arabic text and tech acronyms.
 */

// Common acronyms and initialisms that should remain capitalized
const ACRONYMS = new Set([
  '4K',
  '8K',
  '2K',
  'HD',
  'FHD',
  'QHD',
  'UHD',
  'OLED',
  'AMOLED',
  'HDR',
  'FPS',
  'RGB',
  'AI',
  'CGI',
  'BMW',
  'GTR',
  'JDM',
  'GT',
  'V8',
  'V12',
  'AMG',
  'SUV',
  'PC',
  'UI',
  'UX',
  'VR',
  'AR',
  'NASA',
]);

// Minor English stop words to keep lowercase in title casing (unless first or last word)
const MINOR_WORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'but',
  'or',
  'for',
  'nor',
  'on',
  'at',
  'to',
  'from',
  'by',
  'with',
  'in',
  'of',
  'into',
  'near',
  'over',
]);

/**
 * Extracts resolution dimensions from a filename or title string.
 * Example: "Gojo_Satoru.3840x2160.mp4" -> "3840×2160"
 */
export function extractResolutionFromTitle(raw: string): string | null {
  if (!raw) return null;

  // Match 3840x2160, 3840×2160, 2160x3840, 1920x1080, etc.
  const resMatch = raw.match(/(\d{3,4})\s*[x×X_]\s*(\d{3,4})/);
  if (resMatch) {
    const width = parseInt(resMatch[1], 10);
    const height = parseInt(resMatch[2], 10);
    if (width >= 720 && height >= 720) {
      return `${width}×${height}`;
    }
  }

  // Common label shortcuts
  if (/\b(?:8k|4320p)\b/i.test(raw)) return '7680×4320';
  if (/\b(?:4k|2160p|uhd)\b/i.test(raw)) return '3840×2160';
  if (/\b(?:2k|1440p|qhd)\b/i.test(raw)) return '2560×1440';
  if (/\b(?:1080p|fhd)\b/i.test(raw)) return '1920×1080';

  return null;
}

/**
 * Converts English text to clean Title Case while preserving Arabic words, numbers, and tech acronyms.
 */
export function toTitleCase(text: string): string {
  if (!text) return '';

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';

  return words
    .map((word, index) => {
      // Check for Arabic or non-ASCII characters - leave untouched
      if (/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(word)) {
        return word;
      }

      const upper = word.toUpperCase();
      if (ACRONYMS.has(upper)) {
        return upper;
      }

      const lower = word.toLowerCase();

      // Keep minor words lowercase if they are not the first or last word
      if (index > 0 && index < words.length - 1 && MINOR_WORDS.has(lower)) {
        return lower;
      }

      // Standard capitalization: First letter uppercase, remainder lowercase
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Sanitizes and cleans a wallpaper title string:
 * - Strips media file extensions (.mp4, .jpg, .webm, etc.)
 * - Strips resolution tokens (.3840x2160, _3840x2160, (3840x2160), [4K], etc.)
 * - Strips trailing tags like "live motion", "60fps", "wallpaper", etc.
 * - Cleans redundant punctuation and whitespace
 * - Applies clean Title Case formatting
 *
 * @param rawTitle The raw title or filename
 * @returns Clean, human-readable title
 */
export function cleanWallpaperTitle(rawTitle: string): string {
  if (!rawTitle || typeof rawTitle !== 'string') return '';

  let title = rawTitle.trim();

  // 1. Strip file extensions (.mp4, .webm, .jpg, .jpeg, .png, .webp, .mov, etc.)
  title = title.replace(/\.(mp4|webm|mkv|mov|avi|jpg|jpeg|png|webp|gif|bmp|tiff)$/i, '');

  // 2. Strip resolution patterns like .3840x2160, _3840x2160, -3840x2160, (3840x2160), [3840x2160], 3840x2160, 2160x3840, 1920x1080
  title = title.replace(/[._\-(\[]*\s*\b\d{3,4}\s*[x×X]\s*\d{3,4}\b\s*[._\-)\]]*/gi, ' ');

  // 3. Strip standalone resolution/format labels (e.g. 4K, 8K, UHD, Ultra HD, 1080p, 60fps, 60 fps, 1440p)
  title = title.replace(/[._\-(\[]*\s*\b(?:4k|8k|uhd|ultra\s*hd|fhd|qhd|1080p|1440p|2160p|60\s*fps|60fps)\b\s*[._\-)\]]*/gi, ' ');

  // 4. Strip redundant keyword suffixes (e.g. "Wallpaper", "Desktop Wallpaper", "Live Motion", "Loop")
  title = title.replace(/[._\-(\[]*\s*\b(?:desktop\s*wallpaper|live\s*motion|live\s*wallpaper|motion\s*wallpaper|wallpaper|wallpapers)\b\s*[._\-)\]]*/gi, ' ');

  // 5. Replace separators (underscores, dashes, redundant dots) with spaces
  title = title.replace(/[_\-]+/g, ' ');
  title = title.replace(/\.+/g, ' ');

  // 6. Strip stray brackets or parentheses that might be empty or left behind
  title = title.replace(/[()[\]{}]+/g, ' ');

  // 7. Strip leading or trailing non-alphanumeric punctuation
  title = title.replace(/^[^a-zA-Z0-9\u0600-\u06FF]+|[^a-zA-Z0-9\u0600-\u06FF]+$/g, '');

  // 8. Normalize multiple spaces into single space
  title = title.replace(/\s+/g, ' ').trim();

  // 9. If empty after stripping (e.g. file was just named "3840x2160.jpg"), fallback gracefully
  if (!title) {
    return 'DeskSpace 4K Wallpaper';
  }

  // 10. Apply Title Case formatting
  return toTitleCase(title);
}

/**
 * Parses a wallpaper object to extract its sanitized title for both languages
 * and ensures resolution is cleanly separated.
 */
export function getSanitizedWallpaperInfo(wallpaper: {
  title: { en: string; ar: string };
  resolution?: string;
  width?: number;
  height?: number;
}) {
  const cleanEn = cleanWallpaperTitle(wallpaper.title?.en || '');
  const cleanAr = cleanWallpaperTitle(wallpaper.title?.ar || '');

  // Determine standard resolution string
  let resolutionBadge = wallpaper.resolution?.trim();
  if (!resolutionBadge || resolutionBadge.length < 3) {
    if (wallpaper.width && wallpaper.height) {
      resolutionBadge = `${wallpaper.width}×${wallpaper.height}`;
    } else {
      resolutionBadge = '3840×2160';
    }
  }

  // Standardize the multiplication symbol to ×
  resolutionBadge = resolutionBadge.replace(/\s*[xX]\s*/g, '×').trim();

  return {
    cleanTitleEn: cleanEn,
    cleanTitleAr: cleanAr || cleanEn,
    resolutionBadge,
  };
}
