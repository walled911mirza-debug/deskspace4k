import { Category, Wallpaper } from '../types';
import {
  supabase,
  isSupabaseConfigured,
  supabaseConfigError,
  WALLPAPERS_BUCKET,
  WALLPAPERS_TABLE,
} from './supabase';
import { slugify } from '../utils/storageManager';
import { isVideoUrl } from '../utils/mediaUtils';

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

export interface SupabaseWallpaperRow {
  id: string;
  slug?: string | null;
  title: { en?: string; ar?: string } | string | null;
  file_url?: string | null;
  url?: string | null;
  description?: { en?: string; ar?: string } | string | null;
  resolution?: string | null;
  width?: number | null;
  height?: number | null;
  category?: string | null;
  is_live?: boolean | null;
  video_url?: string | null;
  thumbnail_url?: string | null;
  poster_url?: string | null;
  aspect_ratio?: string | null;
  downloads?: number | null;
  favorites?: number | null;
  file_size?: string | null;
  tags?: string[] | string | null;
  color_palette?: string[] | string | null;
  device_format?: 'desktop' | 'mobile' | string | null;
  is_mobile?: boolean | null;
  format_type?: 'image' | 'video' | string | null;
  fps?: number | null;
  created_at?: string | null;
}

export function generateWallpaperId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // fallback below
  }
  // Standard UUID v4 fallback so it is compatible with both uuid and text Postgres columns
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function parseLocalizedText(
  raw: unknown,
  fallbackEn: string = '',
  fallbackAr?: string
): { en: string; ar: string } {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    const en = typeof obj.en === 'string' ? obj.en.trim() : '';
    const ar = typeof obj.ar === 'string' ? obj.ar.trim() : '';
    if (en || ar) {
      return {
        en: en || ar || fallbackEn,
        ar: ar || en || fallbackAr || fallbackEn,
      };
    }
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object') {
          return parseLocalizedText(parsed, fallbackEn, fallbackAr);
        }
      } catch {
        // treat as plain string
      }
    }
    if (trimmed) {
      return { en: trimmed, ar: trimmed };
    }
  }

  return {
    en: fallbackEn,
    ar: fallbackAr || fallbackEn,
  };
}

function parseStringArray(raw: unknown, fallback: string[] = []): string[] {
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item ?? '').trim()).filter(Boolean);
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return fallback;
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => String(item ?? '').trim()).filter(Boolean);
        }
      } catch {
        // fallback to comma split
      }
    }
    return trimmed
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return fallback;
}

function normalizeCategory(raw: unknown): Category {
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    const matched = VALID_CATEGORIES.find((c) => c.toLowerCase() === trimmed.toLowerCase());
    if (matched) return matched;
  }
  return 'Space';
}

function parseResolutionDimensions(resolutionStr: string): { width: number; height: number } | null {
  const match = resolutionStr.match(/(\d{3,5})\s*[xX×]\s*(\d{3,5})/);
  if (!match) return null;
  const w = Number(match[1]);
  const h = Number(match[2]);
  if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
    return { width: w, height: h };
  }
  return null;
}

/**
 * Safely maps any public.wallpapers row into a normalized Wallpaper object.
 * Guarantees arrays and nested title objects are always valid so UI never crashes.
 */
export function mapRowToWallpaper(row: Record<string, any> | null | undefined): Wallpaper | null {
  if (!row || typeof row !== 'object' || !row.id) {
    return null;
  }

  const id = String(row.id).trim();
  if (!id) return null;

  const title = parseLocalizedText(row.title, 'Untitled 4K Wallpaper');
  const rawDescription = row.description !== undefined && row.description !== null
    ? parseLocalizedText(row.description, title.en, title.ar)
    : undefined;

  const category = normalizeCategory(row.category);
  const rawFileUrl = typeof row.file_url === 'string' && row.file_url.trim()
    ? row.file_url.trim()
    : typeof row.url === 'string' && row.url.trim()
    ? row.url.trim()
    : '';
  const rawVideoUrl = typeof row.video_url === 'string' && row.video_url.trim()
    ? row.video_url.trim()
    : undefined;
  const rawPosterUrl = typeof row.poster_url === 'string' && row.poster_url.trim()
    ? row.poster_url.trim()
    : undefined;
  const rawThumbUrl = typeof row.thumbnail_url === 'string' && row.thumbnail_url.trim()
    ? row.thumbnail_url.trim()
    : undefined;

  const tags = parseStringArray(row.tags, [category, '4K Ultra HD']);
  const colorPalette = parseStringArray(row.color_palette, [
    '#0A0B10',
    '#00F0FF',
    '#A855F7',
    '#F8FAFC',
  ]);

  const rawResolution = typeof row.resolution === 'string' && row.resolution.trim()
    ? row.resolution.trim()
    : '';
  const parsedDims = rawResolution ? parseResolutionDimensions(rawResolution) : null;

  const isMobileFromFields = Boolean(
    row.is_mobile === true ||
      row.device_format === 'mobile' ||
      row.aspect_ratio === '9:16' ||
      category === 'Mobile' ||
      (Number(row.height) > Number(row.width) && Number(row.width) > 0) ||
      (parsedDims && parsedDims.height > parsedDims.width) ||
      tags.some((t) => {
        const l = t.toLowerCase();
        return l.includes('mobile') || l.includes('9:16') || l === 'vertical';
      })
  );

  const width = Number(row.width) || parsedDims?.width || (isMobileFromFields ? 2160 : 3840);
  const height = Number(row.height) || parsedDims?.height || (isMobileFromFields ? 3840 : 2160);
  const resolution = rawResolution || `${width}×${height}`;
  const aspectRatio =
    typeof row.aspect_ratio === 'string' && row.aspect_ratio.trim()
      ? row.aspect_ratio.trim()
      : isMobileFromFields
      ? '9:16'
      : '16:9';

  const inferredVideo = Boolean(
    row.is_live ||
      rawVideoUrl ||
      row.format_type === 'video' ||
      isVideoUrl(rawFileUrl)
  );

  const videoUrl = rawVideoUrl || (inferredVideo && isVideoUrl(rawFileUrl) ? rawFileUrl : undefined);
  const url = rawFileUrl || rawPosterUrl || rawThumbUrl || videoUrl || '';
  const posterUrl = rawPosterUrl || (!isVideoUrl(url) && url ? url : undefined);
  const thumbnailUrl = rawThumbUrl || posterUrl || (!isVideoUrl(url) && url ? url : undefined);

  const createdAtRaw = typeof row.created_at === 'string' ? row.created_at : '';
  const createdAt =
    createdAtRaw && !Number.isNaN(Date.parse(createdAtRaw))
      ? createdAtRaw
      : new Date().toISOString();

  return {
    id,
    slug: typeof row.slug === 'string' && row.slug.trim() ? row.slug.trim() : slugify(title.en) || id,
    title,
    description: rawDescription,
    category,
    resolution,
    width,
    height,
    url,
    aspectRatio,
    downloads: Number(row.downloads) || 0,
    favorites: Number(row.favorites) || 0,
    fileSize: typeof row.file_size === 'string' && row.file_size.trim() ? row.file_size.trim() : '4K UHD',
    tags,
    colorPalette,
    createdAt,
    isLive: inferredVideo,
    videoUrl,
    thumbnailUrl,
    posterUrl,
    fps: Number(row.fps) || (inferredVideo ? 60 : undefined),
    formatType: inferredVideo ? 'video' : 'image',
    deviceFormat: isMobileFromFields ? 'mobile' : 'desktop',
    isMobile: isMobileFromFields,
  };
}

export function mapWallpaperToRow(wp: Wallpaper): SupabaseWallpaperRow {
  const safeSlug = wp.slug?.trim() || slugify(wp.title?.en || '') || wp.id;
  const safeDesc =
    typeof wp.description === 'string'
      ? { en: wp.description, ar: wp.description }
      : wp.description || { en: wp.title?.en || '', ar: wp.title?.ar || wp.title?.en || '' };

  return {
    id: wp.id,
    slug: safeSlug,
    title: {
      en: wp.title?.en || 'Untitled Wallpaper',
      ar: wp.title?.ar || wp.title?.en || 'خلفية 4K',
    },
    file_url: wp.url || '',
    description: safeDesc,
    resolution: wp.resolution || `${wp.width || 3840}×${wp.height || 2160}`,
    width: wp.width || 3840,
    height: wp.height || 2160,
    category: wp.category || 'Space',
    is_live: Boolean(wp.isLive),
    video_url: wp.videoUrl || null,
    thumbnail_url: wp.thumbnailUrl || null,
    poster_url: wp.posterUrl || null,
    aspect_ratio: wp.aspectRatio || (wp.deviceFormat === 'mobile' ? '9:16' : '16:9'),
    downloads: Number(wp.downloads) || 0,
    favorites: Number(wp.favorites) || 0,
    file_size: wp.fileSize || '4K UHD',
    tags: Array.isArray(wp.tags) ? wp.tags : [],
    color_palette: Array.isArray(wp.colorPalette) ? wp.colorPalette : [],
    device_format: wp.deviceFormat || (wp.isMobile ? 'mobile' : 'desktop'),
    is_mobile: Boolean(wp.isMobile || wp.deviceFormat === 'mobile' || wp.aspectRatio === '9:16'),
    format_type: wp.formatType || (wp.isLive ? 'video' : 'image'),
    fps: wp.fps || (wp.isLive ? 60 : null),
    created_at: wp.createdAt || new Date().toISOString(),
  };
}

function buildCoreRowFallback(row: SupabaseWallpaperRow): Record<string, any> {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    file_url: row.file_url,
    description: row.description,
    resolution: row.resolution,
    category: row.category,
    is_live: row.is_live,
    video_url: row.video_url,
    created_at: row.created_at,
  };
}

function extractMissingColumnName(errorMessage: string): string | null {
  const pgrstMatch = errorMessage.match(/Could not find the '([^']+)' column/i);
  if (pgrstMatch?.[1]) return pgrstMatch[1];
  const pgMatch = errorMessage.match(/column "([^"]+)" of relation/i);
  if (pgMatch?.[1]) return pgMatch[1];
  return null;
}

async function upsertRowResilient(row: SupabaseWallpaperRow): Promise<{ data: any; error: string | null }> {
  if (!supabase) {
    return { data: null, error: supabaseConfigError || 'Supabase not configured' };
  }

  let payload: Record<string, any> = { ...row };
  const maxRetries = 6;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const { data, error } = await supabase
      .from(WALLPAPERS_TABLE)
      .upsert(payload, { onConflict: 'id' })
      .select()
      .maybeSingle();

    if (!error) {
      return { data, error: null };
    }

    const msg = error.message || '';
    const missingCol = extractMissingColumnName(msg);
    if (missingCol && missingCol in payload) {
      delete payload[missingCol];
      continue;
    }

    // If schema has only core columns or rejects extra fields, try core payload once
    if (attempt === 0 && Object.keys(payload).length > 10) {
      payload = buildCoreRowFallback(row);
      continue;
    }

    // If title/description column is TEXT instead of JSONB
    if (/invalid input syntax|cannot cast|malformed/i.test(msg) && typeof payload.title === 'object') {
      payload = {
        ...payload,
        title: (row.title as any)?.en || String(row.title || ''),
        description:
          typeof row.description === 'object' && row.description
            ? (row.description as any).en || ''
            : row.description,
      };
      continue;
    }

    return { data: null, error: msg || 'Failed to save wallpaper to Supabase' };
  }

  return { data: null, error: 'Unable to match public.wallpapers schema columns' };
}

function sanitizeStorageFileName(name: string, fallbackExt: string): string {
  const cleaned = (name || `asset.${fallbackExt}`)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!cleaned) return `asset_${Date.now()}.${fallbackExt}`;
  return cleaned;
}

function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const [header, base64Data] = dataUrl.split(',');
    if (!header || !base64Data) return null;
    const mimeMatch = header.match(/data:([^;]+);base64/i);
    const mime = mimeMatch?.[1] || 'image/jpeg';
    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
}

export async function uploadFileToWallpapersBucket(
  file: File | Blob,
  folder: 'images' | 'videos' | 'posters' | 'thumbnails',
  fileName?: string
): Promise<{ publicUrl: string | null; storagePath: string | null; error: string | null }> {
  if (!supabase || !isSupabaseConfigured) {
    return {
      publicUrl: null,
      storagePath: null,
      error: supabaseConfigError || 'Supabase storage is not configured.',
    };
  }

  try {
    const fallbackExt = folder === 'videos' ? 'mp4' : 'jpg';
    const rawName = fileName || (file instanceof File ? file.name : `media.${fallbackExt}`);
    const safeName = sanitizeStorageFileName(rawName, fallbackExt);
    const uniquePath = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(WALLPAPERS_BUCKET)
      .upload(uniquePath, file, {
        cacheControl: '31536000',
        upsert: true,
        contentType: file.type || (folder === 'videos' ? 'video/mp4' : 'image/jpeg'),
      });

    if (uploadError) {
      return {
        publicUrl: null,
        storagePath: null,
        error: uploadError.message || 'Storage upload failed.',
      };
    }

    const { data: urlData } = supabase.storage.from(WALLPAPERS_BUCKET).getPublicUrl(uniquePath);
    const publicUrl = urlData?.publicUrl || null;

    if (!publicUrl) {
      return {
        publicUrl: null,
        storagePath: uniquePath,
        error: 'Uploaded to bucket but could not resolve public URL.',
      };
    }

    return { publicUrl, storagePath: uniquePath, error: null };
  } catch (err: any) {
    return {
      publicUrl: null,
      storagePath: null,
      error: err?.message || 'Unexpected storage upload error.',
    };
  }
}

export function extractBucketObjectPath(urlOrPath: string | undefined): string | null {
  if (!urlOrPath || typeof urlOrPath !== 'string') return null;
  const trimmed = urlOrPath.trim();
  if (!trimmed || trimmed.startsWith('idb://') || trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
    return null;
  }

  // Matches /storage/v1/object/public/wallpapers/<path> or /storage/v1/object/sign/wallpapers/<path>
  const bucketMarker = `/${WALLPAPERS_BUCKET}/`;
  const idx = trimmed.indexOf(`/object/public${bucketMarker}`);
  if (idx !== -1) {
    const pathPart = trimmed.slice(idx + `/object/public${bucketMarker}`.length).split('?')[0];
    return decodeURIComponent(pathPart);
  }
  const signIdx = trimmed.indexOf(`/object/sign${bucketMarker}`);
  if (signIdx !== -1) {
    const pathPart = trimmed.slice(signIdx + `/object/sign${bucketMarker}`.length).split('?')[0];
    return decodeURIComponent(pathPart);
  }

  // If caller passed a relative bucket path like images/foo.jpg
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('/')) {
    return trimmed;
  }

  return null;
}

export async function deleteFilesFromWallpapersBucket(
  urlsOrPaths: Array<string | undefined | null>
): Promise<{ success: boolean; error: string | null }> {
  if (!supabase || !isSupabaseConfigured) {
    return { success: false, error: null };
  }

  const paths = Array.from(
    new Set(
      urlsOrPaths
        .map((u) => (typeof u === 'string' ? extractBucketObjectPath(u) : null))
        .filter((p): p is string => Boolean(p))
    )
  );

  if (paths.length === 0) {
    return { success: true, error: null };
  }

  try {
    const { error } = await supabase.storage.from(WALLPAPERS_BUCKET).remove(paths);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Storage deletion error' };
  }
}

export interface FetchWallpapersResult {
  wallpapers: Wallpaper[];
  error: string | null;
  configured: boolean;
}

/**
 * Fetches all wallpapers from public.wallpapers safely.
 * Never throws; returns structured result even when Supabase is unconfigured or offline.
 */
export async function fetchWallpapersFromSupabase(): Promise<FetchWallpapersResult> {
  if (!supabase || !isSupabaseConfigured) {
    return {
      wallpapers: [],
      error: supabaseConfigError || 'Supabase environment variables (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) are missing or invalid.',
      configured: false,
    };
  }

  try {
    const { data, error } = await supabase
      .from(WALLPAPERS_TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return {
        wallpapers: [],
        error: error.message || 'Failed to load wallpapers from Supabase.',
        configured: true,
      };
    }

    const mapped = (Array.isArray(data) ? data : [])
      .map((row) => mapRowToWallpaper(row))
      .filter((item): item is Wallpaper => Boolean(item));

    return {
      wallpapers: mapped,
      error: null,
      configured: true,
    };
  } catch (err: any) {
    return {
      wallpapers: [],
      error: err?.message || 'Network error while fetching wallpapers from Supabase.',
      configured: true,
    };
  }
}

/**
 * Fetches a single wallpaper by id or slug from loaded in-memory candidates or Supabase public.wallpapers.
 */
export async function fetchWallpaperByIdOrSlug(
  idOrSlug: string,
  localCandidates?: Wallpaper[]
): Promise<{ wallpaper: Wallpaper | null; error: string | null }> {
  if (!idOrSlug || !idOrSlug.trim()) {
    return { wallpaper: null, error: null };
  }

  const decoded = decodeURIComponent(idOrSlug).trim();
  const normalizedSlug = slugify(decoded);

  // 1. Check already-loaded in-memory wallpapers first for instant rendering
  if (Array.isArray(localCandidates) && localCandidates.length > 0) {
    const inMemoryMatch = localCandidates.find(
      (w) =>
        w.id === decoded ||
        w.slug === decoded ||
        (normalizedSlug && (w.slug === normalizedSlug || slugify(w.title?.en || '') === normalizedSlug))
    );
    if (inMemoryMatch) {
      return { wallpaper: inMemoryMatch, error: null };
    }
  }

  // 2. Query Supabase public.wallpapers by exact id, then by exact slug
  if (!supabase || !isSupabaseConfigured) {
    return { wallpaper: null, error: null };
  }

  try {
    const byId = await supabase
      .from(WALLPAPERS_TABLE)
      .select('*')
      .eq('id', decoded)
      .maybeSingle();

    if (!byId.error && byId.data) {
      const mapped = mapRowToWallpaper(byId.data);
      if (mapped) return { wallpaper: mapped, error: null };
    }

    const bySlug = await supabase
      .from(WALLPAPERS_TABLE)
      .select('*')
      .eq('slug', decoded)
      .maybeSingle();

    if (!bySlug.error && bySlug.data) {
      const mapped = mapRowToWallpaper(bySlug.data);
      if (mapped) return { wallpaper: mapped, error: null };
    }

    const firstError = byId.error?.message || bySlug.error?.message || null;
    return { wallpaper: null, error: firstError };
  } catch (err: any) {
    return {
      wallpaper: null,
      error: err?.message || 'Failed to query wallpaper details from Supabase.',
    };
  }
}

export interface CreateWallpaperMediaInput {
  imageFile?: File | null;
  videoFile?: File | null;
  posterDataUrl?: string | null;
  thumbnailDataUrl?: string | null;
}

export interface SaveWallpaperSyncResult {
  wallpaper: Wallpaper;
  syncedToSupabase: boolean;
  storageSynced: boolean;
  error: string | null;
}

/**
 * Strictly uploads attached media to the public "wallpapers" Supabase Storage bucket
 * and inserts/upserts the record into public.wallpapers.
 * Fails explicitly if Supabase is unconfigured or if any Storage/DB operation fails.
 */
export async function createWallpaperWithSync(
  baseWallpaper: Wallpaper,
  media?: CreateWallpaperMediaInput
): Promise<SaveWallpaperSyncResult> {
  let finalWp: Wallpaper = {
    ...baseWallpaper,
    slug: baseWallpaper.slug || slugify(baseWallpaper.title?.en || '') || baseWallpaper.id,
  };

  if (!supabase || !isSupabaseConfigured) {
    return {
      wallpaper: finalWp,
      syncedToSupabase: false,
      storageSynced: false,
      error:
        supabaseConfigError ||
        'Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    };
  }

  let storageSynced = false;
  let uploadedImageUrl: string | null = null;
  let uploadedVideoUrl: string | null = null;
  let uploadedPosterUrl: string | null = null;
  let uploadedThumbUrl: string | null = null;

  // 1. Upload media files to Supabase Storage bucket "wallpapers"
  if (media?.imageFile) {
    const imgRes = await uploadFileToWallpapersBucket(media.imageFile, 'images', media.imageFile.name);
    if (!imgRes.publicUrl || imgRes.error) {
      return {
        wallpaper: finalWp,
        syncedToSupabase: false,
        storageSynced: false,
        error: `Supabase Storage image upload failed: ${imgRes.error || 'No public URL returned.'}`,
      };
    }
    uploadedImageUrl = imgRes.publicUrl;
    storageSynced = true;
  }

  if (media?.videoFile) {
    const vidRes = await uploadFileToWallpapersBucket(media.videoFile, 'videos', media.videoFile.name);
    if (!vidRes.publicUrl || vidRes.error) {
      if (uploadedImageUrl) {
        await deleteFilesFromWallpapersBucket([uploadedImageUrl]).catch(() => {});
      }
      return {
        wallpaper: finalWp,
        syncedToSupabase: false,
        storageSynced: false,
        error: `Supabase Storage video upload failed: ${vidRes.error || 'No public URL returned.'}`,
      };
    }
    uploadedVideoUrl = vidRes.publicUrl;
    storageSynced = true;
  }

  if (!uploadedImageUrl && media?.posterDataUrl) {
    const posterBlob = dataUrlToBlob(media.posterDataUrl);
    if (posterBlob) {
      const posterRes = await uploadFileToWallpapersBucket(
        posterBlob,
        'posters',
        `${finalWp.slug || finalWp.id}_poster.jpg`
      );
      if (posterRes.publicUrl) {
        uploadedPosterUrl = posterRes.publicUrl;
        storageSynced = true;
      }
    }
  }

  if (media?.thumbnailDataUrl && media.thumbnailDataUrl !== media.posterDataUrl) {
    const thumbBlob = dataUrlToBlob(media.thumbnailDataUrl);
    if (thumbBlob) {
      const thumbRes = await uploadFileToWallpapersBucket(
        thumbBlob,
        'thumbnails',
        `${finalWp.slug || finalWp.id}_thumb.jpg`
      );
      if (thumbRes.publicUrl) {
        uploadedThumbUrl = thumbRes.publicUrl;
        storageSynced = true;
      }
    }
  }

  const safeExistingUrl = finalWp.url && !finalWp.url.startsWith('idb://') ? finalWp.url : '';
  const safeExistingVideoUrl =
    finalWp.videoUrl && !finalWp.videoUrl.startsWith('idb://') ? finalWp.videoUrl : undefined;
  const safeExistingPosterUrl =
    finalWp.posterUrl && !finalWp.posterUrl.startsWith('idb://') ? finalWp.posterUrl : undefined;
  const safeExistingThumbUrl =
    finalWp.thumbnailUrl && !finalWp.thumbnailUrl.startsWith('idb://') ? finalWp.thumbnailUrl : undefined;

  finalWp = {
    ...finalWp,
    url: uploadedImageUrl || uploadedPosterUrl || uploadedVideoUrl || safeExistingUrl,
    videoUrl: uploadedVideoUrl || safeExistingVideoUrl,
    posterUrl: uploadedImageUrl || uploadedPosterUrl || safeExistingPosterUrl,
    thumbnailUrl: uploadedThumbUrl || uploadedImageUrl || uploadedPosterUrl || safeExistingThumbUrl,
  };

  if (!finalWp.url) {
    return {
      wallpaper: finalWp,
      syncedToSupabase: false,
      storageSynced,
      error: 'No valid media URL was produced after uploading to Supabase Storage.',
    };
  }

  // 2. Insert / upsert metadata row into public.wallpapers
  const row = mapWallpaperToRow(finalWp);
  const dbRes = await upsertRowResilient(row);
  if (dbRes.error) {
    return {
      wallpaper: finalWp,
      syncedToSupabase: false,
      storageSynced,
      error: `Supabase database insert failed: ${dbRes.error}`,
    };
  }

  if (dbRes.data) {
    const mappedBack = mapRowToWallpaper(dbRes.data);
    if (mappedBack) {
      finalWp = {
        ...finalWp,
        ...mappedBack,
        thumbnailUrl: mappedBack.thumbnailUrl || finalWp.thumbnailUrl,
        posterUrl: mappedBack.posterUrl || finalWp.posterUrl,
      };
    }
  }

  return {
    wallpaper: finalWp,
    syncedToSupabase: true,
    storageSynced,
    error: null,
  };
}

/**
 * Strictly updates wallpaper metadata in Supabase public.wallpapers.
 */
export async function updateWallpaperWithSync(
  wallpaper: Wallpaper
): Promise<{ wallpaper: Wallpaper; syncedToSupabase: boolean; error: string | null }> {
  const normalized: Wallpaper = {
    ...wallpaper,
    slug: wallpaper.slug || slugify(wallpaper.title?.en || '') || wallpaper.id,
  };

  if (!supabase || !isSupabaseConfigured) {
    return {
      wallpaper: normalized,
      syncedToSupabase: false,
      error:
        supabaseConfigError ||
        'Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    };
  }

  try {
    const row = mapWallpaperToRow(normalized);
    const res = await upsertRowResilient(row);
    if (res.error) {
      return {
        wallpaper: normalized,
        syncedToSupabase: false,
        error: res.error,
      };
    }

    const mapped = res.data ? mapRowToWallpaper(res.data) : null;
    return {
      wallpaper: mapped ? { ...normalized, ...mapped } : normalized,
      syncedToSupabase: true,
      error: null,
    };
  } catch (err: any) {
    return {
      wallpaper: normalized,
      syncedToSupabase: false,
      error: err?.message || 'Failed to update wallpaper in Supabase.',
    };
  }
}

/**
 * Strictly deletes wallpaper from Supabase Storage bucket "wallpapers" and public.wallpapers table.
 */
export async function deleteWallpaperWithSync(
  wallpaperOrId: Wallpaper | string
): Promise<{ success: boolean; syncedToSupabase: boolean; error: string | null }> {
  const id = typeof wallpaperOrId === 'string' ? wallpaperOrId : wallpaperOrId?.id;
  if (!id) {
    return { success: false, syncedToSupabase: false, error: 'Invalid wallpaper ID' };
  }

  if (!supabase || !isSupabaseConfigured) {
    return {
      success: false,
      syncedToSupabase: false,
      error:
        supabaseConfigError ||
        'Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    };
  }

  const errors: string[] = [];
  let dbDeleted = false;

  try {
    const candidateUrls: Array<string | undefined | null> = [];
    if (typeof wallpaperOrId !== 'string') {
      candidateUrls.push(
        wallpaperOrId.url,
        wallpaperOrId.videoUrl,
        wallpaperOrId.posterUrl,
        wallpaperOrId.thumbnailUrl
      );
    } else {
      const { data: existingRow } = await supabase
        .from(WALLPAPERS_TABLE)
        .select('file_url, video_url, poster_url, thumbnail_url')
        .eq('id', id)
        .maybeSingle();
      if (existingRow) {
        candidateUrls.push(
          existingRow.file_url,
          existingRow.video_url,
          existingRow.poster_url,
          existingRow.thumbnail_url
        );
      }
    }

    const storageDel = await deleteFilesFromWallpapersBucket(candidateUrls);
    if (storageDel.error) {
      errors.push(`Storage delete failed: ${storageDel.error}`);
    }

    const { error: dbError } = await supabase
      .from(WALLPAPERS_TABLE)
      .delete()
      .eq('id', id);

    if (dbError) {
      errors.push(`Database delete failed: ${dbError.message}`);
    } else {
      dbDeleted = true;
    }
  } catch (err: any) {
    errors.push(err?.message || 'Unexpected Supabase delete error');
  }

  return {
    success: dbDeleted && errors.length === 0,
    syncedToSupabase: dbDeleted && errors.length === 0,
    error: errors.length > 0 ? errors.join(' | ') : null,
  };
}

/**
 * Best-effort non-blocking stat sync (downloads / favorites) to public.wallpapers.
 */
export async function syncWallpaperStats(
  id: string,
  patch: { downloads?: number; favorites?: number }
): Promise<void> {
  if (!supabase || !isSupabaseConfigured || !id) return;
  try {
    const updatePayload: Record<string, number> = {};
    if (typeof patch.downloads === 'number') updatePayload.downloads = patch.downloads;
    if (typeof patch.favorites === 'number') updatePayload.favorites = Math.max(0, patch.favorites);
    if (Object.keys(updatePayload).length === 0) return;

    await supabase.from(WALLPAPERS_TABLE).update(updatePayload).eq('id', id);
  } catch {
    // Non-critical stat sync should never surface uncaught errors
  }
}
