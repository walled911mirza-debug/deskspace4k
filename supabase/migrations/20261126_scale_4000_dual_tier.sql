-- Safe, non-destructive schema upgrade for DeskSpace4K (scaling to 4,000+ animated wallpapers)
-- Preserves all existing records and legacy columns while adding dual-tier URLs and bilingual columns.

ALTER TABLE public.wallpapers ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.wallpapers ADD COLUMN IF NOT EXISTS title_ar TEXT;
ALTER TABLE public.wallpapers ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Space';
ALTER TABLE public.wallpapers ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE public.wallpapers ADD COLUMN IF NOT EXISTS preview_url TEXT;
ALTER TABLE public.wallpapers ADD COLUMN IF NOT EXISTS full_url TEXT;
ALTER TABLE public.wallpapers ADD COLUMN IF NOT EXISTS file_size TEXT DEFAULT '4K UHD';
ALTER TABLE public.wallpapers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill preview_url and full_url safely from existing records without overwriting existing values
UPDATE public.wallpapers
SET
  preview_url = COALESCE(NULLIF(preview_url, ''), NULLIF(thumbnail_url, ''), NULLIF(poster_url, ''), NULLIF(file_url, '')),
  full_url = COALESCE(NULLIF(full_url, ''), NULLIF(video_url, ''), NULLIF(file_url, ''))
WHERE preview_url IS NULL OR preview_url = '' OR full_url IS NULL OR full_url = '';

-- Performance indexes for fast 24-item batch pagination and filtering at 4,000+ rows
CREATE INDEX IF NOT EXISTS idx_wallpapers_created_at_desc ON public.wallpapers (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallpapers_category_created_at ON public.wallpapers (category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallpapers_downloads_desc ON public.wallpapers (downloads DESC);
CREATE INDEX IF NOT EXISTS idx_wallpapers_favorites_desc ON public.wallpapers (favorites DESC);
CREATE INDEX IF NOT EXISTS idx_wallpapers_is_live ON public.wallpapers (is_live);
