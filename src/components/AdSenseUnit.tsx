import React, { useState, useEffect } from 'react';
import { Info, Sparkles, ExternalLink, Monitor, Cpu, ShieldCheck } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../translations';

export type AdSenseSlot =
  | 'leaderboard-top'
  | 'in-feed'
  | 'modal-sidebar'
  | 'leaderboard-footer'
  | 'gallery-break'
  | 'article-break'
  | 'details-break';

interface AdSenseUnitProps {
  slot: AdSenseSlot;
  lang: Language;
  className?: string;
  adClient?: string;
  adSlotId?: string;
}

export const AdSenseUnit: React.FC<AdSenseUnitProps> = ({
  slot,
  lang,
  className = '',
  adClient = 'ca-pub-XXXXXXXXXXXXXXX',
  adSlotId = 'XXXXXXXXXX',
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMobileScreen, setIsMobileScreen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });
  const t = (translations && (translations[lang] || translations.en)) || {
    adLabel: 'Advertisement',
    adSponsored: 'Sponsored Media Slot',
    adPlaceholderNotice: 'Google AdSense Partner Placement · Responsive Display Unit',
  };

  // Mobile-First Protection: Never render ad containers or AdChoices placeholders on mobile screens
  useEffect(() => {
    const handleResize = () => {
      setIsMobileScreen(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Smooth loading state to prevent Cumulative Layout Shift (CLS)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 150);

    // Initialize real Google AdSense if available in environment
    try {
      if (typeof window !== 'undefined' && (window as any).adsbygoogle) {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      }
    } catch {
      // ignore
    }

    return () => clearTimeout(timer);
  }, [slot]);

  // Strictly do not render ad units or AdChoices banners on mobile screens
  if (isMobileScreen) {
    return null;
  }

  // Discrete label bar compliant with Google AdSense Publisher Policies
  const adLabelBar = (
    <div className="flex items-center justify-between px-3.5 py-1.5 border-b border-[#20222F] bg-[#111218]/90 text-[10px] uppercase font-mono tracking-wider text-neutral-400 select-none">
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/80 animate-pulse" />
        <span className="font-semibold text-neutral-300">
          {lang === 'ar' ? 'إعلان معتمد' : t.adLabel}
        </span>
        <span className="text-neutral-600 hidden sm:inline">·</span>
        <span className="text-neutral-500 text-[9px] hidden sm:inline">
          {lang === 'ar' ? 'شبكة شركاء ديسك سبيس' : 'DeskSpace Partner Network'}
        </span>
      </div>
      <div className="flex items-center gap-1 text-[9px] text-neutral-400 hover:text-cyan-400 transition-colors">
        <Info className="w-3 h-3 text-neutral-400" />
        <span>AdChoices</span>
      </div>
    </div>
  );

  // 1. Gallery Break Ad Slot: Placed naturally below main desktop gallery before footer/journal
  if (slot === 'gallery-break' || slot === 'leaderboard-footer') {
    return (
      <aside
        aria-label="Sponsored Display Leaderboard"
        className={`hidden md:block w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-10 ${className}`}
      >
        <div className="relative rounded-2xl bg-[#12131A] border border-[#222433] hover:border-cyan-500/30 transition-all duration-300 overflow-hidden shadow-xl min-h-[110px]">
          {adLabelBar}

          {/* Reserved height content container */}
          <div className="p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 text-left w-full md:w-auto">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/15 via-[#181924] to-purple-600/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-inner">
                <Monitor className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="text-xs sm:text-sm font-bold text-white flex flex-wrap items-center gap-2">
                  <span>
                    {lang === 'ar'
                      ? 'شاشات أوليد فائقة العرض بدقة 4K ومعدل 144Hz'
                      : 'Apex UltraWide 4K OLED Gaming Monitors & Calibrated Panels'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono font-bold">
                    0.03ms Response
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-1 line-clamp-1">
                  {lang === 'ar'
                    ? 'ارتقِ بتنسيق مكتبك مع دقة ألوان DCI-P3 بنسبة 99% وسطوع HDR1000 المعتمد للشاشات فائقة الوضوح.'
                    : 'Transform your battlestation with true 10-bit HDR, infinite contrast, and certified 99.8% DCI-P3 color accuracy.'}
                </p>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-3 w-full md:w-auto justify-end">
              <div className="text-[10px] text-neutral-400 font-mono hidden lg:block">
                Slot: {adSlotId}
              </div>
              <a
                href="#wallpaper-gallery-top"
                onClick={(e) => {
                  e.preventDefault();
                  const target = document.getElementById('wallpaper-gallery-top');
                  if (target) target.scrollIntoView({ behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1A1C26] hover:bg-[#222534] border border-[#2B2F44] hover:border-cyan-500/40 text-xs font-semibold text-neutral-200 hover:text-white transition-all cursor-pointer group"
              >
                <span>{lang === 'ar' ? 'استكشف العتاد المعتمد' : 'Explore Displays'}</span>
                <ExternalLink className="w-3.5 h-3.5 text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
              </a>
            </div>
          </div>

          {/* Loading Shimmer Skeleton for CLS Elimination */}
          {!isLoaded && (
            <div className="absolute inset-0 bg-[#12131A] animate-pulse pointer-events-none" />
          )}
        </div>
      </aside>
    );
  }

  // 2. Article Break Ad Slot: Placed alongside or between journal/blog articles
  if (slot === 'article-break') {
    return (
      <aside
        aria-label="Sponsored Journal Reading Break"
        className={`hidden md:block w-full my-8 ${className}`}
      >
        <div className="relative rounded-2xl bg-[#13141C] border border-[#222535] hover:border-cyan-500/30 transition-all duration-300 overflow-hidden shadow-lg min-h-[100px]">
          {adLabelBar}

          <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 text-left w-full sm:w-auto">
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                  <span>
                    {lang === 'ar'
                      ? 'محركات معالجة رسومية وشاشات موجهة للمصممين'
                      : 'Hardware Colorimeters & Calibrated Display Sensors'}
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-purple-500/15 border border-purple-500/30 text-purple-300 font-mono font-bold">
                    Delta E &lt; 1
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5 line-clamp-1">
                  {lang === 'ar'
                    ? 'أدوات ضبط الألوان والمعايرة الاحترافية للحصول على دقة مطابقة تماماً للمواصفات السينمائية.'
                    : 'Ensure studio-grade color precision across all your 4K Ultra HD monitors and live wallpaper profiles.'}
                </p>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2 w-full sm:w-auto justify-end">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1B1D28] hover:bg-[#232636] border border-[#2B2F44] text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer">
                <span>{lang === 'ar' ? 'معرفة المزيد' : 'Learn More'}</span>
                <ExternalLink className="w-3 h-3" />
              </span>
            </div>
          </div>

          {!isLoaded && (
            <div className="absolute inset-0 bg-[#13141C] animate-pulse pointer-events-none" />
          )}
        </div>
      </aside>
    );
  }

  // 3. Details Break Ad Slot: Placed on Wallpaper Detail view below tags and above related wallpapers
  if (slot === 'details-break') {
    return (
      <aside
        aria-label="Sponsored Studio Recommendation"
        className={`hidden md:block w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-6 ${className}`}
      >
        <div className="relative rounded-2xl bg-[#13141B] border border-[#222533] hover:border-cyan-500/30 transition-all duration-300 overflow-hidden shadow-lg min-h-[90px]">
          {adLabelBar}

          <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-left w-full sm:w-auto">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                  <span>
                    {lang === 'ar'
                      ? 'ملحقات إضاءة خلفية محيطية بدقة 4K متوافقة مع الشاشات'
                      : 'Ambient Battlestation Backlight Sync for 4K Monitors'}
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono font-bold">
                    60 FPS Sync
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-0.5 line-clamp-1">
                  {lang === 'ar'
                    ? 'قم بمزامنة ألوان شاشتك مع الإضاءة الخلفية للغرفة لتقليل إجهاد العين وتعزيز الانغماس البصري.'
                    : 'Dynamic reactive screen backlighting tailored to match live wallpaper colors with zero perceptible lag.'}
                </p>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2 w-full sm:w-auto justify-end">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1B1D28] hover:bg-[#232636] border border-[#2B2F44] text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer">
                <span>{lang === 'ar' ? 'عرض الملحقات' : 'View Hardware'}</span>
                <ExternalLink className="w-3 h-3" />
              </span>
            </div>
          </div>

          {!isLoaded && (
            <div className="absolute inset-0 bg-[#13141B] animate-pulse pointer-events-none" />
          )}
        </div>
      </aside>
    );
  }

  // 4. In-Feed Card Slot: Integrated smoothly as a grid card
  if (slot === 'in-feed') {
    return (
      <aside
        aria-label="Sponsored In-Feed Ad Unit"
        className={`hidden md:block group relative rounded-2xl bg-[#14151C] border border-[#242637] hover:border-cyan-500/40 overflow-hidden shadow-lg flex flex-col justify-between transition-all min-h-[300px] ${className}`}
      >
        {adLabelBar}

        <div className="p-4 sm:p-5 flex flex-col justify-between flex-1">
          <div>
            <div className="aspect-video w-full rounded-xl bg-gradient-to-br from-[#1A1C27] via-[#15161E] to-[#111218] border border-[#282B3C] flex flex-col items-center justify-center p-4 relative overflow-hidden mb-3">
              <div className="absolute inset-0 bg-cyan-500/5 backdrop-blur-[1px]" />
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-2 relative z-10">
                <Monitor className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-white relative z-10 text-center">
                Custom Battlestation Mounts
              </span>
              <span className="text-[10px] text-cyan-400 font-mono relative z-10 mt-1">
                Heavy-Duty Dual 4K Gas Springs
              </span>
            </div>

            <h4 className="text-sm font-bold text-white line-clamp-2">
              {lang === 'ar'
                ? 'أذرع تثبيت الشاشات المزدوجة بدقة 4K والمصممة للمكاتب الاحترافية'
                : 'Studio Display Arms & Color-Accurate Mounts for Dual 4K Setups'}
            </h4>
            <p className="text-xs text-neutral-400 mt-1.5 line-clamp-3 leading-relaxed">
              {lang === 'ar'
                ? 'احصل على مساحة عمل نظيفة خالية من الأسلاك مع دعم الشاشات العريضة والشاشات الرأسية 9:16.'
                : 'Engineered for colorists and multi-monitor workstations. Seamlessly support dual 4K setups with clean integrated cable routing.'}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-[#222432] flex items-center justify-between">
            <span className="text-[10px] font-mono text-neutral-400">
              {t.adSponsored}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-cyan-400 group-hover:text-cyan-300">
              <span>{lang === 'ar' ? 'تعرف على المزيد' : 'Learn More'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {!isLoaded && (
          <div className="absolute inset-0 bg-[#14151C] animate-pulse pointer-events-none" />
        )}
      </aside>
    );
  }

  // 5. Default Top / Sidebar unit
  return (
    <aside
      aria-label="Sponsored Display Banner"
      className={`hidden md:block w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-4 ${className}`}
    >
      <div className="relative rounded-2xl bg-[#14151B] border border-[#242636] overflow-hidden shadow-sm min-h-[90px]">
        {adLabelBar}
        <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 text-left">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <span>Ultra-Wide 4K Gaming Displays &amp; OLED Panels</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-extrabold uppercase">
                  4K 144Hz
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5 line-clamp-1">
                {t.adPlaceholderNotice}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1F212D] border border-[#2F3244] text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors">
              <span>{lang === 'ar' ? 'عرض المواصفات' : 'Explore Displays'}</span>
              <ExternalLink className="w-3 h-3" />
            </span>
          </div>
        </div>

        {!isLoaded && (
          <div className="absolute inset-0 bg-[#14151B] animate-pulse pointer-events-none" />
        )}
      </div>
    </aside>
  );
};
