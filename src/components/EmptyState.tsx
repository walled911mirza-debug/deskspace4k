import React from 'react';
import {
  Monitor,
  Smartphone,
  Shield,
  UploadCloud,
  Sparkles,
  Search,
  ArrowRight,
  ArrowLeft,
  SlidersHorizontal,
} from 'lucide-react';
import { Language } from '../types';
import { translations } from '../translations';

interface EmptyStateProps {
  mode: 'desktop' | 'mobile';
  lang: Language;
  onOpenAdmin?: () => void;
  onClearFilters?: () => void;
  isFilterEmpty?: boolean;
  searchQuery?: string;
  onBackToDesktop?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  mode,
  lang,
  onOpenAdmin,
  onClearFilters,
  isFilterEmpty = false,
  searchQuery,
  onBackToDesktop,
}) => {
  const isAr = lang === 'ar';
  const isMobile = mode === 'mobile';
  const t = translations[lang];

  // Case 1: Search / Filter returned no results
  if (isFilterEmpty) {
    return (
      <div className="py-20 text-center rounded-3xl bg-[#12131A] border border-[#232638] p-8 sm:p-12 max-w-lg mx-auto shadow-2xl relative overflow-hidden">
        <div className="w-16 h-16 rounded-2xl bg-[#181B26] border border-[#2A2F45] flex items-center justify-center mx-auto mb-4 text-neutral-400">
          <Search className="w-8 h-8 text-neutral-500" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2 tracking-tight">
          {t.noWallpapersFound || (isAr ? 'لم يتم العثور على نتائج' : 'No Wallpapers Found')}
        </h3>
        <p className="text-xs text-neutral-400 mb-6 max-w-md mx-auto leading-relaxed">
          {isAr
            ? `لم يتم العثور على خلفيات تطابق معايير البحث أو التصنيف المحدد${
                searchQuery ? ` ("${searchQuery}")` : ''
              }. جرب تغيير الكلمات المفتاحية أو إعادة ضبط الفلاتر.`
            : `No wallpapers match your current filter criteria${
                searchQuery ? ` matching "${searchQuery}"` : ''
              }. Try adjusting your search query or reset active filters.`}
        </p>

        {onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all cursor-pointer transform hover:scale-105 active:scale-95 ${
              isMobile
                ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white shadow-fuchsia-500/20'
                : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-cyan-500/20'
            }`}
          >
            {t.clearFilters || (isAr ? 'إعادة ضبط الفلاتر' : 'Clear Filters')}
          </button>
        )}
      </div>
    );
  }

  // Case 2: Clean slate - Repository is completely empty
  return (
    <div className="relative py-20 px-6 sm:px-12 text-center rounded-3xl bg-gradient-to-b from-[#131520] via-[#0F1018] to-[#0A0B10] border border-[#23273D] shadow-2xl max-w-2xl mx-auto overflow-hidden my-6">
      {/* Ambient background glow orb */}
      <div
        className={`absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20 ${
          isMobile ? 'bg-fuchsia-600' : 'bg-cyan-500'
        }`}
      />

      <div className="relative z-10 flex flex-col items-center">
        {/* Glowing Holographic Badge */}
        <div
          className={`w-20 h-20 rounded-3xl p-1 mb-6 border shadow-2xl flex items-center justify-center ${
            isMobile
              ? 'bg-gradient-to-br from-purple-950/80 to-fuchsia-950/80 border-fuchsia-500/40 shadow-fuchsia-500/25'
              : 'bg-gradient-to-br from-cyan-950/80 to-blue-950/80 border-cyan-500/40 shadow-cyan-500/25'
          }`}
        >
          {isMobile ? (
            <Smartphone className="w-10 h-10 text-fuchsia-400 animate-pulse stroke-[2]" />
          ) : (
            <Monitor className="w-10 h-10 text-cyan-400 animate-pulse stroke-[2]" />
          )}
        </div>

        {/* Status Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#181B28] border border-[#2B3047] text-[11px] font-mono font-bold mb-3">
          <span className={`w-2 h-2 rounded-full ${isMobile ? 'bg-fuchsia-400' : 'bg-cyan-400'} animate-ping`} />
          <span className={isMobile ? 'text-fuchsia-300' : 'text-cyan-300'}>
            {isAr ? 'مستودع نظيف وجاهز' : 'PRISTINE CLEAN REPOSITORY'}
          </span>
        </div>

        {/* Heading */}
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-3">
          {isMobile
            ? isAr
              ? 'لا توجد خلفيات هاتف حية مرفوعة حتى الآن'
              : 'No Mobile Live Wallpapers Uploaded Yet'
            : isAr
            ? 'لا توجد خلفيات بدقة 4K في المستودع حتى الآن'
            : 'No 4K Wallpapers Uploaded Yet'}
        </h2>

        {/* Subtitle */}
        <p className="text-xs sm:text-sm text-neutral-400 max-w-lg mx-auto leading-relaxed mb-8">
          {isMobile
            ? isAr
              ? 'قسم خلفيات الهواتف الرأسية (9:16) جاهز وفارغ. تفضل بالدخول إلى لوحة الإدارة لرفع أول خلفية هاتف حية بدقة فائقة وبمعدل 60 إطاراً في الثانية!'
              : 'The dedicated 9:16 vertical motion hub is clean and ready. Access the Admin Center to upload and publish your first smooth 60 FPS mobile live wallpaper for AMOLED displays!'
            : isAr
            ? 'المستودع نظيف تماماً وخالٍ من البيانات التجريبية. تفضل بالدخول إلى لوحة الإدارة لرفع وتنسيق أول تحفة فنية بدقة 3840×2160 لشاشات سطح المكتب!'
            : 'The repository is completely clean with zero mock data. Access the Admin Center to upload, categorize, and publish your first 3840×2160 4K desktop masterpiece!'}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md">
          {onOpenAdmin ? (
            <button
              type="button"
              onClick={onOpenAdmin}
              className={`w-full sm:w-auto px-6 py-3.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer transform hover:scale-105 active:scale-95 ${
                isMobile
                  ? 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 text-white shadow-fuchsia-500/30 hover:shadow-fuchsia-500/50'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-cyan-500/30 hover:shadow-cyan-500/50'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>{isAr ? 'فتح لوحة الإدارة (/secret-admin)' : 'Open Admin Center (/secret-admin)'}</span>
            </button>
          ) : (
            <a
              href="/secret-admin"
              className={`w-full sm:w-auto px-6 py-3.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer transform hover:scale-105 active:scale-95 ${
                isMobile
                  ? 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 text-white shadow-fuchsia-500/30'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-cyan-500/30'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>{isAr ? 'الانتقال إلى /secret-admin' : 'Go to /secret-admin'}</span>
            </a>
          )}

          {isMobile && onBackToDesktop && (
            <button
              type="button"
              onClick={onBackToDesktop}
              className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-[#171924] hover:bg-[#202332] border border-[#2B2F44] text-neutral-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {isAr ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
              <span>{isAr ? 'العودة لقسم سطح المكتب' : 'Back to Desktop'}</span>
            </button>
          )}
        </div>

        {/* Direct URL Tip */}
        <div className="mt-8 pt-6 border-t border-[#1C1F2E] flex items-center justify-center gap-2 text-[11px] font-mono text-neutral-500">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400/70 shrink-0" />
          <span>
            {isAr
              ? 'تلميح: اكتب /secret-admin مباشرة في شريط المتصفح لإدارة المحتوى'
              : 'Direct browser access: Navigate to /secret-admin to manage & upload wallpapers'}
          </span>
        </div>
      </div>
    </div>
  );
};
