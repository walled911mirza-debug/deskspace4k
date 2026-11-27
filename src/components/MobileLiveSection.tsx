import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Smartphone,
  ChevronDown,
  Flame,
  Clock,
  Heart,
  Search,
  SlidersHorizontal,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Filter,
  Film,
  HelpCircle,
  Apple,
  Check,
  Info,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
} from 'lucide-react';
import { Wallpaper, Language } from '../types';
import { translations } from '../translations';
import { WallpaperCard } from './WallpaperCard';
import { ErrorBoundary } from './ErrorBoundary';
import { Pagination } from './Pagination';
import { EmptyState } from './EmptyState';
import { AdSenseUnit } from './AdSenseUnit';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  fetchWallpapersBatchFromSupabase,
  WALLPAPERS_BATCH_SIZE,
} from '../lib/wallpapersService';

interface MobileLiveSectionProps {
  wallpapers: Wallpaper[];
  lang: Language;
  activeFavorites: string[];
  onToggleFavorite: (id: string) => void;
  onOpenDownloadModal: (wallpaper: Wallpaper) => void;
  onOpenDetails: (wallpaper: Wallpaper) => void;
  onBackToDesktop: () => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export const MobileLiveSection: React.FC<MobileLiveSectionProps> = ({
  wallpapers,
  lang,
  activeFavorites,
  onToggleFavorite,
  onOpenDownloadModal,
  onOpenDetails,
  onBackToDesktop,
  isLoading = false,
  error = null,
  onRetry,
}) => {
  const [resFilter, setResFilter] = useState<'all' | '4k' | 'fhd'>('all');
  const [topicFilter, setTopicFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'popular' | 'latest' | 'favorites'>('popular');
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(WALLPAPERS_BATCH_SIZE);
  const [mobileBatchItems, setMobileBatchItems] = useState<Wallpaper[]>([]);
  const [mobileTotalCount, setMobileTotalCount] = useState<number>(0);
  const [mobileHasMore, setMobileHasMore] = useState<boolean>(false);
  const [mobileLoadedThroughPage, setMobileLoadedThroughPage] = useState<number>(1);
  const [localLoading, setLocalLoading] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const mobileGridTopRef = React.useRef<HTMLDivElement>(null);

  const t = translations[lang];

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadMobileBatch = useCallback(
    async (pageNum: number, append: boolean = false) => {
      if (!isSupabaseConfigured) {
        setMobileBatchItems([]);
        setMobileTotalCount(0);
        setMobileHasMore(false);
        setLocalError(null);
        return;
      }

      if (append) {
        setLoadingMore(true);
      } else {
        setLocalLoading(true);
      }
      setLocalError(null);

      try {
        const res = await fetchWallpapersBatchFromSupabase({
          page: pageNum,
          limit: itemsPerPage || WALLPAPERS_BATCH_SIZE,
          deviceFormat: 'mobile',
          category: topicFilter === 'all' ? 'All' : topicFilter,
          sortBy,
          searchQuery: debouncedSearchQuery,
        });

        if (!res.configured) {
          setMobileBatchItems([]);
          setMobileTotalCount(0);
          setMobileHasMore(false);
          setLocalError(null);
          return;
        }

        if (res.error) {
          setLocalError(res.error);
          return;
        }

        setMobileTotalCount(res.totalCount);
        setMobileHasMore(res.hasMore);
        setMobileLoadedThroughPage(pageNum);

        if (append) {
          setMobileBatchItems((prev) => {
            const existingIds = new Set(prev.map((w) => w.id));
            const uniqueNew = res.wallpapers.filter((w) => !existingIds.has(w.id));
            return [...prev, ...uniqueNew];
          });
        } else {
          setMobileBatchItems(res.wallpapers);
        }
      } catch (err: any) {
        setLocalError(err?.message || 'Unable to fetch mobile wallpapers from Supabase.');
      } finally {
        setLocalLoading(false);
        setLoadingMore(false);
      }
    },
    [itemsPerPage, topicFilter, sortBy, debouncedSearchQuery]
  );

  // Fetch active batch when page, limit, topic, sort, or search changes
  useEffect(() => {
    loadMobileBatch(currentPage, false);
  }, [loadMobileBatch, currentPage]);

  const handleLoadMoreMobile = useCallback(() => {
    if (loadingMore || localLoading || !mobileHasMore) return;
    loadMobileBatch(mobileLoadedThroughPage + 1, true);
  }, [loadingMore, localLoading, mobileHasMore, loadMobileBatch, mobileLoadedThroughPage]);

  // Topics available for mobile wallpapers
  const TOPICS = [
    { id: 'all', label: t.allTopics || (lang === 'ar' ? 'جميع المواضيع' : 'All Topics') },
    { id: 'Gaming', label: t.categories.Gaming },
    { id: 'Anime', label: t.categories.Anime },
    { id: 'Space', label: t.categories.Space },
    { id: 'Nature', label: t.categories.Nature },
    { id: 'Cars', label: t.categories.Cars },
    { id: 'Minimalist', label: t.categories.Minimalist },
  ];

  // Combine session-added mobile items with server-fetched batch (or prop list when unconfigured)
  const sourceWallpapers = useMemo(() => {
    const propList = Array.isArray(wallpapers) ? wallpapers : [];
    if (!isSupabaseConfigured) {
      return propList;
    }
    const batchIds = new Set(mobileBatchItems.map((w) => w.id));
    const extraSessionItems = propList.filter((w) => w && w.id && !batchIds.has(w.id));
    return [...extraSessionItems, ...mobileBatchItems];
  }, [wallpapers, mobileBatchItems]);

  // Filter & Sort Mobile Wallpapers
  const filteredWallpapers = useMemo(() => {
    let result = [...sourceWallpapers];

    // 1. Resolution filter
    if (resFilter === '4k') {
      result = result.filter(
        (w) =>
          (w.height || 0) >= 2160 ||
          (w.width || 0) >= 2160 ||
          (w.resolution || '').includes('2160') ||
          (w.resolution || '').includes('4K')
      );
    } else if (resFilter === 'fhd') {
      result = result.filter(
        (w) =>
          (w.width === 1080 && w.height === 1920) ||
          (w.resolution || '').includes('1080') ||
          (w.resolution || '').includes('FHD')
      );
    }

    // 2. Topic / Genre filter
    if (topicFilter !== 'all') {
      const tf = topicFilter.toLowerCase();
      result = result.filter((w) => {
        const cat = (w.category || '').toLowerCase();
        const tags = (Array.isArray(w.tags) ? w.tags : []).map((t) => String(t).toLowerCase());
        const titleEn = (w.title?.en || '').toLowerCase();
        const titleAr = (w.title?.ar || '').toLowerCase();
        return cat === tf || tags.includes(tf) || titleEn.includes(tf) || titleAr.includes(tf);
      });
    }

    // 3. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((w) => {
        const titleEn = (w.title?.en || '').toLowerCase();
        const titleAr = (w.title?.ar || '').toLowerCase();
        const cat = (w.category || '').toLowerCase();
        const tags = (Array.isArray(w.tags) ? w.tags : []).join(' ').toLowerCase();
        return titleEn.includes(q) || titleAr.includes(q) || cat.includes(q) || tags.includes(q);
      });
    }

    // 4. Sort (client fallback when unconfigured)
    if (!isSupabaseConfigured) {
      result.sort((a, b) => {
        if (sortBy === 'popular') return (Number(b.downloads) || 0) - (Number(a.downloads) || 0);
        if (sortBy === 'favorites') return (Number(b.favorites) || 0) - (Number(a.favorites) || 0);
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
    }

    return result;
  }, [sourceWallpapers, resFilter, topicFilter, searchQuery, sortBy]);

  // Reset to page 1 whenever mobile filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [resFilter, topicFilter, debouncedSearchQuery, sortBy]);

  const effectiveMobileTotal = isSupabaseConfigured
    ? resFilter === 'all'
      ? Math.max(mobileTotalCount, filteredWallpapers.length)
      : filteredWallpapers.length
    : filteredWallpapers.length;
  const totalPages = Math.max(1, Math.ceil(effectiveMobileTotal / itemsPerPage));

  useEffect(() => {
    if (!localLoading && currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [localLoading, currentPage, totalPages]);

  const displayedWallpapers = useMemo(() => {
    if (isSupabaseConfigured) {
      return filteredWallpapers;
    }
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredWallpapers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredWallpapers, currentPage, itemsPerPage]);

  const effectiveLoading = isSupabaseConfigured ? localLoading : isLoading;
  const effectiveError = isSupabaseConfigured ? localError : error;

  const handleClearFilters = () => {
    setResFilter('all');
    setTopicFilter('all');
    setSearchQuery('');
    setSortBy('popular');
    setCurrentPage(1);
  };

  return (
    <div className="w-full min-h-screen bg-[#0E0F14] text-neutral-100 pb-16">
      {/* 1. Header Atmosphere & Breadcrumb navigation */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[#181126] via-[#120F1D] to-[#0E0F14] border-b border-fuchsia-500/20 pt-8 pb-10 px-4 sm:px-6 lg:px-8">
        {/* Ambient background glow orbs */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-fuchsia-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-10 left-10 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Breadcrumb / Return to Desktop */}
          <div className="flex items-center justify-between mb-6">
            <button
              type="button"
              onClick={onBackToDesktop}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#1C172C] hover:bg-[#271F3E] text-fuchsia-300 hover:text-white border border-fuchsia-500/30 text-xs font-bold transition-all shadow-sm cursor-pointer group"
            >
              {lang === 'ar' ? (
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              ) : (
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              )}
              <span>
                {lang === 'ar' ? 'العودة لخلفيات سطح المكتب 16:9' : 'Back to Desktop 16:9 Feed'}
              </span>
            </button>

            <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-400">
              <span className="w-2 h-2 rounded-full bg-fuchsia-400 animate-ping" />
              <span className="text-fuchsia-300 font-semibold">
                {lang === 'ar' ? 'قسم الهواتف الذكية المستقل' : 'Independent Mobile Hub'}
              </span>
            </div>
          </div>

          {/* Hero Content */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-300 text-xs font-semibold mb-3">
                <Smartphone className="w-3.5 h-3.5 text-fuchsia-400" />
                <span>{t.badgeMobileLive || 'Mobile Live Wallpapers 60 FPS'}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 animate-pulse" />
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
                {t.mobileLiveHeading || 'Mobile Live Wallpapers (9:16)'}
              </h1>

              <p className="text-xs sm:text-sm text-neutral-300 mt-2 max-w-2xl leading-relaxed">
                {t.mobileLiveSub ||
                  'Ultra-smooth 60 FPS vertical live wallpapers engineered specifically for modern smartphone lockscreens and home screens (iPhone & Android).'}
              </p>
            </div>

            {/* Quick Search Input within Mobile View */}
            <div className="w-full lg:w-80 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-fuchsia-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    lang === 'ar' ? 'ابحث في خلفيات الهاتف...' : 'Search mobile wallpapers...'
                  }
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#151224] border border-fuchsia-500/30 text-white placeholder-neutral-500 text-xs focus:outline-none focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-500/30 transition-all shadow-inner"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-xs"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Informative Guide Banner for Mobile Live Wallpapers */}
          <div className="mt-6 p-4 rounded-2xl bg-[#171329]/80 border border-fuchsia-500/25 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-300 shrink-0">
                  <Film className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                    <span>{lang === 'ar' ? 'كيف تعمل خلفيات الهاتف الحية؟' : 'How iPhone Live Photos & Android Video Wallpapers Work'}</span>
                  </h3>
                  <p className="text-[11px] text-neutral-300 mt-0.5 leading-snug">
                    {lang === 'ar'
                      ? 'جميع خلفيات هذا القسم مجهزة بحلقات فيديو عمودية 60 FPS (9:16) جاهزة للتعيين المباشر كشاشة قفل حية.'
                      : 'All wallpapers here are precision-encoded 9:16 60 FPS loops compatible natively with iOS 17/18 and Android lock screens.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsGuideOpen(!isGuideOpen)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-fuchsia-500/20 hover:bg-fuchsia-500/30 border border-fuchsia-500/40 text-fuchsia-200 text-xs font-bold transition-all cursor-pointer touch-manipulation min-h-[38px] shrink-0"
              >
                <HelpCircle className="w-3.5 h-3.5 text-fuchsia-300" />
                <span>{isGuideOpen ? (lang === 'ar' ? 'إخفاء الدليل' : 'Hide Guide') : t.mobileGuideToggle}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isGuideOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {isGuideOpen && (
              <div className="mt-3 pt-3 border-t border-fuchsia-500/20 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs animate-fade-in">
                <div className="p-3 rounded-xl bg-[#110D20] border border-fuchsia-500/20 space-y-1.5">
                  <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                    <Apple className="w-4 h-4 text-cyan-400" />
                    <span>{t.mobileGuideIos}</span>
                  </div>
                  <p className="text-[11px] text-neutral-300">{t.iosStep1}</p>
                  <p className="text-[11px] text-neutral-300">{t.iosStep2}</p>
                  <p className="text-[11px] text-neutral-300">{t.iosStep3}</p>
                </div>

                <div className="p-3 rounded-xl bg-[#110D20] border border-fuchsia-500/20 space-y-1.5">
                  <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <span>{t.mobileGuideAndroid}</span>
                  </div>
                  <p className="text-[11px] text-neutral-300">{t.androidStep1}</p>
                  <p className="text-[11px] text-neutral-300">{t.androidStep2}</p>
                  <p className="text-[11px] text-neutral-300">{t.androidStep3}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Interactive Filter Toolbar (Topic Pills + Resolution Dropdown + Sort) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#211E2F]">
          {/* Topic Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar touch-manipulation">
            {TOPICS.map((topic) => (
              <button
                key={topic.id}
                type="button"
                onClick={() => setTopicFilter(topic.id)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer min-h-[38px] ${
                  topicFilter === topic.id
                    ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-md shadow-fuchsia-500/25 border border-fuchsia-400/40 font-bold'
                    : 'bg-[#171424] text-neutral-400 hover:text-white hover:bg-[#201C32] border border-[#2B2642]'
                }`}
              >
                {topic.label}
              </button>
            ))}
          </div>

          {/* Controls: Resolution Dropdown & Sort Bar */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Resolution Selector */}
            <div className="relative">
              <select
                aria-label={t.filterResolution}
                value={resFilter}
                onChange={(e) => setResFilter(e.target.value as 'all' | '4k' | 'fhd')}
                className="appearance-none bg-[#171424] text-xs font-semibold text-fuchsia-200 pl-3 pr-8 py-2 rounded-xl border border-fuchsia-500/30 hover:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 cursor-pointer shadow-md"
              >
                <option value="all">{t.allResolutions || 'All Mobile Resolutions'}</option>
                <option value="4k">{t.res4KMobile || '4K Vertical (2160×3840)'}</option>
                <option value="fhd">{t.resFHDMobile || 'FHD Vertical (1080×1920)'}</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-fuchsia-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Sort Segment */}
            <div className="flex items-center p-1 bg-[#171424] rounded-xl border border-[#2B2642] text-xs">
              <button
                type="button"
                onClick={() => setSortBy('popular')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  sortBy === 'popular'
                    ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>{t.sortPopular}</span>
              </button>

              <button
                type="button"
                onClick={() => setSortBy('latest')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  sortBy === 'latest'
                    ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{t.sortLatest}</span>
              </button>

              <button
                type="button"
                onClick={() => setSortBy('favorites')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  sortBy === 'favorites'
                    ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Heart className="w-3.5 h-3.5" />
                <span>{t.sortFavorites}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Results summary bar */}
        <div className="flex items-center justify-between text-xs text-neutral-400 mt-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white font-mono">{effectiveMobileTotal}</span>
            <span>{lang === 'ar' ? 'خلفية هاتف رأسية متوفرة' : 'mobile live wallpapers available'}</span>
            {searchQuery && (
              <span>
                {' '}
                {lang === 'ar' ? 'تطابق' : 'matching'} &ldquo;
                <span className="text-fuchsia-300 font-semibold">{searchQuery}</span>&rdquo;
              </span>
            )}
          </div>

          {(resFilter !== 'all' || topicFilter !== 'all' || searchQuery) && (
            <button
              onClick={handleClearFilters}
              className="text-xs text-fuchsia-400 hover:text-fuchsia-300 underline cursor-pointer"
            >
              {t.clearFilters || (lang === 'ar' ? 'إعادة ضبط الفلاتر' : 'Reset filters')}
            </button>
          )}
        </div>
      </div>

      {/* 3. Dedicated 9:16 Portrait Wallpaper Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div ref={mobileGridTopRef} className="scroll-mt-28" />

        {effectiveError && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{effectiveError}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (isSupabaseConfigured) loadMobileBatch(currentPage, false);
                else if (onRetry) onRetry();
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-bold text-xs cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}</span>
            </button>
          </div>
        )}

        {effectiveLoading && displayedWallpapers.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-5">
            {Array.from({ length: 12 }).map((_, idx) => (
              <div
                key={idx}
                className="rounded-xl sm:rounded-2xl bg-[#16171E] border border-[#242634] overflow-hidden animate-pulse"
              >
                <div className="aspect-[9/16] bg-[#12131A]" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-[#222432] rounded w-3/4" />
                  <div className="h-2.5 bg-[#1D1F2B] rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredWallpapers.length === 0 ? (
          <EmptyState
            mode="mobile"
            lang={lang}
            isFilterEmpty={Boolean(searchQuery.trim() || resFilter !== 'all' || topicFilter !== 'all')}
            searchQuery={searchQuery}
            onClearFilters={handleClearFilters}
            onBackToDesktop={onBackToDesktop}
            onOpenAdmin={() => {
              window.location.href = '/secret-admin';
            }}
          />
        ) : (
          <ErrorBoundary
            isSection
            fallbackTitle={lang === 'ar' ? 'معرض خلفيات الهاتف' : 'Mobile Live Wallpapers Grid'}
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-5">
              {displayedWallpapers.map((wallpaper) => (
                <WallpaperCard
                  key={wallpaper.id}
                  wallpaper={wallpaper}
                  lang={lang}
                  isFavorited={activeFavorites.includes(wallpaper.id)}
                  onToggleFavorite={onToggleFavorite}
                  onOpenDownloadModal={onOpenDownloadModal}
                  onOpenDetails={onOpenDetails}
                />
              ))}
            </div>
          </ErrorBoundary>
        )}

        {/* Load More Mobile Wallpapers (+24) */}
        {isSupabaseConfigured && mobileHasMore && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={handleLoadMoreMobile}
              disabled={loadingMore}
              className="inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-2xl bg-[#171326] hover:bg-[#221B3A] border border-fuchsia-500/40 hover:border-fuchsia-400 text-fuchsia-200 hover:text-white text-xs sm:text-sm font-black shadow-lg shadow-fuchsia-500/10 transition-all cursor-pointer disabled:opacity-60"
            >
              {loadingMore ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-fuchsia-400" />
                  <span>{lang === 'ar' ? 'جاري تحميل الدفعة التالية...' : 'Loading next 24 mobile wallpapers...'}</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 text-fuchsia-400" />
                  <span>
                    {lang === 'ar'
                      ? `تحميل المزيد (+24) · المعروض ${displayedWallpapers.length} من ${effectiveMobileTotal}`
                      : `Load More Mobile Wallpapers (+24) · ${displayedWallpapers.length} of ${effectiveMobileTotal}`}
                  </span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Traditional High-Performance Pagination */}
        {effectiveMobileTotal > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={effectiveMobileTotal}
            itemsPerPage={itemsPerPage}
            onPageChange={(page) => setCurrentPage(page)}
            onItemsPerPageChange={(limit) => {
              setItemsPerPage(limit);
              setCurrentPage(1);
            }}
            lang={lang}
            itemsPerPageOptions={[12, 24, 36]}
            variant="fuchsia"
            scrollTargetRef={mobileGridTopRef}
          />
        )}

        {/* Non-Intrusive Sponsored Media Break for Mobile View */}
        <AdSenseUnit slot="gallery-break" lang={lang} />
      </div>
    </div>
  );
};
