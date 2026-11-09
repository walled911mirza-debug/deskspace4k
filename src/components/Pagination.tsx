import React, { useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  SlidersHorizontal,
} from 'lucide-react';
import { Language } from '../types';
import { translations } from '../translations';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  lang: Language;
  itemsPerPageOptions?: number[];
  variant?: 'cyan' | 'fuchsia';
  scrollTargetRef?: React.RefObject<HTMLElement | null>;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  lang,
  itemsPerPageOptions = [12, 24, 36, 48],
  variant = 'cyan',
  scrollTargetRef,
}) => {
  const t = translations[lang];
  const isRTL = lang === 'ar';

  // Calculate start & end item indices for the badge
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(totalItems, currentPage * itemsPerPage);

  // Smooth scroll handler to reset scroll to top of grid on page transition
  const handlePageClick = (page: number) => {
    if (page === currentPage || page < 1 || page > totalPages) return;
    onPageChange(page);

    if (scrollTargetRef?.current) {
      scrollTargetRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (typeof window !== 'undefined') {
      const galleryAnchor = document.getElementById('wallpaper-gallery-top');
      if (galleryAnchor) {
        galleryAnchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  // Generate page numbers with ellipsis
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | 'ellipsis')[] = [];

    if (currentPage <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push('ellipsis');
      pages.push(totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1);
      pages.push('ellipsis');
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push('ellipsis');
      pages.push(currentPage - 1);
      pages.push(currentPage);
      pages.push(currentPage + 1);
      pages.push('ellipsis');
      pages.push(totalPages);
    }

    return pages;
  }, [currentPage, totalPages]);

  // Color theme classes based on variant (Cyan for desktop feed, Fuchsia for mobile hub)
  const isFuchsia = variant === 'fuchsia';

  const activeBtnClasses = isFuchsia
    ? 'bg-fuchsia-600 text-white font-bold border-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.4)]'
    : 'bg-cyan-500 text-black font-black border-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.4)]';

  const idleBtnClasses = isFuchsia
    ? 'bg-[#151222] text-neutral-300 hover:text-white hover:bg-[#211B35] border-[#2E2548] hover:border-fuchsia-500/40'
    : 'bg-[#161720] text-neutral-300 hover:text-white hover:bg-[#20222D] border-[#292B3A] hover:border-cyan-500/40';

  const disabledBtnClasses =
    'bg-[#12131A] text-neutral-600 border-[#1E202B] cursor-not-allowed opacity-50 shadow-none';

  const accentTextClasses = isFuchsia ? 'text-fuchsia-400' : 'text-cyan-400';

  if (totalItems === 0) return null;

  return (
    <nav
      aria-label="Wallpaper pagination"
      className="w-full mt-10 pt-6 pb-2 border-t border-[#1F212D] flex flex-col gap-5 sm:gap-6 items-center"
    >
      {/* 1. Top Bar: Summary count & Items-per-page selector */}
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        {/* Results counter */}
        <div className="text-neutral-400 font-medium flex items-center gap-1.5">
          <span>{t.paginationShowing || (lang === 'ar' ? 'عرض' : 'Showing')}</span>
          <span className={`font-mono font-bold ${accentTextClasses}`}>
            {startItem} - {endItem}
          </span>
          <span>{t.paginationOf || (lang === 'ar' ? 'من' : 'of')}</span>
          <span className="font-mono font-bold text-white">{totalItems}</span>
          <span>{t.paginationWallpapers || (lang === 'ar' ? 'خلفية' : 'wallpapers')}</span>
        </div>

        {/* Items per page selector */}
        {onItemsPerPageChange && (
          <div className="flex items-center gap-2">
            <span className="text-neutral-400 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{t.paginationPerPage || (lang === 'ar' ? 'لكل صفحة:' : 'Per page:')}</span>
            </span>
            <div className="flex items-center p-0.5 bg-[#14151D] rounded-xl border border-[#262836]">
              {itemsPerPageOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onItemsPerPageChange(opt)}
                  className={`px-2.5 py-1 text-xs font-mono rounded-lg transition-all cursor-pointer ${
                    itemsPerPage === opt
                      ? isFuchsia
                        ? 'bg-fuchsia-600 text-white font-bold shadow-sm'
                        : 'bg-cyan-500 text-black font-bold shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  aria-label={`${opt} items per page`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. Main Navigation Buttons Bar */}
      <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2 max-w-full">
        {/* First Page Button */}
        <button
          type="button"
          onClick={() => handlePageClick(1)}
          disabled={currentPage === 1}
          aria-label="First page"
          title={t.paginationFirst || (lang === 'ar' ? 'البداية' : 'First')}
          className={`hidden sm:flex h-9 px-3 rounded-xl border text-xs font-medium items-center gap-1 transition-all cursor-pointer touch-manipulation active:scale-95 ${
            currentPage === 1 ? disabledBtnClasses : idleBtnClasses
          }`}
        >
          {isRTL ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
          <span className="hidden md:inline">{t.paginationFirst || (lang === 'ar' ? 'البداية' : 'First')}</span>
        </button>

        {/* Previous Page Button */}
        <button
          type="button"
          onClick={() => handlePageClick(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
          title={t.paginationPrev || (lang === 'ar' ? 'السابق' : 'Previous')}
          className={`h-9 px-2.5 sm:px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1 transition-all cursor-pointer min-w-[38px] touch-manipulation active:scale-95 ${
            currentPage === 1 ? disabledBtnClasses : idleBtnClasses
          }`}
        >
          {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          <span className="hidden sm:inline">{t.paginationPrev || (lang === 'ar' ? 'السابق' : 'Previous')}</span>
        </button>

        {/* Numbered Page Buttons & Ellipsis */}
        <div className="flex items-center gap-1 sm:gap-1.5 mx-0.5 overflow-x-auto max-w-full no-scrollbar py-0.5" dir="ltr">
          {pageNumbers.map((p, idx) => {
            if (p === 'ellipsis') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="w-6 sm:w-8 h-9 flex items-center justify-center text-neutral-500 font-mono text-xs sm:text-sm select-none"
                >
                  &hellip;
                </span>
              );
            }

            const isCurrent = p === currentPage;
            return (
              <button
                key={`page-${p}`}
                type="button"
                onClick={() => handlePageClick(p)}
                aria-current={isCurrent ? 'page' : undefined}
                aria-label={`Page ${p}`}
                className={`w-8 sm:w-9 h-9 rounded-xl border text-xs font-mono flex items-center justify-center transition-all cursor-pointer touch-manipulation active:scale-95 shrink-0 ${
                  isCurrent ? activeBtnClasses : idleBtnClasses
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next Page Button */}
        <button
          type="button"
          onClick={() => handlePageClick(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
          title={t.paginationNext || (lang === 'ar' ? 'التالي' : 'Next')}
          className={`h-9 px-2.5 sm:px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1 transition-all cursor-pointer min-w-[38px] touch-manipulation active:scale-95 ${
            currentPage >= totalPages ? disabledBtnClasses : idleBtnClasses
          }`}
        >
          <span className="hidden sm:inline">{t.paginationNext || (lang === 'ar' ? 'التالي' : 'Next')}</span>
          {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {/* Last Page Button */}
        <button
          type="button"
          onClick={() => handlePageClick(totalPages)}
          disabled={currentPage >= totalPages}
          aria-label="Last page"
          title={t.paginationLast || (lang === 'ar' ? 'الأخيرة' : 'Last')}
          className={`hidden sm:flex h-9 px-3 rounded-xl border text-xs font-medium items-center gap-1 transition-all cursor-pointer touch-manipulation active:scale-95 ${
            currentPage >= totalPages ? disabledBtnClasses : idleBtnClasses
          }`}
        >
          <span className="hidden md:inline">{t.paginationLast || (lang === 'ar' ? 'الأخيرة' : 'Last')}</span>
          {isRTL ? <ChevronsLeft className="w-4 h-4" /> : <ChevronsRight className="w-4 h-4" />}
        </button>
      </div>

      {/* 3. Mobile Compact Indicator */}
      <div className="sm:hidden text-[11px] font-mono text-neutral-500">
        {lang === 'ar'
          ? `صفحة ${currentPage} من أصل ${totalPages}`
          : `Page ${currentPage} of ${totalPages}`}
      </div>
    </nav>
  );
};
