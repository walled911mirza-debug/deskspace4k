import { Category, Wallpaper } from '../types';
import { isVideoUrl } from './mediaUtils';
import { slugify } from './storageManager';

export interface BulkImportRawRow {
  title?: string;
  title_ar?: string;
  category?: string;
  tags?: string[] | string;
  preview_url?: string | null;
  full_url?: string | null;
  file_size?: string;
  resolution?: string;
  is_live?: boolean | string;
  device_format?: 'desktop' | 'mobile' | string;
}

export interface BulkImportValidationError {
  rowNumber: number;
  title: string;
  reason: string;
}

export interface ParsedBulkImportResult {
  validWallpapers: Wallpaper[];
  errors: BulkImportValidationError[];
  totalRows: number;
}

const VALID_CATEGORIES: Category[] = [
  'Anime',
  'Gaming',
  'Nature',
  'Space',
  'Cars',
  'Minimalist',
  'Journal',
  'Mobile',
];

export function isValidHttpUrl(raw: unknown): boolean {
  if (typeof raw !== 'string') return false;
  const trimmed = raw.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    const isHttp = parsed.protocol === 'http:' || parsed.protocol === 'https:';
    const hasHost = Boolean(parsed.hostname && (parsed.hostname.includes('.') || parsed.hostname === 'localhost'));
    return isHttp && hasHost;
  } catch {
    return false;
  }
}

export function normalizeCategoryValue(raw: unknown): Category {
  if (typeof raw === 'string') {
    const cleaned = raw.trim().toLowerCase();
    const matched = VALID_CATEGORIES.find((c) => c.toLowerCase() === cleaned);
    if (matched) return matched;
    if (cleaned.includes('sci-fi') || cleaned.includes('scifi') || cleaned.includes('galaxy')) return 'Space';
    if (cleaned.includes('cyber') || cleaned.includes('game')) return 'Gaming';
    if (cleaned.includes('auto') || cleaned.includes('car') || cleaned.includes('vehicle')) return 'Cars';
    if (cleaned.includes('landscape') || cleaned.includes('forest') || cleaned.includes('ocean')) return 'Nature';
    if (cleaned.includes('abstract') || cleaned.includes('clean') || cleaned.includes('minimal')) return 'Minimalist';
    if (cleaned.includes('phone') || cleaned.includes('vertical') || cleaned.includes('mobile')) return 'Mobile';
  }
  return 'Space';
}

export function parseTagsValue(raw: unknown, fallbackCategory: Category): string[] {
  if (Array.isArray(raw)) {
    const cleaned = raw.map((item) => String(item ?? '').trim()).filter(Boolean);
    return cleaned.length > 0 ? cleaned : [fallbackCategory, '4K Ultra HD'];
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [fallbackCategory, '4K Ultra HD'];
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.map((item) => String(item ?? '').trim()).filter(Boolean);
          if (cleaned.length > 0) return cleaned;
        }
      } catch {
        // fall through to delimiter split
      }
    }
    const parts = trimmed
      .split(/[,;|]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return parts.length > 0 ? parts : [fallbackCategory, '4K Ultra HD'];
  }
  return [fallbackCategory, '4K Ultra HD'];
}

/**
 * RFC-4180 compliant CSV parser supporting UTF-8 BOM, quoted values, and commas inside quotes.
 */
export function parseCsvRows(csvText: string): Record<string, string>[] {
  const cleaned = csvText.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    const next = cleaned[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        currentField += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentField += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (ch === '\r' && next === '\n') {
        currentRow.push(currentField.trim());
        if (currentRow.some((cell) => cell !== '')) rows.push(currentRow);
        currentRow = [];
        currentField = '';
        i++;
      } else if (ch === '\n' || ch === '\r') {
        currentRow.push(currentField.trim());
        if (currentRow.some((cell) => cell !== '')) rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += ch;
      }
    }
  }

  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((cell) => cell !== '')) rows.push(currentRow);
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const records: Record<string, string>[] = [];

  for (let r = 1; r < rows.length; r++) {
    const values = rows[r];
    if (!values || values.every((v) => !v)) continue;
    const obj: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      const header = headers[c];
      if (header) {
        obj[header] = values[c] ?? '';
      }
    }
    records.push(obj);
  }

  return records;
}

function generateUuid(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // fallback
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function normalizeRawItem(raw: Record<string, any>): BulkImportRawRow {
  const titleObj = raw.title && typeof raw.title === 'object' ? raw.title : null;
  const title =
    (titleObj ? titleObj.en || titleObj.ar : raw.title) ||
    raw.title_en ||
    raw.name ||
    '';
  const titleAr =
    raw.title_ar ||
    (titleObj ? titleObj.ar : '') ||
    raw.arabic_title ||
    '';

  return {
    title: typeof title === 'string' ? title.trim() : String(title || '').trim(),
    title_ar: typeof titleAr === 'string' ? titleAr.trim() : String(titleAr || '').trim(),
    category: raw.category ?? raw.cat ?? '',
    tags: raw.tags ?? raw.keywords ?? '',
    preview_url: raw.preview_url ?? raw.preview ?? raw.thumbnail_url ?? raw.poster_url ?? '',
    full_url: raw.full_url ?? raw.full ?? raw.file_url ?? raw.video_url ?? raw.url ?? '',
    file_size: raw.file_size ?? raw.fileSize ?? raw.size ?? '',
    resolution: raw.resolution ?? '',
    is_live: raw.is_live ?? raw.isLive,
    device_format: raw.device_format ?? raw.deviceFormat ?? '',
  };
}

export function validateAndBuildBulkWallpapers(
  rawItems: Record<string, any>[],
  options?: { defaultCategory?: Category; defaultDeviceFormat?: 'desktop' | 'mobile'; defaultIsLive?: boolean }
): ParsedBulkImportResult {
  const validWallpapers: Wallpaper[] = [];
  const errors: BulkImportValidationError[] = [];

  rawItems.forEach((rawObj, idx) => {
    const rowNumber = idx + 1;
    const item = normalizeRawItem(rawObj);

    const titleEn = (item.title || item.title_ar || '').trim();
    const titleAr = (item.title_ar || item.title || '').trim();

    if (!titleEn && !titleAr) {
      errors.push({
        rowNumber,
        title: `Row #${rowNumber}`,
        reason: 'Missing title (provide title or title_ar).',
      });
      return;
    }

    const previewRaw = typeof item.preview_url === 'string' ? item.preview_url.trim() : '';
    const fullRaw = typeof item.full_url === 'string' ? item.full_url.trim() : '';

    if (!fullRaw && !previewRaw) {
      errors.push({
        rowNumber,
        title: titleEn,
        reason: 'Missing full_url (and preview_url). At least a valid http/https full_url is required.',
      });
      return;
    }

    if (fullRaw && !isValidHttpUrl(fullRaw)) {
      errors.push({
        rowNumber,
        title: titleEn,
        reason: `Invalid full_url "${fullRaw.slice(0, 60)}" (must be a valid http/https URL).`,
      });
      return;
    }

    if (previewRaw && !isValidHttpUrl(previewRaw)) {
      errors.push({
        rowNumber,
        title: titleEn,
        reason: `Invalid preview_url "${previewRaw.slice(0, 60)}" (must be a valid http/https URL or left empty).`,
      });
      return;
    }

    const resolvedFullUrl = fullRaw || previewRaw;
    const resolvedPreviewUrl = previewRaw || resolvedFullUrl;
    const category = item.category
      ? normalizeCategoryValue(item.category)
      : options?.defaultCategory || 'Space';
    const tags = parseTagsValue(item.tags, category);

    const isMobile = Boolean(
      item.device_format === 'mobile' ||
        category === 'Mobile' ||
        (options?.defaultDeviceFormat === 'mobile' && !item.device_format) ||
        tags.some((t) => {
          const l = t.toLowerCase();
          return l.includes('mobile') || l.includes('9:16') || l === 'vertical';
        })
    );

    const isVideoFull = isVideoUrl(resolvedFullUrl);
    const isVideoPreview = isVideoUrl(resolvedPreviewUrl);
    const explicitLive =
      typeof item.is_live === 'boolean'
        ? item.is_live
        : typeof item.is_live === 'string' && item.is_live.trim() !== ''
        ? ['true', '1', 'yes', 'live'].includes(item.is_live.trim().toLowerCase())
        : undefined;

    const isLive = Boolean(
      explicitLive ?? (isVideoFull || isVideoPreview || isMobile || options?.defaultIsLive)
    );

    const width = isMobile ? 2160 : 3840;
    const height = isMobile ? 3840 : 2160;
    const resolution = item.resolution?.trim() || `${width}×${height}`;
    const id = generateUuid();
    const baseSlug = slugify(titleEn) || id;

    const wp: Wallpaper = {
      id,
      slug: `${baseSlug}-${id.slice(0, 6)}`,
      title: {
        en: titleEn,
        ar: titleAr,
      },
      description: {
        en: isLive
          ? `${titleEn} — 60 FPS Live Motion ${resolution} wallpaper in ${category}. Free download on DeskSpace4K.`
          : `${titleEn} — ${resolution} Ultra HD wallpaper in ${category}. Free download on DeskSpace4K.`,
        ar: isLive
          ? `${titleAr} — خلفية متحركة حية بمعدل 60 إطاراً بدقة ${resolution} في قسم ${category}. تحميل مجاني على DeskSpace4K.`
          : `${titleAr} — خلفية فائقة الدقة ${resolution} في قسم ${category}. تحميل مجاني على DeskSpace4K.`,
      },
      category,
      resolution,
      width,
      height,
      url: resolvedFullUrl,
      previewUrl: resolvedPreviewUrl,
      fullUrl: resolvedFullUrl,
      videoUrl: isLive && isVideoFull ? resolvedFullUrl : isVideoPreview ? resolvedPreviewUrl : undefined,
      posterUrl: !isVideoPreview ? resolvedPreviewUrl : undefined,
      thumbnailUrl: resolvedPreviewUrl,
      aspectRatio: isMobile ? '9:16' : '16:9',
      downloads: 0,
      favorites: 0,
      fileSize: item.file_size?.trim() || (isLive ? '18.5 MB' : '12.0 MB'),
      tags,
      colorPalette: ['#0A0B10', '#00F0FF', '#A855F7', '#F8FAFC'],
      createdAt: new Date().toISOString(),
      isLive,
      fps: isLive ? 60 : undefined,
      formatType: isLive || isVideoFull ? 'video' : 'image',
      deviceFormat: isMobile ? 'mobile' : 'desktop',
      isMobile,
    };

    validWallpapers.push(wp);
  });

  return {
    validWallpapers,
    errors,
    totalRows: rawItems.length,
  };
}

export function parseBulkInputText(
  rawText: string,
  format: 'json' | 'csv',
  options?: { defaultCategory?: Category; defaultDeviceFormat?: 'desktop' | 'mobile'; defaultIsLive?: boolean }
): ParsedBulkImportResult & { parseError?: string } {
  const trimmed = rawText.replace(/^\uFEFF/, '').trim();
  if (!trimmed) {
    return {
      validWallpapers: [],
      errors: [],
      totalRows: 0,
      parseError: 'Input is empty. Paste a JSON array or upload a CSV file.',
    };
  }

  if (format === 'json') {
    try {
      const parsed = JSON.parse(trimmed);
      const list = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.wallpapers)
        ? parsed.wallpapers
        : Array.isArray(parsed?.items)
        ? parsed.items
        : null;

      if (!list) {
        return {
          validWallpapers: [],
          errors: [],
          totalRows: 0,
          parseError: 'JSON must be an array of wallpaper objects, e.g. [{ "title": "...", "full_url": "..." }].',
        };
      }

      return validateAndBuildBulkWallpapers(list, options);
    } catch (err: any) {
      return {
        validWallpapers: [],
        errors: [],
        totalRows: 0,
        parseError: `Invalid JSON syntax: ${err?.message || 'Unable to parse JSON'}`,
      };
    }
  }

  const csvRecords = parseCsvRows(trimmed);
  if (csvRecords.length === 0) {
    return {
      validWallpapers: [],
      errors: [],
      totalRows: 0,
      parseError: 'CSV requires a header row (title,title_ar,category,tags,preview_url,full_url) and at least one data row.',
    };
  }

  return validateAndBuildBulkWallpapers(csvRecords, options);
}
