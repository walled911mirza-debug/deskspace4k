import { Wallpaper, Category } from '../types';
import { supabase, WALLPAPERS_BUCKET, isSupabaseConfigured } from './supabase';
import { slugify, matchesIdOrSlug } from '../utils/storageManager';

export interface SupabaseWallpaperRow {
  id: string;
  slug?: string | null;
  title: string;
  title_ar?: string | null;
  description?: string | null;
  description_ar?: string | null;
  category: string;
  image_url: string;
  video_url?: string | null;
  thumbnail_url?: string | null;
  poster_url?: string | null;
  storage_path?: string | null;
  video_storage_path?: string | null;
  poster_storage_path?: string | null;
  resolution?: string | null;
  width?: number | null;
  height?: number | null;
  aspect_ratio?: string | null;
  file_size?: string | null;
  tags?: string[] | string | null;
  color_palette?: string[] | null;
  is_live?: boolean | null;
  is_mobile?: boolean | null;
  device_format?: string | null;
  format_type?: string | null;
  downloads?: number | null;
  favorites?: number | null;
  created_at?: string | null;
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

function normalizeCategory(cat?: string | null): Category {
  if (!cat) return 'Gaming';
  const match = VALID_CATEGORIES.find((c) => c.toLowerCase() === cat.trim().toLowerCase());
  return match || 'Gaming';
}

function normalizeTags(tags: string[] | string | null | undefined): string[] {
  if (Array.isArray(tags)) {
    return tags.map((t) => String(t).trim()).filter(Boolean);
  }
  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
}

export function mapRowToWallpaper(row: SupabaseWallpaperRow): Wallpaper {
  const isMobile = Boolean(
    row.is_mobile ||
      row.device_format === 'mobile' ||
      row.aspect_ratio === '9:16' ||
      row.category === 'Mobile' ||
      (row.width && row.height && row.height > row.width)
  );
  const defaultWidth = isMobile ? 2160 : 3840;
  const defaultHeight = isMobile ? 3840 : 2160;
  const width = typeof row.width === 'number' && row.width > 0 ? row.width : defaultWidth;
  const height = typeof row.height === 'number' && row.height > 0 ? row.height : defaultHeight;

  const isLive = Boolean(row.is_live || row.video_url || row.format_type === 'video');
  const titleEn = (row.title || 'Untitled 4K Wallpaper').trim();
  const titleAr = (row.title_ar || row.title || titleEn).trim();

  return {
    id: String(row.id),
    slug: row.slug || slugify(titleEn),
    title: {
      en: titleEn,
      ar: titleAr,
    },
    description:
      row.description || row.description_ar
        ? {
            en: row.description || row.description_ar || '',
            ar: row.description_ar || row.description || '',
          }
        : undefined,
    category: normalizeCategory(row.category),
    resolution: row.resolution || `${width}×${height}`,
    width,
    height,
    url: row.image_url,
    videoUrl: row.video_url || undefined,
    thumbnailUrl: row.thumbnail_url || row.poster_url || row.image_url,
    posterUrl: row.poster_url || row.thumbnail_url || row.image_url,
    storagePath: row.storage_path || undefined,
    videoStoragePath: row.video_storage_path || undefined,
    posterStoragePath: row.poster_storage_path || undefined,
    aspectRatio: row.aspect_ratio || (isMobile ? '9:16' : '16:9'),
    downloads: typeof row.downloads === 'number' ? row.downloads : 0,
    favorites: typeof row.favorites === 'number' ? row.favorites : 0,
    fileSize: row.file_size || '4.0 MB',
    tags: normalizeTags(row.tags),
    colorPalette:
      Array.isArray(row.color_palette) && row.color_palette.length > 0
        ? row.color_palette
        : ['#0A0B10', '#00F0FF', '#A855F7', '#F8FAFC'],
    createdAt: row.created_at || new Date().toISOString(),
    isLive,
    formatType: (row.format_type as 'image' | 'video') || (isLive ? 'video' : 'image'),
    deviceFormat: (row.device_format as 'desktop' | 'mobile') || (isMobile ? 'mobile' : 'desktop'),
    isMobile,
  };
}

export function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    if (!dataUrl || !dataUrl.startsWith('data:')) return null;
    const parts = dataUrl.split(',');
    if (parts.length < 2) return null;
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch {
    return null;
  }
}

export async function uploadFileToSupabaseStorage(
  fileOrBlob: File | Blob,
  folder: string,
  filename: string
): Promise<{ publicUrl: string; storagePath: string }> {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.'
    );
  }

  const sanitizedName = filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_');
  const storagePath = `${folder}/${sanitizedName}`;
  const contentType =
    (fileOrBlob instanceof File ? fileOrBlob.type : fileOrBlob.type) || undefined;

  const { error: uploadError } = await supabase.storage
    .from(WALLPAPERS_BUCKET)
    .upload(storagePath, fileOrBlob, {
      upsert: true,
      cacheControl: '31536000',
      contentType,
    });

  if (uploadError) {
    throw new Error(`Storage upload failed (${storagePath}): ${uploadError.message}`);
  }

  const { data: publicData } = supabase.storage
    .from(WALLPAPERS_BUCKET)
    .getPublicUrl(storagePath);

  if (!publicData?.publicUrl) {
    throw new Error(`Failed to resolve public URL for ${storagePath}`);
  }

  return {
    publicUrl: publicData.publicUrl,
    storagePath,
  };
}

export function extractStoragePathFromPublicUrl(url?: string | null): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${WALLPAPERS_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  const raw = url.slice(idx + marker.length).split('?')[0];
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export async function fetchWallpapersFromSupabase(): Promise<Wallpaper[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  const { data, error } = await supabase
    .from('wallpapers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Failed to fetch wallpapers from Supabase');
  }

  if (!Array.isArray(data)) return [];
  return data.map((row) => mapRowToWallpaper(row as SupabaseWallpaperRow));
}

export async function fetchWallpaperByIdOrSlugFromSupabase(
  idOrSlug: string,
  existingWallpapers?: Wallpaper[]
): Promise<Wallpaper | null> {
  if (!idOrSlug) return null;

  if (existingWallpapers && existingWallpapers.length > 0) {
    const localHit = existingWallpapers.find((w) => matchesIdOrSlug(w, idOrSlug));
    if (localHit) return localHit;
  }

  if (!isSupabaseConfigured) {
    return null;
  }

  // Try exact match by id first
  const { data: byId, error: idErr } = await supabase
    .from('wallpapers')
    .select('*')
    .eq('id', idOrSlug)
    .maybeSingle();

  if (!idErr && byId) {
    return mapRowToWallpaper(byId as SupabaseWallpaperRow);
  }

  // Fallback: match by slug column
  const { data: bySlug, error: slugErr } = await supabase
    .from('wallpapers')
    .select('*')
    .eq('slug', idOrSlug)
    .maybeSingle();

  if (!slugErr && bySlug) {
    return mapRowToWallpaper(bySlug as SupabaseWallpaperRow);
  }

  return null;
}

export interface CreateWallpaperInput {
  id?: string;
  slug?: string;
  titleEn: string;
  titleAr?: string;
  descriptionEn?: string;
  descriptionAr?: string;
  category: Category;
  imageUrl: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  posterUrl?: string;
  storagePath?: string;
  videoStoragePath?: string;
  posterStoragePath?: string;
  resolution: string;
  width: number;
  height: number;
  aspectRatio: string;
  fileSize?: string;
  tags: string[];
  colorPalette?: string[];
  isLive: boolean;
  isMobile: boolean;
  deviceFormat: 'desktop' | 'mobile';
  formatType: 'image' | 'video';
}

export async function createWallpaperInSupabase(
  input: CreateWallpaperInput
): Promise<Wallpaper> {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
    );
  }

  const rowId = input.id || `wp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const rowSlug = input.slug || slugify(input.titleEn || rowId);

  const payload = {
    id: rowId,
    slug: rowSlug,
    title: input.titleEn.trim(),
    title_ar: (input.titleAr || input.titleEn).trim(),
    description: input.descriptionEn?.trim() || null,
    description_ar: input.descriptionAr?.trim() || null,
    category: input.category,
    image_url: input.imageUrl,
    video_url: input.videoUrl || null,
    thumbnail_url: input.thumbnailUrl || input.posterUrl || input.imageUrl,
    poster_url: input.posterUrl || input.thumbnailUrl || input.imageUrl,
    storage_path: input.storagePath || null,
    video_storage_path: input.videoStoragePath || null,
    poster_storage_path: input.posterStoragePath || null,
    resolution: input.resolution,
    width: input.width,
    height: input.height,
    aspect_ratio: input.aspectRatio,
    file_size: input.fileSize || '4.0 MB',
    tags: input.tags,
    color_palette: input.colorPalette || ['#0A0B10', '#00F0FF', '#A855F7', '#F8FAFC'],
    is_live: input.isLive,
    is_mobile: input.isMobile,
    device_format: input.deviceFormat,
    format_type: input.formatType,
    downloads: 0,
    favorites: 0,
  };

  const { data, error } = await supabase
    .from('wallpapers')
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(`Database insert failed: ${error.message}`);
  }

  return mapRowToWallpaper(data as SupabaseWallpaperRow);
}

export async function updateWallpaperInSupabase(
  id: string,
  updates: Partial<Wallpaper>
): Promise<Wallpaper> {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
    );
  }

  const patch: Record<string, unknown> = {};

  if (updates.title) {
    if (typeof updates.title === 'object') {
      if (updates.title.en !== undefined) patch.title = updates.title.en;
      if (updates.title.ar !== undefined) patch.title_ar = updates.title.ar;
    } else {
      patch.title = String(updates.title);
    }
  }

  if (updates.description !== undefined) {
    if (typeof updates.description === 'string') {
      patch.description = updates.description;
    } else if (updates.description && typeof updates.description === 'object') {
      patch.description = updates.description.en;
      patch.description_ar = updates.description.ar;
    }
  }

  if (updates.category !== undefined) patch.category = updates.category;
  if (updates.resolution !== undefined) patch.resolution = updates.resolution;
  if (updates.width !== undefined) patch.width = updates.width;
  if (updates.height !== undefined) patch.height = updates.height;
  if (updates.aspectRatio !== undefined) patch.aspect_ratio = updates.aspectRatio;
  if (updates.tags !== undefined) patch.tags = updates.tags;
  if (updates.isLive !== undefined) patch.is_live = updates.isLive;
  if (updates.isMobile !== undefined) patch.is_mobile = updates.isMobile;
  if (updates.deviceFormat !== undefined) patch.device_format = updates.deviceFormat;
  if (updates.formatType !== undefined) patch.format_type = updates.formatType;
  if (updates.url !== undefined) patch.image_url = updates.url;
  if (updates.videoUrl !== undefined) patch.video_url = updates.videoUrl;
  if (updates.posterUrl !== undefined) patch.poster_url = updates.posterUrl;
  if (updates.thumbnailUrl !== undefined) patch.thumbnail_url = updates.thumbnailUrl;

  const { data, error } = await supabase
    .from('wallpapers')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Database update failed: ${error.message}`);
  }

  return mapRowToWallpaper(data as SupabaseWallpaperRow);
}

export async function deleteWallpaperFromSupabase(
  wallpaper: Partial<Wallpaper> & { id: string }
): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
    );
  }

  // 1. Collect all storage object paths associated with this wallpaper
  const candidatePaths = new Set<string>();

  if (wallpaper.storagePath) candidatePaths.add(wallpaper.storagePath);
  if (wallpaper.videoStoragePath) candidatePaths.add(wallpaper.videoStoragePath);
  if (wallpaper.posterStoragePath) candidatePaths.add(wallpaper.posterStoragePath);

  const urlPaths = [
    extractStoragePathFromPublicUrl(wallpaper.url),
    extractStoragePathFromPublicUrl(wallpaper.videoUrl),
    extractStoragePathFromPublicUrl(wallpaper.posterUrl),
    extractStoragePathFromPublicUrl(wallpaper.thumbnailUrl),
  ];

  urlPaths.forEach((p) => {
    if (p) candidatePaths.add(p);
  });

  const pathsToRemove = Array.from(candidatePaths).filter(Boolean);

  // 2. Delete media objects from Supabase Storage bucket (if any belong to our bucket)
  if (pathsToRemove.length > 0) {
    const { error: storageError } = await supabase.storage
      .from(WALLPAPERS_BUCKET)
      .remove(pathsToRemove);

    if (storageError) {
      console.warn(
        '[Supabase Storage] Could not remove one or more objects:',
        storageError.message
      );
    }
  }

  // 3. Delete record from Supabase database table
  const { error: dbError } = await supabase
    .from('wallpapers')
    .delete()
    .eq('id', wallpaper.id);

  if (dbError) {
    throw new Error(`Database delete failed: ${dbError.message}`);
  }
}

export async function incrementWallpaperCounterInSupabase(
  id: string,
  field: 'downloads' | 'favorites',
  nextValue: number
): Promise<void> {
  if (!isSupabaseConfigured || !id) return;
  try {
    await supabase
      .from('wallpapers')
      .update({ [field]: Math.max(0, nextValue) })
      .eq('id', id);
  } catch (err) {
    console.warn(`[Supabase] Failed to update ${field} counter for ${id}:`, err);
  }
}
