import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Sparkles,
  Monitor,
  ShieldCheck,
  Download,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  Clock,
  History,
  X,
  Trash2,
} from 'lucide-react';
import { Language, Category } from '../types';
import { translations } from '../translations';
import { useRecentSearches } from '../hooks/useRecentSearches';

interface HeroSectionProps {
  lang: Language;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectTag: (tag: string) => void;
  onSelectCategory: (cat: Category) => void;
  onOpenBlog?: () => void;
}

const POPULAR_TAGS = ['Live Motion', 'Cyberpunk', 'Nebula', 'Mountains', 'Supercar', 'Anime'];

export const HeroSection: React.FC<HeroSectionProps> = ({
  lang,
  searchQuery,
  onSearchChange,
  onSelectTag,
  onSelectCategory,
  onOpenBlog,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { recentSearches, addSearch, removeSearch, clearAllSearches } = useRecentSearches();

  const t = translations[lang];

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSelectQuery = (query: string) => {
    onSearchChange(query);
    addSearch(query);
    setIsDropdownOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (searchQuery.trim()) {
        addSearch(searchQuery);
      }
      setIsDropdownOpen(false);
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  return (
    <section className="relative overflow-hidden py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8 border-b border-[#1E202B] bg-gradient-to-b from-[#13141A] via-[#101012] to-[#101010]">
      {/* Subtle ambient neon glow elements */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[320px] bg-gradient-to-tr from-cyan-500/10 via-purple-600/10 to-pink-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative max-w-4xl mx-auto text-center">
        {/* Subtle top indicator & blog highlight */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#181A22] border border-[#272B3C] text-neutral-300 text-xs shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold text-white">4K UHD Resolution</span>
            <span className="text-neutral-500">·</span>
            <span className="text-neutral-400">3840 × 2160 Pixels</span>
          </div>

          {onOpenBlog && (
            <button
              onClick={onOpenBlog}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1A1C26] hover:bg-[#222534] border border-cyan-500/30 hover:border-cyan-500/60 text-xs text-neutral-300 hover:text-white transition-all cursor-pointer shadow-sm group"
            >
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-semibold text-cyan-300">
                {lang === 'ar' ? 'المدونة التقنية' : 'DeskSpace Journal'}
              </span>
              <span className="text-neutral-500">·</span>
              <span className="text-neutral-400 group-hover:text-white">
                {lang === 'ar' ? 'علم شاشات 4K و OLED' : 'OLED & 4K Display Optics'}
              </span>
              {lang === 'ar' ? (
                <ArrowLeft className="w-3 h-3 text-cyan-400 group-hover:-translate-x-0.5 transition-transform" />
              ) : (
                <ArrowRight className="w-3 h-3 text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
              )}
            </button>
          )}
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.1] mb-4 text-balance">
          {t.brandTagline}
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base md:text-lg text-neutral-400 max-w-2xl mx-auto mb-8 font-normal leading-relaxed">
          {t.brandSubtitle}
        </p>

        {/* Large Central Search Input with Recent Searches Dropdown */}
        <div ref={containerRef} className="relative max-w-2xl mx-auto mb-6 text-left">
          <div className="relative flex items-center rounded-2xl bg-[#16171E] border border-[#2B2F42] hover:border-cyan-500/50 focus-within:border-cyan-500 shadow-2xl transition-all">
            <Search className="w-5 h-5 absolute left-4 text-neutral-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setIsDropdownOpen(true)}
              onChange={(e) => {
                onSearchChange(e.target.value);
                if (!isDropdownOpen) setIsDropdownOpen(true);
              }}
              onKeyDown={handleKeyDown}
              placeholder={t.searchPlaceholder}
              className="w-full pl-12 pr-12 py-3.5 sm:py-4 text-sm rounded-2xl bg-transparent text-white placeholder:text-neutral-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-4 px-2 py-1 text-xs rounded-md bg-[#232738] text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Floating Recent Searches Dropdown */}
          {isDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl bg-[#14151C]/95 backdrop-blur-xl border border-[#2B2F42] shadow-2xl p-3 overflow-hidden animate-fade-in text-left">
              <div className="flex items-center justify-between px-2 pb-2 mb-1.5 border-b border-[#222534] text-xs font-semibold text-neutral-400">
                <div className="flex items-center gap-1.5 text-cyan-400">
                  <History className="w-3.5 h-3.5" />
                  <span>{t.recentSearches}</span>
                </div>
                {recentSearches.length > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearAllSearches();
                    }}
                    className="flex items-center gap-1 text-[11px] text-neutral-500 hover:text-red-400 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>{t.clearRecentSearches}</span>
                  </button>
                )}
              </div>

              {recentSearches.length > 0 ? (
                <div className="space-y-0.5">
                  {recentSearches.map((term) => (
                    <div
                      key={term}
                      className="group/item flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[#1E202B] transition-colors cursor-pointer text-xs"
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectQuery(term)}
                        className="flex-1 flex items-center gap-2.5 text-neutral-300 group-hover/item:text-cyan-300 transition-colors text-left"
                      >
                        <Clock className="w-3.5 h-3.5 text-neutral-500 group-hover/item:text-cyan-400 shrink-0" />
                        <span className="font-medium truncate">{term}</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSearch(term);
                        }}
                        className="p-1 rounded-md text-neutral-600 hover:text-neutral-300 hover:bg-[#252838] transition-colors cursor-pointer"
                        title="Remove"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-neutral-500">
                  <p>{t.noRecentSearches}</p>
                </div>
              )}

              {/* Trending suggestions footer in dropdown */}
              <div className="mt-2 pt-2 border-t border-[#222534] flex flex-wrap items-center gap-1.5 px-2">
                <span className="text-[10px] text-neutral-500 font-medium">
                  {t.popularSearches}:
                </span>
                {POPULAR_TAGS.slice(0, 4).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleSelectQuery(tag)}
                    className="px-2 py-0.5 rounded-md bg-[#1B1D28] hover:bg-[#232738] text-[10px] text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Popular Tags */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="text-neutral-500 font-medium">{t.popularTags}</span>
          {POPULAR_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => {
                onSelectTag(tag);
                addSearch(tag);
              }}
              className="px-2.5 py-1 rounded-lg bg-[#181A24] hover:bg-[#222533] border border-[#272A3B] text-neutral-300 hover:text-cyan-400 text-xs transition-colors cursor-pointer"
            >
              #{tag}
            </button>
          ))}
        </div>

        {/* Trust & Spec Markers */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto mt-10 pt-6 border-t border-[#1E202C] text-xs text-neutral-400">
          <div className="flex items-center justify-center gap-1.5">
            <Monitor className="w-4 h-4 text-cyan-400" />
            <span>3840×2160 UHD</span>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <Sparkles className="w-4 h-4 text-rose-400" />
            <span>{lang === 'ar' ? 'حركة حية 60 FPS' : 'Live Motion 60 FPS'}</span>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <Download className="w-4 h-4 text-emerald-400" />
            <span>MP4 &amp; 4K JPG</span>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span>No Watermarks</span>
          </div>
        </div>
      </div>
    </section>
  );
};
