import React, { useState, useRef, useEffect } from 'react';
import {
  Heart,
  Globe,
  User as UserIcon,
  Search,
  Menu,
  X,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  Clock,
  History,
  Smartphone,
  Film,
  BookOpen,
  Compass,
  Monitor,
} from 'lucide-react';
import { DeskSpaceLogo } from './DeskSpaceLogo';
import { Category, Language, User, LegalModalType } from '../types';
import { translations } from '../translations';
import { useRecentSearches } from '../hooks/useRecentSearches';

interface HeaderProps {
  currentCategory: Category | 'All' | 'Live' | 'MobileLive' | 'Blog';
  onSelectCategory: (cat: Category | 'All' | 'Live' | 'MobileLive' | 'Blog') => void;
  lang: Language;
  onToggleLanguage: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  currentUser: User | null;
  favoritesCount: number;
  onOpenAuthModal: () => void;
  onOpenProfileModal: () => void;
  onOpenFavorites: () => void;
  onOpenLegalModal: (type: LegalModalType) => void;
}

const CATEGORIES: Category[] = [
  'Anime',
  'Gaming',
  'Nature',
  'Space',
  'Cars',
  'Minimalist',
];

export const Header: React.FC<HeaderProps> = ({
  currentCategory,
  onSelectCategory,
  lang,
  onToggleLanguage,
  searchQuery,
  onSearchChange,
  currentUser,
  favoritesCount,
  onOpenAuthModal,
  onOpenProfileModal,
  onOpenFavorites,
  onOpenLegalModal,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [policiesOpen, setPoliciesOpen] = useState(false);
  const [isRecentOpen, setIsRecentOpen] = useState(false);

  const headerSearchRef = useRef<HTMLDivElement>(null);
  const policiesMenuRef = useRef<HTMLDivElement>(null);
  const { recentSearches, addSearch, removeSearch, clearAllSearches } = useRecentSearches();

  const t = translations[lang];

  // Close recent searches & policy popups on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (headerSearchRef.current && !headerSearchRef.current.contains(e.target as Node)) {
        setIsRecentOpen(false);
      }
      if (policiesMenuRef.current && !policiesMenuRef.current.contains(e.target as Node)) {
        setPoliciesOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleCategoryClick = (cat: Category | 'All' | 'Live' | 'MobileLive' | 'Blog') => {
    onSelectCategory(cat);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0E0F14]/95 backdrop-blur-2xl border-b border-[#1E202B] shadow-xl">
      {/* ========================================================= */}
      {/* TOP BAR: Brand Logo, Main Search Bar, Action Controls      */}
      {/* Guaranteed flex-nowrap to ensure NO clipped critical items */}
      {/* ========================================================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 sm:gap-4 flex-nowrap">
        {/* Left: Brand Logo */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => handleCategoryClick('All')}
            className="flex items-center text-left hover:opacity-90 transition-opacity cursor-pointer"
            aria-label="DeskSpace4K Home"
          >
            <DeskSpaceLogo size={36} showText={true} />
          </button>
        </div>

        {/* Center: Search Bar (Desktop / Tablet viewports >= md) */}
        <div
          ref={headerSearchRef}
          className="hidden md:flex flex-1 max-w-sm lg:max-w-md relative mx-2 lg:mx-4"
        >
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onFocus={() => setIsRecentOpen(true)}
            onChange={(e) => {
              onSearchChange(e.target.value);
              if (!isRecentOpen) setIsRecentOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (searchQuery.trim()) addSearch(searchQuery);
                setIsRecentOpen(false);
              } else if (e.key === 'Escape') {
                setIsRecentOpen(false);
              }
            }}
            placeholder={t.searchPlaceholder}
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-[#14151E] border border-[#262838] text-white placeholder:text-neutral-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/20 transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-2.5 text-neutral-500 hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>
          )}

          {/* Floating Recent Searches Dropdown */}
          {isRecentOpen && recentSearches.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl bg-[#13151F]/98 backdrop-blur-2xl border border-[#272B3E] shadow-2xl p-2.5 overflow-hidden animate-fade-in text-left">
              <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-[#222534] text-[11px] font-semibold text-neutral-400">
                <span className="flex items-center gap-1.5 text-cyan-400">
                  <History className="w-3.5 h-3.5" />
                  <span>{t.recentSearches}</span>
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearAllSearches();
                  }}
                  className="text-[10px] text-neutral-500 hover:text-red-400 transition-colors cursor-pointer"
                >
                  {t.clearRecentSearches}
                </button>
              </div>
              <div className="space-y-0.5 max-h-48 overflow-y-auto">
                {recentSearches.map((term) => (
                  <div
                    key={term}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[#1C1F2D] text-xs transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onSearchChange(term);
                        addSearch(term);
                        setIsRecentOpen(false);
                      }}
                      className="flex-1 flex items-center gap-2 text-neutral-300 hover:text-cyan-300 text-left transition-colors cursor-pointer truncate"
                    >
                      <Clock className="w-3 h-3 text-neutral-500 shrink-0" />
                      <span className="truncate">{term}</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSearch(term);
                      }}
                      className="text-neutral-500 hover:text-neutral-300 p-0.5 transition-colors cursor-pointer"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Action Controls: Search Icon, Favorites, Auth, Language, Menu */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 flex-nowrap">
          {/* Mobile search toggle button (visible only on < md) */}
          <button
            type="button"
            onClick={() => setShowSearchInput(!showSearchInput)}
            className="md:hidden p-2 rounded-xl bg-[#151722] border border-[#252838] text-neutral-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Toggle Search"
            title="Search Wallpapers"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Favorites Button with Live Count Badge */}
          <button
            type="button"
            onClick={onOpenFavorites}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-[#151722] hover:bg-[#1E2130] border border-[#252838] hover:border-rose-500/40 text-neutral-300 hover:text-white transition-all cursor-pointer shrink-0"
            title={t.navFavorites}
          >
            <Heart
              className={`w-4 h-4 shrink-0 transition-transform ${
                favoritesCount > 0 ? 'text-rose-500 fill-rose-500 scale-110' : 'text-neutral-400'
              }`}
            />
            <span className="hidden sm:inline text-xs font-semibold whitespace-nowrap">
              {t.navFavorites}
            </span>
            {favoritesCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-mono font-bold">
                {favoritesCount}
              </span>
            )}
          </button>

          {/* User Profile / Sign In Button */}
          {currentUser ? (
            <button
              type="button"
              onClick={onOpenProfileModal}
              className="flex items-center gap-2 py-1.5 px-2.5 sm:px-3 rounded-xl bg-[#151722] hover:bg-[#1E2130] border border-[#272B3C] text-white transition-colors cursor-pointer shrink-0"
              title={currentUser.username}
            >
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center text-xs font-black text-black uppercase shrink-0">
                {currentUser.username.slice(0, 1)}
              </div>
              <span className="text-xs font-semibold max-w-[85px] truncate hidden sm:inline">
                {currentUser.username}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="flex items-center gap-1.5 py-2 px-2.5 sm:px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs tracking-wide shadow-md shadow-cyan-500/20 transition-all cursor-pointer shrink-0 whitespace-nowrap"
            >
              <UserIcon className="w-3.5 h-3.5 shrink-0" />
              <span>{t.navSignIn}</span>
            </button>
          )}

          {/* Bilingual Language Switcher (EN | عربي) */}
          <button
            type="button"
            onClick={onToggleLanguage}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-[#151722] hover:bg-[#1E2130] border border-[#252838] hover:border-cyan-500/40 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer shrink-0"
            title="Switch Language / تغيير اللغة"
          >
            <Globe className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
            <span className="font-semibold">{lang === 'en' ? 'عربي' : 'EN'}</span>
          </button>

          {/* Mobile / Tablet Hamburger Menu Button (visible on < lg) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl bg-[#151722] border border-[#252838] text-neutral-300 hover:text-white transition-colors cursor-pointer shrink-0"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-cyan-400" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SECONDARY ROW: Desktop Category Stream & Placements       */}
      {/* Visible on lg+ displays, horizontal scroll protected      */}
      {/* ========================================================= */}
      <div className="hidden lg:block border-t border-[#1C1E29] bg-[#0A0B10]/95 py-2 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Scrollable category pills row */}
          <nav className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-nowrap py-0.5">
            {/* All Wallpapers Tab */}
            <button
              type="button"
              onClick={() => handleCategoryClick('All')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                currentCategory === 'All'
                  ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20'
                  : 'text-neutral-300 hover:text-white hover:bg-[#171924] border border-transparent'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>{t.navAll}</span>
            </button>

            {/* Live Wallpapers 4K Dedicated Tab */}
            <button
              type="button"
              onClick={() => handleCategoryClick('Live')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                currentCategory === 'Live'
                  ? 'bg-gradient-to-r from-rose-600 to-purple-600 text-white shadow-md shadow-rose-500/30'
                  : 'text-rose-300 hover:text-white hover:bg-rose-950/40 border border-rose-500/30'
              }`}
            >
              <Film className="w-3.5 h-3.5 text-rose-400" />
              <span>{t.navLive}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
            </button>

            {/* Mobile Live Wallpapers Dedicated 9:16 Tab */}
            <button
              type="button"
              onClick={() => handleCategoryClick('MobileLive')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                currentCategory === 'MobileLive'
                  ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-md shadow-fuchsia-500/30'
                  : 'text-fuchsia-300 hover:text-white hover:bg-fuchsia-950/40 border border-fuchsia-500/40'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-fuchsia-400" />
              <span>{t.navMobileLive}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 animate-ping" />
            </button>

            {/* Curated Categories */}
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategoryClick(cat)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap cursor-pointer ${
                  currentCategory === cat
                    ? 'bg-[#1C2030] text-cyan-400 border border-cyan-500/40 shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-[#161822]'
                }`}
              >
                {t.categories[cat]}
              </button>
            ))}

            {/* Journal / Blog */}
            <button
              type="button"
              onClick={() => handleCategoryClick('Blog')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                currentCategory === 'Blog'
                  ? 'bg-cyan-500 text-black shadow-sm shadow-cyan-500/20'
                  : 'text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/30 border border-cyan-500/20'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{t.navBlog}</span>
            </button>
          </nav>

          {/* Right: Legal & Policy Dropdown */}
          <div ref={policiesMenuRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setPoliciesOpen(!policiesOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                policiesOpen
                  ? 'bg-[#1B1E2C] text-cyan-400 border border-cyan-500/40'
                  : 'text-neutral-400 hover:text-white hover:bg-[#141620] border border-[#202332]'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t.navLegalMenu}</span>
              <ChevronDown className={`w-3 h-3 text-neutral-400 transition-transform ${policiesOpen ? 'rotate-180' : ''}`} />
            </button>

            {policiesOpen && (
              <div
                className="absolute top-full mt-2 right-0 w-52 rounded-2xl bg-[#12141F]/98 backdrop-blur-2xl border border-[#272B3E] shadow-2xl p-1.5 z-50 flex flex-col gap-1 text-xs animate-fade-in"
              >
                <button
                  type="button"
                  onClick={() => {
                    onOpenLegalModal('privacy');
                    setPoliciesOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-neutral-300 hover:text-white hover:bg-[#1C1F2D] transition-colors cursor-pointer"
                >
                  {t.privacyPolicy}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onOpenLegalModal('terms');
                    setPoliciesOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-neutral-300 hover:text-white hover:bg-[#1C1F2D] transition-colors cursor-pointer"
                >
                  {t.termsOfService}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onOpenLegalModal('about');
                    setPoliciesOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-neutral-300 hover:text-white hover:bg-[#1C1F2D] transition-colors cursor-pointer"
                >
                  {t.aboutUs}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onOpenLegalModal('contact');
                    setPoliciesOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-neutral-300 hover:text-white hover:bg-[#1C1F2D] transition-colors cursor-pointer"
                >
                  {t.contactUs}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onOpenLegalModal('dmca');
                    setPoliciesOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-amber-400 hover:text-amber-300 hover:bg-[#1C1F2D] transition-colors cursor-pointer"
                >
                  {t.dmcaPolicy}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MOBILE EXPANDABLE SEARCH BAR (When toggled on mobile)     */}
      {/* ========================================================= */}
      {showSearchInput && (
        <div className="md:hidden px-4 py-3 bg-[#0B0C12] border-t border-[#1C1E28]">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full pl-9 pr-9 py-2.5 text-xs rounded-xl bg-[#141620] border border-[#272B3C] text-white placeholder:text-neutral-500 focus:outline-none focus:border-cyan-400"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-3 text-neutral-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MOBILE RESPONSIVE HAMBURGER NAVIGATION DRAWER             */}
      {/* Guarantees 100% elements are fully accessible on mobile   */}
      {/* ========================================================= */}
      {mobileMenuOpen && (
        <div className="lg:hidden px-4 py-4 bg-[#0B0C12]/98 backdrop-blur-2xl border-t border-[#1C1E28] space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Section 1: Main Platform Views */}
          <div>
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 mb-2">
              {lang === 'ar' ? 'أقسام المنصة الرئيسية' : 'Main Hubs & Placement'}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleCategoryClick('All')}
                className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2.5 transition-all text-left ${
                  currentCategory === 'All'
                    ? 'bg-cyan-500 text-black border-cyan-400 shadow-md'
                    : 'bg-[#131520] text-neutral-200 border-[#222638] hover:bg-[#1A1C2C]'
                }`}
              >
                <Monitor className="w-4 h-4 text-cyan-400" />
                <div className="flex flex-col">
                  <span>{t.navAll}</span>
                  <span className="text-[10px] font-normal opacity-75">
                    {lang === 'ar' ? 'خلفيات سطح المكتب 16:9' : 'Desktop 16:9 Wallpapers'}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleCategoryClick('MobileLive')}
                className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2.5 transition-all text-left ${
                  currentCategory === 'MobileLive'
                    ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white border-fuchsia-400 shadow-md'
                    : 'bg-[#151222] text-fuchsia-200 border-fuchsia-500/30 hover:bg-[#1E1830]'
                }`}
              >
                <Smartphone className="w-4 h-4 text-fuchsia-400" />
                <div className="flex flex-col">
                  <span className="flex items-center gap-1.5">
                    <span>{t.navMobileLive}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 animate-pulse" />
                  </span>
                  <span className="text-[10px] font-normal opacity-75">
                    {lang === 'ar' ? 'خلفيات حية رأسية 9:16' : 'Vertical 9:16 Motion Hub'}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleCategoryClick('Live')}
                className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2.5 transition-all text-left ${
                  currentCategory === 'Live'
                    ? 'bg-gradient-to-r from-rose-600 to-purple-600 text-white border-rose-400 shadow-md'
                    : 'bg-[#1C1420] text-rose-200 border-rose-500/30 hover:bg-[#251A2C]'
                }`}
              >
                <Film className="w-4 h-4 text-rose-400" />
                <div className="flex flex-col">
                  <span>{t.navLive}</span>
                  <span className="text-[10px] font-normal opacity-75">
                    {lang === 'ar' ? 'خلفيات متحركة 60FPS' : '60 FPS Motion Video'}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleCategoryClick('Blog')}
                className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2.5 transition-all text-left ${
                  currentCategory === 'Blog'
                    ? 'bg-cyan-500 text-black border-cyan-400 shadow-md'
                    : 'bg-[#131520] text-cyan-300 border-cyan-500/30 hover:bg-[#1A1C2C]'
                }`}
              >
                <BookOpen className="w-4 h-4 text-cyan-400" />
                <div className="flex flex-col">
                  <span>{t.navBlog}</span>
                  <span className="text-[10px] font-normal opacity-75">
                    {lang === 'ar' ? 'مقالات وأدلة الشاشات' : 'Optics & Battlestations'}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Section 2: Desktop Categories */}
          <div>
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 mb-2">
              {lang === 'ar' ? 'تصنيفات سطح المكتب (16:9)' : 'Desktop Categories (16:9)'}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleCategoryClick(cat)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                    currentCategory === cat
                      ? 'bg-cyan-500 text-black border-cyan-400 shadow-sm'
                      : 'bg-[#141620] text-neutral-300 border-[#242738] hover:bg-[#1B1E2C]'
                  }`}
                >
                  {t.categories[cat]}
                </button>
              ))}
            </div>
          </div>

          {/* Section 3: Policies & Legal Links */}
          <div className="pt-3 border-t border-[#1C1E28]">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 mb-2">
              {t.navLegalMenu}
            </div>
            <div className="flex flex-wrap gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => {
                  onOpenLegalModal('privacy');
                  setMobileMenuOpen(false);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-[#141620] border border-[#242738] text-neutral-300 hover:text-white"
              >
                {t.privacyPolicy}
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenLegalModal('terms');
                  setMobileMenuOpen(false);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-[#141620] border border-[#242738] text-neutral-300 hover:text-white"
              >
                {t.termsOfService}
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenLegalModal('about');
                  setMobileMenuOpen(false);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-[#141620] border border-[#242738] text-neutral-300 hover:text-white"
              >
                {t.aboutUs}
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenLegalModal('contact');
                  setMobileMenuOpen(false);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-[#141620] border border-[#242738] text-neutral-300 hover:text-white"
              >
                {t.contactUs}
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenLegalModal('dmca');
                  setMobileMenuOpen(false);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-[#181520] border border-amber-500/30 text-amber-400 hover:text-amber-300"
              >
                {t.dmcaPolicy}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
