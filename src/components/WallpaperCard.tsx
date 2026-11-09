import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Download, Heart, Play, Smartphone } from 'lucide-react';
import { Wallpaper, Language } from '../types';
import { translations } from '../translations';
import {
  getOptimizedPreviewUrl,
  getCategoryFallback,
  markUrlAsFailed,
  isVideoUrl,
} from '../utils/mediaUtils';
import { safeResolveMediaUrl, getDarkNeonPlaceholder } from '../utils/safeBlobLoader';
import { cleanWallpaperTitle, extractResolutionFromTitle } from '../utils/titleSanitizer';
import { DeskSpaceLogo } from './DeskSpaceLogo';

interface WallpaperCardProps {
  wallpaper: Wallpaper;
  lang: Language;
  isFavorited: boolean;
  onToggleFavorite: (id: string) => void;
  onOpenDownloadModal: (wallpaper: Wallpaper) => void;
  onOpenDetails?: (wallpaper: Wallpaper) => void;
}

const WallpaperCardComponent: React.FC<WallpaperCardProps> = ({
  wallpaper,
  lang,
  isFavorited,
  onToggleFavorite,
  onOpenDownloadModal,
  onOpenDetails,
}) => {
  const cardRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const hoverDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const [imageLoaded, setImageLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isHoverIntentConfirmed, setIsHoverIntentConfirmed] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isInViewport, setIsInViewport] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [fallbackLevel, setFallbackLevel] = useState<number>(0);
  const [hasPermanentError, setHasPermanentError] = useState(false);

  const rawTitle = wallpaper.title[lang] || wallpaper.title.en;
  const currentTitle = cleanWallpaperTitle(rawTitle);
  const t = translations[lang];

  // Clean resolution string without polluting title
  const cleanResolution =
    extractResolutionFromTitle(rawTitle) ||
    (wallpaper.resolution ? wallpaper.resolution.replace(/\s*[xX]\s*/g, '×').trim() : (wallpaper.aspectRatio === '9:16' ? '2160×3840' : '3840×2160'));

  // Check whether this item has live motion / video capability
  const isLiveMedia = Boolean(
    wallpaper.isLive &&
      (wallpaper.videoUrl ||
        wallpaper.formatType === 'video' ||
        isVideoUrl(wallpaper.url) ||
        isVideoUrl(wallpaper.videoUrl))
  );

  const isMobileCard = Boolean(
    wallpaper.deviceFormat === 'mobile' ||
      wallpaper.aspectRatio === '9:16' ||
      wallpaper.isMobile === true ||
      wallpaper.tags?.includes('Mobile Live Wallpapers')
  );

  const isVideo = isLiveMedia && !videoError;
  const [resolvedVideoSource, setResolvedVideoSource] = useState<string>(
    wallpaper.videoUrl || wallpaper.url || ''
  );

  // Lightweight preview URL for images & video posters
  const rawTargetInitial = wallpaper.thumbnailUrl || wallpaper.posterUrl || (isLiveMedia ? undefined : wallpaper.url);
  const initialPreviewUrl = rawTargetInitial && rawTargetInitial.trim() !== ''
    ? getOptimizedPreviewUrl(rawTargetInitial, 640, wallpaper.category)
    : getCategoryFallback(wallpaper.category);
  const [currentImgSrc, setCurrentImgSrc] = useState<string>(initialPreviewUrl);

  // Asynchronously resolve IndexedDB persistent blobs (e.g., idb://media/:id or stale blob: URLs)
  useEffect(() => {
    let isMounted = true;
    const rawTarget = wallpaper.thumbnailUrl || wallpaper.posterUrl || (isLiveMedia ? undefined : wallpaper.url);

    // Strict null-check: if no media target exists at all, fallback immediately
    if (!rawTarget || rawTarget.trim() === '' || rawTarget === 'null' || rawTarget === 'undefined') {
      const catFallback = getCategoryFallback(wallpaper.category);
      if (catFallback) {
        setCurrentImgSrc(catFallback);
        setImageLoaded(true);
      } else {
        setHasPermanentError(true);
        setImageLoaded(true);
      }
      return;
    }

    // Initial preview setup
    setCurrentImgSrc(getOptimizedPreviewUrl(rawTarget, 640, wallpaper.category));
    setFallbackLevel(0);
    setHasPermanentError(false);
    setVideoError(false);

    // Resolve persistent custom media from IndexedDB if needed
    if (rawTarget && (rawTarget.startsWith('idb://') || rawTarget.startsWith('blob:'))) {
      safeResolveMediaUrl(wallpaper.id, rawTarget, wallpaper.category, currentTitle).then((resolved) => {
        if (isMounted) {
          if (resolved && resolved.trim() !== '') {
            setCurrentImgSrc(resolved);
          } else {
            setCurrentImgSrc(getCategoryFallback(wallpaper.category));
          }
        }
      });
    }

    // Resolve video source if needed with strict null-checks
    const rawVideo = wallpaper.videoUrl || wallpaper.url;
    if (rawVideo && (rawVideo.startsWith('idb://') || rawVideo.startsWith('blob:'))) {
      safeResolveMediaUrl(wallpaper.id, rawVideo, wallpaper.category, currentTitle).then((resolved) => {
        if (isMounted) {
          setResolvedVideoSource(resolved || '');
        }
      });
    } else {
      setResolvedVideoSource(rawVideo || '');
    }

    return () => {
      isMounted = false;
      if (videoRef.current) {
        try {
          videoRef.current.pause();
          videoRef.current.removeAttribute('src');
          videoRef.current.load();
        } catch {
          // Ignore
        }
      }
    };
  }, [
    wallpaper.id,
    wallpaper.url,
    wallpaper.videoUrl,
    wallpaper.posterUrl,
    wallpaper.thumbnailUrl,
    wallpaper.category,
    isLiveMedia,
    currentTitle,
  ]);

  // Component lifecycle: ensure cleanup of timers and media decoding buffers on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (hoverDebounceTimerRef.current) {
        clearTimeout(hoverDebounceTimerRef.current);
        hoverDebounceTimerRef.current = null;
      }
      if (videoRef.current) {
        try {
          videoRef.current.pause();
          videoRef.current.removeAttribute('src');
          videoRef.current.load();
        } catch {
          // Ignore
        }
      }
    };
  }, []);

  // Strict IntersectionObserver: ensures off-screen elements cancel hover/pause playback to protect GPU/CPU
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const inView = entry.isIntersecting;
          setIsInViewport(inView);
          if (!inView) {
            // Cancel any pending debounce timer
            if (hoverDebounceTimerRef.current) {
              clearTimeout(hoverDebounceTimerRef.current);
              hoverDebounceTimerRef.current = null;
            }
            setIsHoverIntentConfirmed(false);
            setIsVideoPlaying(false);
            if (videoRef.current) {
              try {
                videoRef.current.pause();
                videoRef.current.currentTime = 0;
                videoRef.current.removeAttribute('src');
                videoRef.current.load();
              } catch {
                // Ignore
              }
            }
          }
        });
      },
      { rootMargin: '120px', threshold: 0.1 }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  // 1. Strict Debounce (150ms) on mouse enter so video previews never fire when cursor glides across cards
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);

    // Cancel any existing debounce timer to avoid overlaps
    if (hoverDebounceTimerRef.current) {
      clearTimeout(hoverDebounceTimerRef.current);
      hoverDebounceTimerRef.current = null;
    }

    // Only initiate debounced hover if this card is a live video in viewport with no error
    if (!isVideo || !isInViewport || videoError) return;

    // Strict 150ms debounce before confirming hover intent and lazy-loading the video stream
    hoverDebounceTimerRef.current = setTimeout(() => {
      if (isMountedRef.current && isInViewport) {
        setIsHoverIntentConfirmed(true);
      }
    }, 150);
  }, [isVideo, isInViewport, videoError]);

  // 2. Hardware Acceleration & Resource Cleanup on mouse leave:
  // Immediately pauses, resets currentTime to 0, and releases hardware decoder/memory buffers
  const handleMouseLeave = useCallback(() => {
    // Immediately cancel debounce timer if mouse leaves before 150ms
    if (hoverDebounceTimerRef.current) {
      clearTimeout(hoverDebounceTimerRef.current);
      hoverDebounceTimerRef.current = null;
    }

    setIsHovered(false);
    setIsHoverIntentConfirmed(false);
    setIsVideoPlaying(false);

    const video = videoRef.current;
    if (video) {
      const releaseMediaBuffers = () => {
        try {
          video.pause();
          video.currentTime = 0;
          // Explicitly purge src attribute and call load() to release hardware video decoder
          // handles, GPU texture buffers, and network chunk caches in Chromium and WebKit
          video.removeAttribute('src');
          video.load();
        } catch {
          // Ignore
        }
      };

      if (playPromiseRef.current) {
        playPromiseRef.current.then(releaseMediaBuffers).catch(releaseMediaBuffers);
        playPromiseRef.current = null;
      } else {
        releaseMediaBuffers();
      }
    }
  }, []);

  // Playback handler triggered ONLY when hover intent has been confirmed (150ms elapsed)
  useEffect(() => {
    if (!isHoverIntentConfirmed || !isVideo || videoError) return;

    const video = videoRef.current;
    if (video) {
      playPromiseRef.current = video.play().catch((err) => {
        if (err?.name !== 'AbortError') {
          console.warn('Hover video preview play deferred:', err);
        }
      });
    }
  }, [isHoverIntentConfirmed, isVideo, videoError]);

  // Image Fallback error handler: Transitions gracefully to Category Fallback, then Dark Neon,
  // and finally to the sleek branded DeskSpace4K Fallback Placeholder UI (never a broken box or empty card)
  const handleImageError = useCallback(() => {
    markUrlAsFailed(currentImgSrc);
    if (fallbackLevel === 0) {
      setFallbackLevel(1);
      const catFallback = getCategoryFallback(wallpaper.category);
      if (catFallback && catFallback !== currentImgSrc) {
        setCurrentImgSrc(catFallback);
        return;
      }
    }
    
    if (fallbackLevel === 1) {
      setFallbackLevel(2);
      const neonPlaceholder = getDarkNeonPlaceholder(currentTitle, wallpaper.category);
      if (neonPlaceholder && neonPlaceholder !== currentImgSrc) {
        setCurrentImgSrc(neonPlaceholder);
        return;
      }
    }

    // Permanent fallback: activate sleek branded UI card
    setHasPermanentError(true);
    setImageLoaded(true);
  }, [fallbackLevel, wallpaper.category, currentTitle, currentImgSrc]);

  // Navigation click
  const handleCardClick = () => {
    if (onOpenDetails) {
      onOpenDetails(wallpaper);
    } else {
      onOpenDownloadModal(wallpaper);
    }
  };

  return (
    <article
      ref={cardRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ transform: 'translateZ(0)', willChange: 'transform' }}
      className="group relative rounded-xl sm:rounded-2xl bg-[#16171E] border border-[#242634] hover:border-cyan-500/40 shadow-xl overflow-hidden transition-all duration-300 flex flex-col justify-between transform-gpu will-change-transform [backface-visibility:hidden] [transform:translateZ(0)]"
    >
      {/* 1. Media Container: Responsive 16:9 for desktop and 9:16 portrait for mobile */}
      <div
        style={{ transform: 'translateZ(0)', willChange: 'transform' }}
        className={`relative ${isMobileCard ? 'aspect-[9/16]' : 'aspect-video'} w-full overflow-hidden bg-[#0D0E13] cursor-pointer select-none transform-gpu will-change-transform [transform:translateZ(0)]`}
        onClick={handleCardClick}
      >
        {/* Skeleton pulse indicator while image is loading */}
        {!imageLoaded && !hasPermanentError && (
          <div className="absolute inset-0 bg-[#12131A] animate-pulse flex items-center justify-center z-0">
            <span className="text-[9px] sm:text-[11px] text-neutral-600 font-mono tracking-wider">
              {isMobileCard ? '9:16 VERTICAL' : '4K ULTRA HD'}
            </span>
          </div>
        )}

        {/* Mobile Format indicator badge */}
        {isMobileCard && (
          <div className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5 px-1.5 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-fuchsia-500/30 text-[9px] sm:text-[10px] font-semibold text-fuchsia-300 flex items-center gap-1 z-10 pointer-events-none">
            <Smartphone className="w-2.5 h-2.5 text-fuchsia-400" />
            <span className="font-mono text-[8px] sm:text-[9px]">9:16</span>
          </div>
        )}

        {/* Fallback Placeholder UI: Rendered whenever an image fails or media is missing (Strict zero blank card guarantee) */}
        {hasPermanentError || !currentImgSrc || currentImgSrc.trim() === '' ? (
          <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-[#0B0C12] via-[#121422] to-[#07080D] flex flex-col items-center justify-center p-3 sm:p-4 text-center select-none border border-cyan-500/20 transform-gpu will-change-transform [transform:translateZ(0)]">
            {/* Ambient glowing radial effect */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.14),transparent_70%)] pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center gap-1.5 sm:gap-2">
              <div className="p-1 sm:p-1.5 rounded-xl sm:rounded-2xl bg-[#0D0F18] border border-cyan-500/35 shadow-lg shadow-cyan-500/10">
                <DeskSpaceLogo size={isMobileCard ? 28 : 34} showText={false} />
              </div>

              <div className="px-1 sm:px-2 max-w-full">
                <div className="text-[9px] sm:text-[10px] font-mono font-black tracking-widest text-cyan-400 uppercase">
                  DESKSPACE4K
                </div>
                <h4 className="text-[11px] sm:text-xs font-bold text-white line-clamp-1 max-w-[180px] sm:max-w-[210px] mt-0.5" title={currentTitle}>
                  {currentTitle}
                </h4>
                <div className="text-[9px] sm:text-[10px] text-neutral-400 font-mono mt-0.5 truncate">
                  {cleanResolution} · {wallpaper.category}
                </div>
              </div>

              <div className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-[8px] sm:text-[9px] font-mono text-cyan-300">
                {lang === 'ar' ? 'معاينة 4K رقمية' : '4K Master'}
              </div>
            </div>
          </div>
        ) : (
          /* High-Resolution Static 4K Poster */
          <img
            src={currentImgSrc}
            alt={`${currentTitle} - 4K Ultra HD Desktop Wallpaper (${wallpaper.resolution || '3840×2160'}) - ${wallpaper.category}`}
            loading="lazy"
            decoding="async"
            width={wallpaper.width || 3840}
            height={wallpaper.height || 2160}
            referrerPolicy="no-referrer"
            onLoad={() => setImageLoaded(true)}
            onError={handleImageError}
            style={{ transform: 'translateZ(0)', willChange: 'transform' }}
            className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 transform-gpu will-change-transform [transform:translateZ(0)] ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}

        {/* Video Player: Strict null-check on resolvedVideoSource + lazy-loaded ONLY when 150ms hover intent is confirmed */}
        {Boolean(isVideo && isHoverIntentConfirmed && resolvedVideoSource && resolvedVideoSource.trim() !== '' && !videoError) && (
          <video
            ref={videoRef}
            src={resolvedVideoSource}
            poster={wallpaper.posterUrl || undefined}
            loop
            muted
            playsInline
            preload="auto"
            autoPlay
            onLoadedData={() => setImageLoaded(true)}
            onPlaying={() => setIsVideoPlaying(true)}
            onError={() => {
              console.warn(`Live video stream failed for ${wallpaper.id}, falling back cleanly to poster.`);
              markUrlAsFailed(resolvedVideoSource);
              setVideoError(true);
              setIsHoverIntentConfirmed(false);
              setIsVideoPlaying(false);
            }}
            style={{ transform: 'translateZ(0)', willChange: 'transform' }}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 transform-gpu will-change-transform [transform:translateZ(0)] ${
              isVideoPlaying ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}

        {/* Subtle hover play hint for Live Wallpapers */}
        {isVideo && !isHoverIntentConfirmed && (
          <div className="absolute bottom-2 right-2 sm:bottom-2.5 sm:right-2.5 px-1.5 sm:px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-white/10 text-[9px] sm:text-[10px] font-medium text-neutral-300 flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            <Play className="w-2.5 h-2.5 fill-rose-400 text-rose-400" />
            <span className="font-mono text-[8px] sm:text-[9px] text-neutral-200 hidden xs:inline sm:inline">
              {lang === 'ar' ? 'معاينة' : 'Play'}
            </span>
          </div>
        )}
      </div>

      {/* 2. Card Info & Actions: Clean metadata positioned OUTSIDE the artwork */}
      <div className="p-2.5 sm:p-4 flex flex-col justify-between flex-1 bg-[#16171E]">
        <div>
          {/* Title & Live / Mobile indicators */}
          <div className="flex items-start justify-between gap-1.5 sm:gap-2">
            <h3
              onClick={handleCardClick}
              className="text-xs sm:text-sm font-bold text-white group-hover:text-cyan-300 transition-colors cursor-pointer truncate flex-1 min-w-0"
              title={currentTitle}
            >
              {currentTitle}
            </h3>

            <div className="flex items-center gap-1 shrink-0">
              {isMobileCard && (
                <span className="inline-flex items-center gap-0.5 sm:gap-1 px-1 sm:px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/30">
                  <Smartphone className="w-2.5 h-2.5" />
                  <span className="hidden sm:inline">9:16</span>
                </span>
              )}
              {wallpaper.isLive && (
                <span className="inline-flex items-center gap-0.5 sm:gap-1 px-1 sm:px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                  <Play className="w-2.5 h-2.5 fill-current" />
                  <span className="text-[8px] sm:text-[9px]">60FPS</span>
                </span>
              )}
            </div>
          </div>

          {/* Clean metadata (Resolution, Category, Downloads, File Size) */}
          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] text-neutral-400 mt-1.5 sm:mt-2 font-normal leading-tight">
            <span className="font-mono text-cyan-400 font-semibold">{cleanResolution}</span>
            <span aria-hidden="true" className="text-neutral-600">·</span>
            <span className="truncate max-w-[80px] sm:max-w-none">{t.categories[wallpaper.category] || wallpaper.category}</span>
            <span aria-hidden="true" className="text-neutral-600 hidden sm:inline">·</span>
            <span className="font-mono tabular-nums hidden sm:inline">
              {wallpaper.downloads.toLocaleString()} {t.downloadsCount}
            </span>
          </div>
        </div>

        {/* Action Row: Primary 4K Download button & Favorite heart button */}
        <div className="mt-2.5 sm:mt-4 pt-2 sm:pt-3 border-t border-[#222432] flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => onOpenDownloadModal(wallpaper)}
            className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 min-h-[40px] sm:min-h-[42px] py-2 px-2 sm:px-3.5 rounded-xl text-[11px] sm:text-xs font-bold bg-[#20222D] hover:bg-gradient-to-r hover:from-cyan-500 hover:to-blue-600 text-neutral-200 hover:text-black border border-[#2B2F40] hover:border-transparent transition-all shadow-sm cursor-pointer touch-manipulation active:scale-[0.98]"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
            <span className="truncate">{t.download4K}</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleFavorite(wallpaper.id)}
            className={`min-h-[40px] min-w-[40px] sm:min-h-[42px] sm:min-w-[42px] p-2 rounded-xl transition-all border cursor-pointer shrink-0 flex items-center justify-center touch-manipulation active:scale-[0.98] ${
              isFavorited
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                : 'bg-[#20222D] hover:bg-[#282B38] border-[#2B2F40] text-neutral-400 hover:text-white'
            }`}
            title={isFavorited ? t.removeFromFavorites : t.addToFavorites}
            aria-label={isFavorited ? t.removeFromFavorites : t.addToFavorites}
          >
            <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>
    </article>
  );
};

export const WallpaperCard = React.memo(
  WallpaperCardComponent,
  (prev, next) =>
    prev.wallpaper.id === next.wallpaper.id &&
    prev.wallpaper.url === next.wallpaper.url &&
    prev.wallpaper.videoUrl === next.wallpaper.videoUrl &&
    prev.wallpaper.posterUrl === next.wallpaper.posterUrl &&
    prev.wallpaper.thumbnailUrl === next.wallpaper.thumbnailUrl &&
    prev.wallpaper.downloads === next.wallpaper.downloads &&
    prev.wallpaper.favorites === next.wallpaper.favorites &&
    prev.isFavorited === next.isFavorited &&
    prev.lang === next.lang
);
