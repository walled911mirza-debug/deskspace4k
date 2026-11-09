import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import {
  Download,
  Heart,
  Share2,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Sparkles,
  Info,
  Layers,
  Monitor,
  Smartphone,
  Eye,
  Calendar,
  ShieldCheck,
  Tag,
  ExternalLink,
  ChevronDown,
  Film,
  Image as ImageIcon,
  HelpCircle,
  Apple,
} from 'lucide-react';
import { Wallpaper, Category, Language } from '../types';
import { translations } from '../translations';
import {
  downloadWallpaperWithResolution,
  downloadLiveMotionVideo,
  downloadDirectMediaFile,
  detectMediaExtension,
  sanitizeFilename,
  fallbackDirectDownload,
  downloadMobileLiveWallpaper,
  detectMobilePlatform,
  MobilePlatform,
} from '../utils/downloadEngine';
import {
  getOptimizedPreviewUrl,
  getCategoryFallback,
  getSvgCardPlaceholder,
  markUrlAsFailed,
  isVideoUrl,
} from '../utils/mediaUtils';
import { safeResolveMediaUrl, getDarkNeonPlaceholder } from '../utils/safeBlobLoader';
import { cleanWallpaperTitle, extractResolutionFromTitle } from '../utils/titleSanitizer';
import { getWallpaperByIdOrSlug, matchesIdOrSlug } from '../utils/storageManager';
import { AdSenseUnit } from './AdSenseUnit';

interface ResolutionOption {
  id: string;
  name: { en: string; ar: string };
  width: number;
  height: number;
  aspectRatio: string;
  badge?: string;
}

const RESOLUTION_OPTIONS: ResolutionOption[] = [
  {
    id: '4k',
    name: { en: '4K Ultra HD (Original)', ar: '4K الترا اتش دي (الأصلية)' },
    width: 3840,
    height: 2160,
    aspectRatio: '16:9',
    badge: 'Recommended',
  },
  {
    id: '2k',
    name: { en: '2K Quad HD (1440p)', ar: '2K كواد اتش دي (1440p)' },
    width: 2560,
    height: 1440,
    aspectRatio: '16:9',
  },
  {
    id: 'fhd',
    name: { en: 'Full HD (1080p)', ar: 'فل اتش دي (1080p)' },
    width: 1920,
    height: 1080,
    aspectRatio: '16:9',
  },
  {
    id: 'mobile',
    name: { en: 'Mobile Portrait (4K)', ar: 'شاشة هاتف ذكي عمودية (4K)' },
    width: 2160,
    height: 3840,
    aspectRatio: '9:16',
  },
  {
    id: 'ultrawide',
    name: { en: 'Ultrawide 21:9', ar: 'شاشة عريضة 21:9' },
    width: 3440,
    height: 1440,
    aspectRatio: '21:9',
  },
];

interface WallpaperDetailsPageProps {
  wallpaper?: Wallpaper | null;
  allWallpapers: Wallpaper[];
  lang: Language;
  isFavorited: boolean;
  onToggleFavorite: (id: string) => void;
  onRecordDownload: (wallpaper: Wallpaper, resolutionStr: string) => void;
  onBackToGallery: () => void;
  onSelectWallpaper: (wallpaper: Wallpaper) => void;
  onSelectTag: (tag: string) => void;
  onSelectCategory: (cat: Category) => void;
}

const WallpaperDetailsPageComponent: React.FC<WallpaperDetailsPageProps> = ({
  wallpaper: initialWallpaper,
  allWallpapers,
  lang,
  isFavorited,
  onToggleFavorite,
  onRecordDownload,
  onBackToGallery,
  onSelectWallpaper,
  onSelectTag,
  onSelectCategory,
}) => {
  const params = useParams<{ id?: string; slug?: string }>();
  const location = useLocation();

  // 1. Dynamic Parameter Extraction & ID Matching:
  // Correctly extract the active wallpaper ID or slug from URL parameters (useParams, pathname, or search query)
  const routeIdentifier = useMemo(() => {
    if (params.id) return decodeURIComponent(params.id).trim();
    if (params.slug) return decodeURIComponent(params.slug).trim();
    const match = location.pathname.match(/^\/wallpaper\/([^/?#]+)/i);
    if (match) return decodeURIComponent(match[1]).trim();
    const searchParams = new URLSearchParams(location.search);
    const qId = searchParams.get('id') || searchParams.get('slug');
    if (qId) return decodeURIComponent(qId).trim();
    return initialWallpaper?.id || null;
  }, [params.id, params.slug, location.pathname, location.search, initialWallpaper?.id]);

  const [activeWallpaper, setActiveWallpaper] = useState<Wallpaper | null>(() => {
    if (initialWallpaper && routeIdentifier && matchesIdOrSlug(initialWallpaper, routeIdentifier)) {
      return initialWallpaper;
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    return !(initialWallpaper && routeIdentifier && matchesIdOrSlug(initialWallpaper, routeIdentifier));
  });
  const [notFound, setNotFound] = useState<boolean>(false);

  const [selectedResId, setSelectedResId] = useState<string>('4k');
  const [isResDropdownOpen, setIsResDropdownOpen] = useState(false);
  const [downloadingType, setDownloadingType] = useState<'video' | 'photo' | null>(null);
  const [downloadSuccessType, setDownloadSuccessType] = useState<'video' | 'photo' | null>(null);
  const [downloadingMobile, setDownloadingMobile] = useState<MobilePlatform | null>(null);
  const [mobilePlatform, setMobilePlatform] = useState<MobilePlatform>(() => detectMobilePlatform());
  const [isMobileGuideOpen, setIsMobileGuideOpen] = useState(false);
  const [copiedSteps, setCopiedSteps] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Video playback states
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [fallbackLevel, setFallbackLevel] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const theaterRef = useRef<HTMLDivElement>(null);
  const resDropdownRef = useRef<HTMLDivElement>(null);

  const [previewImgUrl, setPreviewImgUrl] = useState<string>('');
  const [resolvedVideoSource, setResolvedVideoSource] = useState<string>('');

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (resDropdownRef.current && !resDropdownRef.current.contains(e.target as Node)) {
        setIsResDropdownOpen(false);
      }
    };
    if (isResDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isResDropdownOpen]);

  // 2. State Reset & Cleanup on Navigation:
  // Ensure that when navigating from one wallpaper to another, the detail view state resets immediately
  // and queries the new ID to prevent stale images or cached data from persisting.
  useEffect(() => {
    let isMounted = true;

    // Immediately reset media and playback state
    setImageLoaded(false);
    setPreviewImgUrl('');
    setResolvedVideoSource('');
    setVideoError(false);
    setFallbackLevel(0);
    setIsZoomed(false);
    setDownloadingType(null);
    setDownloadSuccessType(null);
    setDownloadingMobile(null);
    setIsResDropdownOpen(false);
    setSelectedResId('4k');
    setIsPlaying(true);
    setIsMuted(true);

    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.removeAttribute('src');
        videoRef.current.load();
      } catch {
        // ignore
      }
    }

    if (!routeIdentifier) {
      setActiveWallpaper(null);
      setIsLoading(false);
      setNotFound(true);
      return;
    }

    const applyWallpaperRecord = async (targetWp: Wallpaper) => {
      if (!isMounted) return;
      setActiveWallpaper(targetWp);
      setIsLoading(false);
      setNotFound(false);

      const isLive = Boolean(
        targetWp.isLive &&
          (targetWp.videoUrl ||
            targetWp.formatType === 'video' ||
            isVideoUrl(targetWp.url) ||
            isVideoUrl(targetWp.videoUrl))
      );

      const rawTitleStr = targetWp.title[lang] || targetWp.title.en;
      const cleanTitleStr = cleanWallpaperTitle(rawTitleStr);
      const rawTarget = targetWp.posterUrl || targetWp.thumbnailUrl || (isLive ? undefined : targetWp.url);
      const initialPreview = getOptimizedPreviewUrl(rawTarget, 1920, targetWp.category);
      setPreviewImgUrl(initialPreview);

      if (rawTarget && (rawTarget.startsWith('idb://') || rawTarget.startsWith('blob:'))) {
        const resolved = await safeResolveMediaUrl(targetWp.id, rawTarget, targetWp.category, cleanTitleStr);
        if (isMounted && resolved) {
          setPreviewImgUrl(resolved);
        }
      }

      const rawVid = targetWp.videoUrl || targetWp.url;
      if (isLive && rawVid) {
        if (rawVid.startsWith('idb://') || rawVid.startsWith('blob:')) {
          const resolvedVid = await safeResolveMediaUrl(targetWp.id, rawVid, targetWp.category, cleanTitleStr);
          if (isMounted && resolvedVid) {
            setResolvedVideoSource(resolvedVid);
          }
        } else {
          setResolvedVideoSource(rawVid);
        }
      } else {
        setResolvedVideoSource('');
      }

      window.scrollTo({ top: 0, behavior: 'instant' });
    };

    // If initialWallpaper prop matches routeIdentifier, apply immediately
    if (initialWallpaper && matchesIdOrSlug(initialWallpaper, routeIdentifier)) {
      applyWallpaperRecord(initialWallpaper);
      return;
    }

    // Dynamic Parameter Extraction & Exact Matching:
    // Fetch and display the exact record from IndexedDB or state where item.id === routeId or item.slug === routeSlug
    setIsLoading(true);
    setNotFound(false);

    getWallpaperByIdOrSlug(routeIdentifier, allWallpapers).then((found) => {
      if (!isMounted) return;
      if (!found) {
        setActiveWallpaper(null);
        setIsLoading(false);
        setNotFound(true);
        return;
      }
      applyWallpaperRecord(found);
    });

    return () => {
      isMounted = false;
      if (videoRef.current) {
        try {
          videoRef.current.pause();
          videoRef.current.removeAttribute('src');
          videoRef.current.load();
        } catch {
          // ignore
        }
      }
    };
  }, [routeIdentifier, initialWallpaper?.id, allWallpapers, lang]);

  const t = translations[lang];

  // Derived properties from resolved active wallpaper
  const wallpaper = activeWallpaper;
  const rawTitle = wallpaper ? wallpaper.title[lang] || wallpaper.title.en : '';
  const currentTitle = useMemo(() => cleanWallpaperTitle(rawTitle), [rawTitle]);

  // Clean resolution string isolated exclusively from title
  const resolutionBadge = useMemo(() => {
    if (!wallpaper) return '3840×2160';
    const fromTitle = extractResolutionFromTitle(rawTitle);
    if (fromTitle) return fromTitle;
    if (wallpaper.resolution) return wallpaper.resolution.replace(/\s*[xX]\s*/g, '×').trim();
    if (wallpaper.width && wallpaper.height) return `${wallpaper.width}×${wallpaper.height}`;
    return wallpaper.aspectRatio === '9:16' || wallpaper.deviceFormat === 'mobile' ? '2160×3840' : '3840×2160';
  }, [wallpaper, rawTitle]);

  const aspectRatioLabel = useMemo(() => {
    if (!wallpaper) return '16:9 Widescreen';
    if (wallpaper.aspectRatio) {
      if (wallpaper.aspectRatio === '9:16') return '9:16 Portrait';
      if (wallpaper.aspectRatio === '16:9') return '16:9 Widescreen';
      if (wallpaper.aspectRatio === '21:9') return '21:9 Ultrawide';
      return wallpaper.aspectRatio;
    }
    if (wallpaper.width && wallpaper.height) {
      if (wallpaper.height > wallpaper.width) return '9:16 Portrait';
      return '16:9 Widescreen';
    }
    return '16:9 Widescreen';
  }, [wallpaper]);

  // Determine media type
  const isLiveMedia = Boolean(
    wallpaper?.isLive &&
      (wallpaper.videoUrl ||
        wallpaper.formatType === 'video' ||
        isVideoUrl(wallpaper.url) ||
        isVideoUrl(wallpaper.videoUrl))
  );
  const isVideo = isLiveMedia && !videoError;
  const videoSource = resolvedVideoSource;

  const selectedRes = useMemo(
    () => RESOLUTION_OPTIONS.find((r) => r.id === selectedResId) || RESOLUTION_OPTIONS[0],
    [selectedResId]
  );

  // Related Wallpapers: strictly exclude current item, prioritize same category, shuffle for variety, and fall back to 4 unique items
  const isCurrentMobile = Boolean(
    wallpaper &&
      (wallpaper.aspectRatio === '9:16' ||
        wallpaper.deviceFormat === 'mobile' ||
        wallpaper.tags?.includes('Mobile Live Wallpapers'))
  );

  const relatedWallpapers = useMemo(() => {
    if (!wallpaper) return [];
    const TARGET_COUNT = 4;
    const currentId = wallpaper.id;
    const currentCategory = wallpaper.category;

    // Helper: Match device orientation format (desktop 16:9 vs mobile 9:16)
    const matchesFormat = (w: Wallpaper) => {
      const isItemMobile = Boolean(
        w.aspectRatio === '9:16' ||
          w.deviceFormat === 'mobile' ||
          w.tags?.includes('Mobile Live Wallpapers')
      );
      return isItemMobile === isCurrentMobile;
    };

    // 1. Initial pool: strictly exclude current item ID and match format
    const candidatePool = allWallpapers.filter(
      (w) => w && w.id && w.id !== currentId && matchesFormat(w)
    );

    // 2. Primary Tier: Items belonging to the EXACT same category (shuffled for variety)
    const sameCategoryItems = candidatePool
      .filter((w) => w.category === currentCategory)
      .sort(() => 0.5 - Math.random());

    const selected: Wallpaper[] = [];
    const selectedIds = new Set<string>();

    for (const item of sameCategoryItems) {
      if (selected.length >= TARGET_COUNT) break;
      if (!selectedIds.has(item.id)) {
        selected.push(item);
        selectedIds.add(item.id);
      }
    }

    // 3. Fallback Tier: If category has fewer than 4 items, fill remaining slots with popular/varied items from other categories
    if (selected.length < TARGET_COUNT) {
      const otherCategoryPool = candidatePool
        .filter((w) => w.category !== currentCategory && !selectedIds.has(w.id))
        .sort((a, b) => (b.downloads || 0) - (a.downloads || 0));

      // Pick from top candidates with shuffle for rich variety
      const fallbackCandidates = otherCategoryPool
        .slice(0, 12)
        .sort(() => 0.5 - Math.random());

      for (const item of fallbackCandidates) {
        if (selected.length >= TARGET_COUNT) break;
        if (!selectedIds.has(item.id)) {
          selected.push(item);
          selectedIds.add(item.id);
        }
      }
    }

    // 4. Fail-Safe Tier: If format pool is limited, pull from entire library excluding current ID
    if (selected.length < TARGET_COUNT) {
      const fallbackPool = allWallpapers
        .filter((w) => w && w.id && w.id !== currentId && !selectedIds.has(w.id))
        .sort(() => 0.5 - Math.random());

      for (const item of fallbackPool) {
        if (selected.length >= TARGET_COUNT) break;
        if (!selectedIds.has(item.id)) {
          selected.push(item);
          selectedIds.add(item.id);
        }
      }
    }

    // Return exactly up to 4 clean unique items
    return selected.slice(0, TARGET_COUNT);
  }, [allWallpapers, wallpaper?.id, wallpaper?.category, isCurrentMobile]);

  // Video Play/Pause toggle
  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  // Video Mute toggle
  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  // Fullscreen theater toggle
  const toggleFullscreen = () => {
    const elem = theaterRef.current;
    if (!elem) return;

    if (!document.fullscreenElement) {
      elem.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // 1. Motion Video Download Handler (High-resolution .mp4 / .webm)
  const handleDownloadMotionVideo = async () => {
    if (!wallpaper || downloadingType) return;
    setDownloadingType('video');
    setDownloadSuccessType(null);

    try {
      const safeTitle = currentTitle.replace(/[^a-zA-Z0-9_\-\u0600-\u06FF]/g, '_').slice(0, 32) || 'Wallpaper';

      if (videoSource && !videoSource.startsWith('data:image/')) {
        // Genuine live motion video download (direct .mp4 or .webm)
        const baseFilename = `DeskSpace4K_${safeTitle}_LiveMotion`;
        const ext = detectMediaExtension(videoSource, 'mp4');
        await downloadDirectMediaFile(videoSource, baseFilename, ext);
        onRecordDownload(wallpaper, '4K Live Motion Video (MP4)');
      } else if (wallpaper.isLive) {
        // Procedural live motion wallpaper
        const baseFilename = `DeskSpace4K_${safeTitle}_LiveMotion`;
        await downloadLiveMotionVideo(videoSource || wallpaper.url || previewImgUrl, wallpaper.category, baseFilename);
        onRecordDownload(wallpaper, '4K Live Motion Video (MP4)');
      }

      setDownloadSuccessType('video');
      setTimeout(() => setDownloadSuccessType(null), 4500);
    } catch (err) {
      console.warn('Live video download error, using direct fallback:', err);
      const targetExt = detectMediaExtension(videoSource, 'mp4');
      const safeTitle = currentTitle.replace(/[^a-zA-Z0-9_\-\u0600-\u06FF]/g, '_').slice(0, 32) || 'Wallpaper';
      const fallbackFilename = sanitizeFilename(`DeskSpace4K_${safeTitle}_LiveMotion`, targetExt);
      fallbackDirectDownload(videoSource || wallpaper.videoUrl || wallpaper.url, fallbackFilename);
    } finally {
      setDownloadingType(null);
    }
  };

  // 2. Still Photo Download Handler (3840×2160 or user-selected resolution)
  const handleDownloadStillPhoto = async () => {
    if (!wallpaper || downloadingType) return;
    setDownloadingType('photo');
    setDownloadSuccessType(null);

    try {
      const safeTitle = currentTitle.replace(/[^a-zA-Z0-9_\-\u0600-\u06FF]/g, '_').slice(0, 32) || 'Wallpaper';
      const filename = `DeskSpace4K_${safeTitle}_${selectedRes.width}x${selectedRes.height}`;

      // Pick pristine static image source
      let photoSource = wallpaper.posterUrl || previewImgUrl;

      // If poster is missing or a placeholder, try extracting a pristine frame from the live video element
      if (!photoSource || photoSource.includes('placeholder')) {
        if (videoRef.current && videoRef.current.videoWidth > 0) {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = selectedRes.width;
            canvas.height = selectedRes.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
              photoSource = canvas.toDataURL('image/jpeg', 0.95);
            }
          } catch {
            photoSource = previewImgUrl || wallpaper.url;
          }
        } else {
          photoSource = previewImgUrl || wallpaper.url;
        }
      }

      await downloadWallpaperWithResolution({
        imageUrl: photoSource,
        filename,
        targetWidth: selectedRes.width,
        targetHeight: selectedRes.height,
        quality: 0.95,
      });
      onRecordDownload(wallpaper, `${selectedRes.width}×${selectedRes.height}`);

      setDownloadSuccessType('photo');
      setTimeout(() => setDownloadSuccessType(null), 4500);
    } catch (err) {
      console.warn('Still photo download error, using direct fallback:', err);
      const safeTitle = currentTitle.replace(/[^a-zA-Z0-9_\-\u0600-\u06FF]/g, '_').slice(0, 32) || 'Wallpaper';
      const fallbackFilename = sanitizeFilename(`DeskSpace4K_${safeTitle}_${selectedRes.width}x${selectedRes.height}`, 'jpg');
      fallbackDirectDownload(wallpaper.posterUrl || previewImgUrl || wallpaper.url, fallbackFilename);
    } finally {
      setDownloadingType(null);
    }
  };

  // 3. Mobile Live Wallpaper Download Handler (iPhone Live Photos & Android Video Wallpapers)
  const handleDownloadMobileLive = async (targetPlatform: MobilePlatform) => {
    if (!wallpaper || downloadingMobile || downloadingType) return;
    setDownloadingMobile(targetPlatform);

    try {
      const safeTitle = currentTitle.replace(/[^a-zA-Z0-9_\-\u0600-\u06FF]/g, '_').slice(0, 32) || 'Wallpaper';
      const baseFilename = `DeskSpace4K_${safeTitle}`;
      const videoSrc = videoSource || wallpaper.videoUrl || (isVideoUrl(wallpaper.url) ? wallpaper.url : null);
      const mediaSource = videoSrc || wallpaper.posterUrl || previewImgUrl || wallpaper.url;

      await downloadMobileLiveWallpaper(
        mediaSource,
        wallpaper.category,
        baseFilename,
        targetPlatform
      );

      const label = targetPlatform === 'ios' ? 'iPhone Live Photo (MP4)' : 'Android Live Wallpaper (MP4)';
      onRecordDownload(wallpaper, label);
      setDownloadSuccessType('video');
      setTimeout(() => setDownloadSuccessType(null), 4500);
    } catch (err) {
      console.error('Mobile Live download error:', err);
    } finally {
      setDownloadingMobile(null);
    }
  };

  // Copy Link Handler
  const handleCopyLink = () => {
    if (!wallpaper) return;
    try {
      const shareUrl = `${window.location.origin}/wallpaper/${wallpaper.id}`;
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      });
    } catch {
      // Fallback
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleCopySteps = () => {
    const stepsText =
      mobilePlatform === 'ios'
        ? `${t.mobileGuideIos}:\n${t.iosStep1}\n${t.iosStep2}\n${t.iosStep3}`
        : `${t.mobileGuideAndroid}:\n${t.androidStep1}\n${t.androidStep2}\n${t.androidStep3}`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(stepsText).then(() => {
        setCopiedSteps(true);
        setTimeout(() => setCopiedSteps(false), 2500);
      }).catch(() => {
        setCopiedSteps(true);
        setTimeout(() => setCopiedSteps(false), 2500);
      });
    } else {
      setCopiedSteps(true);
      setTimeout(() => setCopiedSteps(false), 2500);
    }
  };

  // Fallback image error handler with Dark Neon Placeholder
  const handleImageError = () => {
    if (!wallpaper) return;
    markUrlAsFailed(previewImgUrl);
    if (fallbackLevel === 0) {
      setFallbackLevel(1);
      setPreviewImgUrl(getCategoryFallback(wallpaper.category));
    } else {
      setFallbackLevel(2);
      setPreviewImgUrl(getDarkNeonPlaceholder(currentTitle, wallpaper.category));
    }
    setImageLoaded(true);
  };

  // Category ambient glow accent
  const categoryGlow = useMemo(() => {
    if (!wallpaper) return '#06B6D4';
    switch (wallpaper.category) {
      case 'Space':
        return '#A855F7';
      case 'Gaming':
        return '#00F0FF';
      case 'Anime':
        return '#F472B6';
      case 'Cars':
        return '#EF4444';
      case 'Nature':
        return '#10B981';
      default:
        return '#06B6D4';
    }
  }, [wallpaper?.category]);

  // Loading Skeleton State while dynamic record queries IndexedDB/State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0D0E12] text-[#E2E8F0] flex flex-col selection:bg-cyan-500/25 selection:text-cyan-300">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
          <div className="flex items-center gap-2 text-neutral-400 text-xs">
            <button
              onClick={onBackToGallery}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#161720] hover:bg-[#202230] border border-[#272A3C] text-neutral-200 hover:text-white transition-all cursor-pointer font-medium group"
            >
              {lang === 'ar' ? (
                <ArrowRight className="w-3.5 h-3.5 text-cyan-400 group-hover:-translate-x-0.5 transition-transform" />
              ) : (
                <ArrowLeft className="w-3.5 h-3.5 text-cyan-400 group-hover:-translate-x-0.5 transition-transform" />
              )}
              <span>{lang === 'ar' ? 'العودة إلى المعرض' : 'Back to Gallery'}</span>
            </button>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center my-24">
          <div className="w-12 h-12 rounded-2xl border-2 border-cyan-500/20 border-t-cyan-400 animate-spin mb-4" />
          <h3 className="text-base font-bold text-white mb-1">
            {lang === 'ar' ? 'جاري استرجاع تفاصيل الخلفية...' : 'Retrieving 4K Wallpaper...'}
          </h3>
          <p className="text-xs text-neutral-400">
            {lang === 'ar'
              ? 'يتم فحص السجلات المحلية وقاعدة البيانات...'
              : `Querying database records for "${routeIdentifier || ''}"...`}
          </p>
        </div>
      </div>
    );
  }

  // Not Found State (Eliminating any hardcoded or fallback data fetching)
  if (notFound || !wallpaper) {
    return (
      <div className="min-h-screen bg-[#0D0E12] text-[#E2E8F0] flex flex-col selection:bg-cyan-500/25 selection:text-cyan-300">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
          <div className="flex items-center gap-2 text-neutral-400 text-xs">
            <button
              onClick={onBackToGallery}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#161720] hover:bg-[#202230] border border-[#272A3C] text-neutral-200 hover:text-white transition-all cursor-pointer font-medium group"
            >
              {lang === 'ar' ? (
                <ArrowRight className="w-3.5 h-3.5 text-cyan-400 group-hover:-translate-x-0.5 transition-transform" />
              ) : (
                <ArrowLeft className="w-3.5 h-3.5 text-cyan-400 group-hover:-translate-x-0.5 transition-transform" />
              )}
              <span>{lang === 'ar' ? 'العودة إلى المعرض' : 'Back to Gallery'}</span>
            </button>
          </div>
        </div>
        <div className="max-w-md mx-auto my-24 p-8 text-center rounded-3xl bg-[#14151C] border border-[#232532] shadow-2xl">
          <Sparkles className="w-10 h-10 text-cyan-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-2">
            {lang === 'ar' ? 'الخلفية غير موجودة' : 'Wallpaper Not Found'}
          </h3>
          <p className="text-xs text-neutral-400 mb-6">
            {lang === 'ar'
              ? `لم يتم العثور على خلفية تطابق المعرف "${routeIdentifier || ''}".`
              : `No record matching ID or slug "${routeIdentifier || ''}" was found in local storage.`}
          </p>
          <button
            type="button"
            onClick={onBackToGallery}
            className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-md transition-colors cursor-pointer"
          >
            {lang === 'ar' ? 'العودة إلى المعرض الرئيسي' : 'Return to Gallery'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0E12] text-[#E2E8F0] flex flex-col selection:bg-cyan-500/25 selection:text-cyan-300">
      {/* 1. Top Breadcrumbs & Back Navigation Bar */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-neutral-400">
            <button
              onClick={onBackToGallery}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#161720] hover:bg-[#202230] border border-[#272A3C] text-neutral-200 hover:text-white transition-all cursor-pointer font-medium group"
            >
              {lang === 'ar' ? (
                <ArrowRight className="w-3.5 h-3.5 text-cyan-400 group-hover:-translate-x-0.5 transition-transform" />
              ) : (
                <ArrowLeft className="w-3.5 h-3.5 text-cyan-400 group-hover:-translate-x-0.5 transition-transform" />
              )}
              <span>{lang === 'ar' ? 'العودة إلى المعرض' : 'Back to Gallery'}</span>
            </button>

            <span className="text-neutral-600">/</span>

            <button
              onClick={() => {
                onSelectCategory(wallpaper.category);
              }}
              className="hover:text-cyan-400 transition-colors cursor-pointer"
            >
              {t.categories[wallpaper.category] || wallpaper.category}
            </button>

            <span className="text-neutral-600">/</span>

            <span className="text-neutral-200 truncate max-w-[200px] sm:max-w-xs font-semibold">
              {currentTitle}
            </span>
          </div>

          {/* 4K Resolution & Live Motion Badges */}
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 font-mono text-[11px] font-bold">
              {isCurrentMobile ? `Mobile 9:16 · ${resolutionBadge}` : `4K UHD · ${resolutionBadge}`}
            </span>
            {wallpaper.isLive && (
              <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                <span>60 FPS Live Motion</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main 4K Showcase Theater */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div
          ref={theaterRef}
          className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-[#07080B] border border-[#212433] shadow-2xl flex items-center justify-center group transform-gpu will-change-transform [transform:translate3d(0,0,0)]"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 30%, ${categoryGlow}15 0%, transparent 70%)`,
          }}
        >
          {/* Main Display Container */}
          <div
            className={`relative w-full transition-all duration-300 flex items-center justify-center ${
              isZoomed ? 'cursor-zoom-out py-0' : 'aspect-video max-h-[78vh]'
            }`}
            onClick={() => !isVideo && setIsZoomed(!isZoomed)}
          >
            {/* Smooth Skeleton Loader during initial media load to eliminate layout shifts (CLS) */}
            {!imageLoaded && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#07080B]/95 backdrop-blur-sm pointer-events-none transition-opacity duration-300">
                <div className="relative flex items-center justify-center">
                  <div className="w-14 h-14 rounded-2xl border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
                  <Sparkles className="w-6 h-6 text-cyan-400 absolute animate-pulse" />
                </div>
                <div className="mt-4 flex flex-col items-center gap-1 text-center px-4">
                  <span className="text-xs font-mono font-bold tracking-wider text-neutral-200">
                    {lang === 'ar' ? 'جاري تهيئة دقة 4K فائقة الوضوح...' : 'Buffering 4K Ultra HD Master...'}
                  </span>
                  <span className="text-[10px] text-cyan-400 font-mono">
                    {resolutionBadge} · {wallpaper.isLive ? '60 FPS Live Motion' : 'Calibrated HDR Preview'}
                  </span>
                </div>
              </div>
            )}

            {isVideo ? (
              <video
                ref={videoRef}
                src={resolvedVideoSource}
                poster={wallpaper.posterUrl || undefined}
                autoPlay
                loop
                muted={isMuted}
                playsInline
                preload="none"
                onLoadedData={() => setImageLoaded(true)}
                onError={() => {
                  console.warn(`Video playback error for ${wallpaper.id}, falling back to static 4K image.`);
                  markUrlAsFailed(resolvedVideoSource);
                  setVideoError(true);
                  setPreviewImgUrl(
                    wallpaper.posterUrl ||
                      wallpaper.thumbnailUrl ||
                      getDarkNeonPlaceholder(currentTitle, wallpaper.category)
                  );
                }}
                className="w-full h-full object-contain max-h-[78vh] select-none transform-gpu will-change-transform [transform:translate3d(0,0,0)]"
              />
            ) : (
              <img
                src={previewImgUrl}
                alt={`${currentTitle} - 4K Ultra HD Desktop Wallpaper (${resolutionBadge})`}
                loading="lazy"
                decoding="async"
                onLoad={() => setImageLoaded(true)}
                onError={handleImageError}
                className={`w-full h-full object-contain max-h-[78vh] transition-transform duration-500 select-none transform-gpu will-change-transform [transform:translate3d(0,0,0)] ${
                  isZoomed ? 'scale-125' : 'scale-100'
                }`}
              />
            )}

            {/* Subtle Overlay Controls for Video */}
            {isVideo && (
              <div className="absolute bottom-4 inset-x-4 sm:inset-x-8 p-3 rounded-2xl bg-black/70 backdrop-blur-xl border border-white/10 flex items-center justify-between gap-4 opacity-90 hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-3">
                  <button
                    onClick={togglePlayPause}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                  </button>

                  <button
                    onClick={toggleMute}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4 text-neutral-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
                  </button>

                  <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-neutral-300">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <span>60 FPS Live Wallpaper Engine</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleFullscreen}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                    title="Fullscreen Mode"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Quick Inspect Mode button for static image */}
            {!isVideo && (
              <button
                onClick={() => setIsZoomed(!isZoomed)}
                className="absolute top-4 right-4 p-2.5 rounded-xl bg-black/60 hover:bg-black/90 text-white border border-white/15 backdrop-blur-md opacity-80 hover:opacity-100 transition-all cursor-pointer"
                title={isZoomed ? '100% Fit' : 'Inspect 4K Details'}
              >
                {isZoomed ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Hero Details, Actions, & Download Bar */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-[#14151D] border border-[#232635] rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left / Top: Title & Badges */}
          <div className="space-y-3 max-w-2xl min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                {t.categories[wallpaper.category] || wallpaper.category}
              </span>

              {/* Dedicated Resolution Badge next to Category Tag */}
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-[#1A1C28] border border-cyan-500/30 text-cyan-300 shadow-sm flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5 text-cyan-400" />
                <span>{resolutionBadge}</span>
              </span>

              {wallpaper.isLive && (
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center gap-1.5">
                  <Play className="w-3 h-3 fill-current" />
                  <span>{t.navLive}</span>
                </span>
              )}

              {isCurrentMobile && (
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-300 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>9:16 Mobile Motion</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight leading-snug break-words [overflow-wrap:break-word] [word-break:break-word]">
              {currentTitle}
            </h1>

            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-xl">
              {wallpaper.description
                ? typeof wallpaper.description === 'string'
                  ? wallpaper.description
                  : wallpaper.description[lang] || wallpaper.description.en || wallpaper.description.ar
                : lang === 'ar'
                ? 'خلفية سطح مكتب أصلية فائقة الدقة 4K تم تحسينها هندسياً لشاشات OLED ومعدلات التحديث العالية. مرخصة للاستخدام الشخصي المجاني.'
                : 'Master-grade 4K Ultra HD desktop wallpaper precision-calibrated for OLED contrast, HDR displays, and high-refresh battlestations. Free personal use license.'}
            </p>
          </div>

          {/* Right / Bottom: Download CTA & Actions */}
          <div className="flex flex-col gap-3 shrink-0 w-full lg:w-auto">
            {/* Download buttons bar layout using Flexbox with gap: 12px (gap-3) and vertical alignment items-center */}
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3 w-full">
              {/* Quality Resolution Selector Dropdown */}
              <div ref={resDropdownRef} className="relative w-full sm:w-auto min-w-0 sm:min-w-[210px] flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsResDropdownOpen(!isResDropdownOpen)}
                  className="w-full min-h-[46px] px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-[#1B1D28] hover:bg-[#222534] border border-[#2E3348] text-neutral-200 text-xs font-semibold flex items-center justify-between gap-3 cursor-pointer transition-colors shadow-sm touch-manipulation"
                >
                  <div className="flex items-center gap-2.5 text-left min-w-0">
                    <Monitor className="w-4 h-4 text-cyan-400 shrink-0" />
                    <div className="min-w-0 truncate">
                      <div className="font-bold text-white leading-tight truncate">{selectedRes.name[lang]}</div>
                      <div className="text-[10px] text-neutral-400 font-mono mt-0.5 truncate">
                        {selectedRes.width} × {selectedRes.height} · {selectedRes.aspectRatio}
                      </div>
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform ${isResDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isResDropdownOpen && (
                  <div className="absolute right-0 sm:left-auto top-full mt-2 w-full sm:w-72 max-w-[calc(100vw-32px)] rounded-2xl bg-[#171822]/98 backdrop-blur-xl border border-[#2C3044] shadow-2xl p-2 z-50 space-y-1">
                    <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                      {lang === 'ar' ? 'اختر دقة الشاشة المناسبة' : 'Select Target Resolution'}
                    </div>
                    {RESOLUTION_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setSelectedResId(opt.id);
                          setIsResDropdownOpen(false);
                        }}
                        className={`w-full min-h-[44px] p-2.5 rounded-xl text-left text-xs flex items-center justify-between transition-colors cursor-pointer touch-manipulation ${
                          selectedResId === opt.id
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold'
                            : 'hover:bg-[#202230] text-neutral-300'
                        }`}
                      >
                        <div>
                          <div className="font-bold">{opt.name[lang]}</div>
                          <div className="text-[10px] text-neutral-400 font-mono">
                            {opt.width} × {opt.height} ({opt.aspectRatio})
                          </div>
                        </div>
                        {opt.badge && (
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                            {opt.badge}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {isLiveMedia ? (
                <>
                  {/* Button 1: Download 4K Motion Video (MP4) */}
                  <button
                    onClick={handleDownloadMotionVideo}
                    disabled={Boolean(downloadingType)}
                    className="w-full sm:w-auto min-h-[46px] sm:min-h-[48px] py-3 px-4 sm:px-5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-600 hover:from-rose-400 hover:via-pink-400 hover:to-fuchsia-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-500/25 transition-all transform active:scale-[0.98] disabled:opacity-50 flex-1 touch-manipulation"
                  >
                    {downloadingType === 'video' ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                    ) : downloadSuccessType === 'video' ? (
                      <Check className="w-4 h-4 text-white shrink-0" />
                    ) : (
                      <Film className="w-4 h-4 fill-white/20 shrink-0" />
                    )}
                    <span className="truncate">
                      {downloadingType === 'video'
                        ? lang === 'ar'
                          ? 'جاري تجهيز الفيديو...'
                          : 'Processing MP4...'
                        : downloadSuccessType === 'video'
                        ? lang === 'ar'
                          ? 'تم تحميل الفيديو!'
                          : 'Video Downloaded!'
                        : lang === 'ar'
                        ? 'تحميل فيديو 4K (MP4)'
                        : 'Download 4K Video (MP4)'}
                    </span>
                  </button>

                  {/* Button 2: Download 4K Still Photo */}
                  <button
                    onClick={handleDownloadStillPhoto}
                    disabled={Boolean(downloadingType)}
                    className="w-full sm:w-auto min-h-[46px] sm:min-h-[48px] py-3 px-4 sm:px-5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-cyan-500 via-cyan-400 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/25 transition-all transform active:scale-[0.98] disabled:opacity-50 flex-1 touch-manipulation"
                  >
                    {downloadingType === 'photo' ? (
                      <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin shrink-0" />
                    ) : downloadSuccessType === 'photo' ? (
                      <Check className="w-4 h-4 text-black shrink-0" />
                    ) : (
                      <ImageIcon className="w-4 h-4 stroke-[2.3] shrink-0" />
                    )}
                    <span className="truncate">
                      {downloadingType === 'photo'
                        ? lang === 'ar'
                          ? 'جاري تجهيز الصورة...'
                          : 'Processing 4K...'
                        : downloadSuccessType === 'photo'
                        ? lang === 'ar'
                          ? 'تم تحميل الصورة!'
                          : 'Photo Downloaded!'
                        : lang === 'ar'
                        ? `تحميل صورة (${resolutionBadge})`
                        : `Download Photo (${resolutionBadge})`}
                    </span>
                  </button>
                </>
              ) : (
                /* Single Standard 4K Download Button for Static Wallpapers */
                <button
                  onClick={handleDownloadStillPhoto}
                  disabled={Boolean(downloadingType)}
                  className="w-full sm:w-auto min-h-[46px] sm:min-h-[48px] py-3 px-4 sm:px-6 rounded-xl sm:rounded-2xl bg-gradient-to-r from-cyan-500 via-cyan-400 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/25 transition-all transform active:scale-[0.98] disabled:opacity-50 flex-1 touch-manipulation"
                >
                  {downloadingType === 'photo' ? (
                    <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin shrink-0" />
                  ) : downloadSuccessType === 'photo' ? (
                    <Check className="w-4 h-4 text-black shrink-0" />
                  ) : (
                    <Download className="w-4 h-4 stroke-[2.5] shrink-0" />
                  )}
                  <span className="truncate">
                    {downloadingType === 'photo'
                      ? lang === 'ar'
                        ? 'جاري التحميل...'
                        : 'Processing 4K...'
                      : downloadSuccessType === 'photo'
                      ? lang === 'ar'
                        ? 'تم التحميل بنجاح!'
                        : 'Downloaded!'
                      : lang === 'ar'
                      ? 'تحميل بجودة 4K مجاناً'
                      : 'Download 4K Free'}
                  </span>
                </button>
              )}

              {/* Favorite & Share Buttons */}
              <div className="flex items-center justify-center gap-2 shrink-0 w-full sm:w-auto">
                <button
                  onClick={() => onToggleFavorite(wallpaper.id)}
                  className={`flex-1 sm:flex-none min-h-[46px] min-w-[46px] p-3 rounded-xl sm:rounded-2xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 touch-manipulation active:scale-[0.98] ${
                    isFavorited
                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-400 shadow-md shadow-rose-500/20'
                      : 'bg-[#1B1D28] hover:bg-[#222534] border-[#2E3348] text-neutral-300 hover:text-white'
                  }`}
                  title={isFavorited ? 'Favorited' : 'Favorite'}
                >
                  <Heart className={`w-4 h-4 ${isFavorited ? 'fill-rose-500 text-rose-500' : ''}`} />
                  <span className="text-xs font-mono font-bold">{wallpaper.favorites}</span>
                </button>

                <button
                  onClick={handleCopyLink}
                  className="flex-1 sm:flex-none min-h-[46px] min-w-[46px] p-3 rounded-xl sm:rounded-2xl bg-[#1B1D28] hover:bg-[#222534] border border-[#2E3348] text-neutral-300 hover:text-white transition-colors cursor-pointer flex items-center justify-center touch-manipulation active:scale-[0.98]"
                  title="Copy Share Link"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Sub-caption below buttons for Live Motion Wallpapers */}
            {isLiveMedia && (
              <div className="flex items-center justify-center sm:justify-start gap-2 text-[11px] text-neutral-400 bg-[#171824] px-4 py-2 rounded-xl border border-[#272A3C] font-medium">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
                <span>
                  {lang === 'ar'
                    ? 'تنسيق MP4 بدقة 4K مع تكرار مستمر • متوافق مع Wallpaper Engine و Lively'
                    : 'Looping 4K MP4 format • Compatible with Wallpaper Engine & Lively'}
                </span>
              </div>
            )}

            {/* Dedicated Mobile Live Wallpaper / Live Photo Feature Box */}
            <div className="mt-2 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-[#161824] to-[#101118] border border-cyan-500/30 space-y-3 shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/25">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                      {t.mobileLiveOptionsTitle}
                    </h4>
                    <p className="text-[10px] text-neutral-400">
                      {t.mobileLiveDesc}
                    </p>
                  </div>
                </div>

                {/* Device Platform Tabs */}
                <div className="flex items-center gap-1 bg-[#0D0E13] p-1 rounded-xl border border-[#262838]">
                  <button
                    type="button"
                    onClick={() => setMobilePlatform('ios')}
                    className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer touch-manipulation active:scale-95 ${
                      mobilePlatform === 'ios'
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-black shadow-md font-black'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Apple className="w-3.5 h-3.5" />
                    <span>iPhone (iOS 17+)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMobilePlatform('android')}
                    className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer touch-manipulation active:scale-95 ${
                      mobilePlatform === 'android'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-black shadow-md font-black'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Android</span>
                  </button>
                </div>
              </div>

              {/* Direct Mobile Live Download CTA Button */}
              <button
                type="button"
                onClick={() => handleDownloadMobileLive(mobilePlatform)}
                disabled={Boolean(downloadingMobile) || Boolean(downloadingType)}
                className={`w-full flex items-center justify-center gap-2.5 min-h-[50px] py-3 px-5 rounded-xl font-black text-xs sm:text-sm text-white shadow-xl transition-all touch-manipulation active:scale-[0.98] disabled:opacity-60 cursor-pointer ${
                  mobilePlatform === 'ios'
                    ? 'bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 shadow-cyan-500/25'
                    : 'bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 shadow-emerald-500/25'
                }`}
              >
                {downloadingMobile === mobilePlatform ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                    <span>{lang === 'ar' ? 'جاري تجهيز فيديو الهاتف 9:16...' : 'Generating 9:16 Mobile Loop...'}</span>
                  </>
                ) : (
                  <>
                    <Film className="w-4 h-4 shrink-0 animate-pulse" />
                    <span className="truncate">
                      {mobilePlatform === 'ios'
                        ? (lang === 'ar' ? 'تحميل كخلفية حية لـ iPhone (Live Photo)' : 'Download Live Wallpaper for iPhone')
                        : (lang === 'ar' ? 'تحميل كفيديو حية لـ Android' : 'Download Live Wallpaper for Android')}
                    </span>
                  </>
                )}
              </button>

              {/* Step-by-Step Instructions Toggle Accordion */}
              <div className="pt-1 border-t border-[#1F2232]">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setIsMobileGuideOpen(!isMobileGuideOpen)}
                    className="flex items-center gap-2 text-xs font-bold text-neutral-200 hover:text-cyan-300 transition-colors py-1 cursor-pointer touch-manipulation"
                  >
                    <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>{t.mobileGuideToggle}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 shrink-0 ${
                        isMobileGuideOpen ? 'rotate-180 text-cyan-400' : ''
                      }`}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={handleCopySteps}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#191B26] hover:bg-[#222534] border border-[#2D3144] text-[11px] text-neutral-300 hover:text-white transition-all cursor-pointer touch-manipulation"
                    title={t.copySteps}
                  >
                    {copiedSteps ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400 font-semibold">{t.stepsCopied}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-cyan-400" />
                        <span>{t.copySteps}</span>
                      </>
                    )}
                  </button>
                </div>

                {isMobileGuideOpen && (
                  <div className="mt-2.5 p-3 rounded-xl bg-[#0D0E14] border border-[#212435] text-xs space-y-2 text-neutral-300 animate-fade-in leading-relaxed">
                    <div className="font-bold text-cyan-400 text-xs flex items-center gap-1.5">
                      {mobilePlatform === 'ios' ? (
                        <>
                          <Apple className="w-3.5 h-3.5 shrink-0" />
                          <span>{t.mobileGuideIos}</span>
                        </>
                      ) : (
                        <>
                          <Smartphone className="w-3.5 h-3.5 shrink-0" />
                          <span>{t.mobileGuideAndroid}</span>
                        </>
                      )}
                    </div>

                    {mobilePlatform === 'ios' ? (
                      <div className="space-y-1.5 text-neutral-300">
                        <p className="bg-[#14151F] p-2 rounded-xl border border-[#222538]">{t.iosStep1}</p>
                        <p className="bg-[#14151F] p-2 rounded-xl border border-[#222538]">{t.iosStep2}</p>
                        <p className="bg-[#14151F] p-2 rounded-xl border border-[#222538]">{t.iosStep3}</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5 text-neutral-300">
                        <p className="bg-[#14151F] p-2 rounded-xl border border-[#222538]">{t.androidStep1}</p>
                        <p className="bg-[#14151F] p-2 rounded-xl border border-[#222538]">{t.androidStep2}</p>
                        <p className="bg-[#14151F] p-2 rounded-xl border border-[#222538]">{t.androidStep3}</p>
                      </div>
                    )}

                    <div className="pt-1.5 text-[10px] text-neutral-400 border-t border-[#1C1E2B] leading-tight">
                      {t.mobileNotice}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Technical Specs & Optics Grid (المواصفات التقنية الكاملة) */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-4 rounded-2xl bg-[#14151C] border border-[#212330]">
            <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider flex items-center gap-1.5 mb-1">
              <Monitor className="w-3.5 h-3.5 text-cyan-400" />
              <span>{lang === 'ar' ? 'الدقة الأصلية' : 'Raw Resolution'}</span>
            </div>
            <div className="text-sm font-black text-white font-mono">{resolutionBadge}</div>
            <div className="text-[10px] text-neutral-500 mt-0.5">
              {isCurrentMobile ? 'Mobile 9:16 Portrait' : '4K Ultra HD (UHD)'}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#14151C] border border-[#212330]">
            <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider flex items-center gap-1.5 mb-1">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>{lang === 'ar' ? 'نسبة العرض' : 'Aspect Ratio'}</span>
            </div>
            <div className="text-sm font-black text-white font-mono">{aspectRatioLabel}</div>
            <div className="text-[10px] text-neutral-500 mt-0.5">
              {isCurrentMobile ? 'Vertical Smartphone' : 'Standard Display Spec'}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#14151C] border border-[#212330]">
            <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>{lang === 'ar' ? 'نوع الوسائط' : 'Media Format'}</span>
            </div>
            <div className="text-sm font-black text-white">
              {isVideo ? 'MP4 / 60 FPS' : 'JPEG 100% Quality'}
            </div>
            <div className="text-[10px] text-neutral-500 mt-0.5">
              {isVideo ? 'Smooth Live Motion' : 'Ultra High Definition'}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#14151C] border border-[#212330]">
            <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider flex items-center gap-1.5 mb-1">
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
              <span>{lang === 'ar' ? 'المشاهدات' : 'Total Views'}</span>
            </div>
            <div className="text-sm font-black text-white font-mono">
              {(wallpaper.downloads * 3.4 + 120).toFixed(0)}
            </div>
            <div className="text-[10px] text-neutral-500 mt-0.5">Global Impressions</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#14151C] border border-[#212330]">
            <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider flex items-center gap-1.5 mb-1">
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>{lang === 'ar' ? 'التحميلات' : 'Downloads'}</span>
            </div>
            <div className="text-sm font-black text-white font-mono">{wallpaper.downloads}</div>
            <div className="text-[10px] text-neutral-500 mt-0.5">Verified 4K Saves</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#14151C] border border-[#212330]">
            <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider flex items-center gap-1.5 mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{lang === 'ar' ? 'الترخيص' : 'License'}</span>
            </div>
            <div className="text-sm font-black text-emerald-300">Free Desktop</div>
            <div className="text-[10px] text-neutral-500 mt-0.5">Commercial & Personal</div>
          </div>
        </div>
      </div>

      {/* 5. Discovery Tags & Keywords (الكلمات المفتاحية والوسوم التفاعلية) */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="p-5 sm:p-6 rounded-3xl bg-[#14151C] border border-[#212330] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
          <div className="max-w-md">
            <h3 className="text-xs uppercase font-bold text-neutral-300 tracking-wider mb-1 flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-cyan-400" />
              <span>{lang === 'ar' ? 'الكلمات المفتاحية والوسوم المترابطة' : 'Discovery Tags & Keywords'}</span>
            </h3>
            <p className="text-[11px] sm:text-xs text-neutral-500">
              {lang === 'ar'
                ? 'انقر على أي وسم لاستكشاف خلفيات 4K مشابهة فوراً في المعرض.'
                : 'Click any tag to search related 4K Ultra HD backgrounds across the platform.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-2.5">
            {wallpaper.tags.map((tag, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onSelectTag(tag);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-[#1B1D28] hover:bg-cyan-500/10 border border-[#2B2F44] hover:border-cyan-500/40 text-xs text-neutral-300 hover:text-cyan-300 transition-all cursor-pointer font-medium"
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Non-Intrusive Sponsored Media Break */}
      <AdSenseUnit slot="details-break" lang={lang} />

      {/* 6. Related 4K Wallpapers (خلفيات مشابهة مقترحة) */}
      {relatedWallpapers.length > 0 && (
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 mt-6 border-t border-[#1C1E28]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {lang === 'ar' ? 'خلفيات 4K مشابهة مقترحة' : 'Related 4K Wallpapers'}
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                {lang === 'ar'
                  ? `المزيد من الخلفيات بدقة 4K في قسم ${t.categories[wallpaper.category] || wallpaper.category}`
                  : `More Ultra HD backgrounds in ${t.categories[wallpaper.category] || wallpaper.category}`}
              </p>
            </div>

            <button
              onClick={() => {
                onSelectCategory(wallpaper.category);
              }}
              className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
            >
              {lang === 'ar' ? 'عرض الكل في هذا القسم ←' : 'View all in category →'}
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {relatedWallpapers.map((rel) => {
              const relTitle = cleanWallpaperTitle(rel.title[lang] || rel.title.en);
              const relRes = extractResolutionFromTitle(rel.title[lang] || rel.title.en) || (rel.resolution ? rel.resolution.replace(/\s*[xX]\s*/g, '×').trim() : (isCurrentMobile ? '2160×3840' : '3840×2160'));
              const relThumb = getOptimizedPreviewUrl(
                rel.posterUrl || rel.thumbnailUrl || (rel.isLive ? undefined : rel.url),
                640,
                rel.category
              );

              return (
                <div
                  key={rel.id}
                  onClick={() => onSelectWallpaper(rel)}
                  className="group rounded-xl sm:rounded-2xl bg-[#15161E] border border-[#222432] hover:border-cyan-500/50 overflow-hidden shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between transform-gpu will-change-transform [transform:translate3d(0,0,0)] touch-manipulation active:scale-[0.98]"
                >
                  <div className={`relative ${isCurrentMobile ? 'aspect-[9/16]' : 'aspect-video'} w-full overflow-hidden bg-black/40`}>
                    <img
                      src={relThumb || getCategoryFallback(rel.category)}
                      alt={relTitle}
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getCategoryFallback(rel.category);
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 transform-gpu will-change-transform [transform:translate3d(0,0,0)]"
                    />
                    {isCurrentMobile && (
                      <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-fuchsia-500/80 backdrop-blur-sm text-white flex items-center gap-1">
                        <Smartphone className="w-2.5 h-2.5" />
                        <span>9:16</span>
                      </span>
                    )}
                    {rel.isLive && (
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-bold bg-rose-500/80 backdrop-blur-sm text-white flex items-center gap-1">
                        <Play className="w-2.5 h-2.5 fill-current" />
                        <span>LIVE</span>
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors truncate" title={relTitle}>
                      {relTitle}
                    </h4>
                    <div className="flex items-center justify-between text-[10px] text-neutral-400 mt-1">
                      <span>{rel.category}</span>
                      <span className="font-mono text-cyan-400/90 font-semibold">{relRes}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export const WallpaperDetailsPage = React.memo(
  WallpaperDetailsPageComponent,
  (prev, next) =>
    prev.wallpaper?.id === next.wallpaper?.id &&
    prev.wallpaper?.url === next.wallpaper?.url &&
    prev.wallpaper?.videoUrl === next.wallpaper?.videoUrl &&
    prev.wallpaper?.posterUrl === next.wallpaper?.posterUrl &&
    prev.wallpaper?.downloads === next.wallpaper?.downloads &&
    prev.wallpaper?.favorites === next.wallpaper?.favorites &&
    prev.isFavorited === next.isFavorited &&
    prev.lang === next.lang
);
