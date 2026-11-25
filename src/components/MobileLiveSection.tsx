import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { Wallpaper, Language } from '../types';
import { translations } from '../translations';
import { WallpaperCard } from './WallpaperCard';
import { ErrorBoundary } from './ErrorBoundary';
import { Pagination } from './Pagination';
import { EmptyState } from './EmptyState';
import { AdSenseUnit } from './AdSenseUnit';

interface MobileLiveSectionProps {
  wallpapers: Wallpaper[];
  lang: Language;
  activeFavorites: string[];
  onToggleFavorite: (id: string) => void;
  onOpenDownloadModal: (wallpaper: Wallpaper) => void;
  onOpenDetails: (wallpaper: Wallpaper) => void;
  onBackToDesktop: () => void;
}

export const MobileLiveSection: React.FC<MobileLiveSectionProps> = ({
  wallpapers,
  lang,
  activeFavorites,
  onToggleFavorite,
  onOpenDownloadModal,
  onOpenDetails,
  onBackToDesktop,
}) => {
  const [resFilter, setResFilter] = useState<'all' | '4k' | 'fhd'>('all');
  const [topicFilter, setTopicFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'popular' | 'latest' | 'favorites'>('popular');
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const t = translations[lang];

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

  // Filter & Sort Mobile Wallpapers
  const filteredWallpapers = useMemo(() => {
    let result = [...wallpapers];

    // 1. Resolution filter
    if (resFilter === '4k') {
      result = result.filter(
        (w) =>
          w.height >= 2160 ||
          w.width >= 2160 ||
          w.resolution.includes('2160') ||
          w.resolution.includes('4K')
      );
    } else if (resFilter === 'fhd') {
      result = result.filter(
        (w) =>
          (w.width === 1080 && w.height === 1920) ||
          w.resolution.includes('1080') ||
          w.resolution.includes('FHD')
      );
    }

    // 2. Topic / Genre filter
    if (topicFilter !== 'all') {
      const tf = topicFilter.toLowerCase();
      result = result.filter((w) => {
        const cat = (w.category || '').toLowerCase();
        const tags = (w.tags || []).map((t) => t.toLowerCase());
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
        const tags = (w.tags || []).join(' ').toLowerCase();
        return titleEn.includes(q) || titleAr.includes(q) || cat.includes(q) || tags.includes(q);
      });
    }

    // 4. Sort
    result.sort((a, b) => {
      if (sortBy === 'popular') return b.downloads - a.downloads;
      if (sortBy === 'favorites') return b.favorites - a.favorites;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [wallpapers, resFilter, topicFilter, searchQuery, sortBy]);

  // Traditional High-Performance Pagination for Mobile Live Hub
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(18);
  const mobileGridTopRef = React.useRef<HTMLDivElement>(null);

  // Reset to page 1 whenever mobile filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [resFilter, topicFilter, searchQuery, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredWallpapers.length / itemsPerPage));

  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Memory hygiene: render ONLY the active page's elements into the DOM
  const displayedWallpapers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredWallpapers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredWallpapers, currentPage, itemsPerPage]);

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
            <span className="font-bold text-white font-mono">{filteredWallpapers.length}</span>
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
        {filteredWallpapers.length === 0 ? (
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

        {/* Traditional High-Performance Pagination */}
        {filteredWallpapers.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredWallpapers.length}
            itemsPerPage={itemsPerPage}
            onPageChange={(page) => setCurrentPage(page)}
            onItemsPerPageChange={(limit) => {
              setItemsPerPage(limit);
              setCurrentPage(1);
            }}
            lang={lang}
            itemsPerPageOptions={[12, 18, 24, 36]}
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
