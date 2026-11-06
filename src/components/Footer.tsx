import React from 'react';
import { ShieldCheck, Mail, FileText, Scale, Sparkles, BookOpen } from 'lucide-react';
import { DeskSpaceLogo } from './DeskSpaceLogo';
import { Language, LegalModalType } from '../types';
import { translations } from '../translations';

interface FooterProps {
  lang: Language;
  onOpenLegalModal: (type: LegalModalType) => void;
  onOpenBlog?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  lang,
  onOpenLegalModal,
  onOpenBlog,
}) => {
  const t = translations[lang];

  return (
    <footer className="w-full bg-[#0D0E13] border-t border-[#1C1E28] text-neutral-400 py-12 px-4 sm:px-6 lg:px-8 mt-12">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Footer Row: Branding, Mission, and Direct Navigation */}
        <div className="flex flex-col lg:flex-row items-center lg:items-start justify-between gap-8 pb-8 border-b border-[#1B1D27]">
          {/* Brand & Editorial Description */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left max-w-md">
            <DeskSpaceLogo size={36} showText={true} />
            <p className="text-xs text-neutral-400 mt-2.5 leading-relaxed">
              {lang === 'ar'
                ? 'ديسك سبيس 4K هو مستودع متقدم لخلفيات الشاشة عالية الدقة 3840×2160 لشاشات الحواسيب المكتبية والمحمولة، مع أدوات اقتطاع فورية وحلقات فيديو متحركة بمعدل 60 إطاراً في الثانية.'
                : 'DeskSpace4K is a curated digital repository of pristine 3840×2160 4K desktop media, featuring client-side canvas cropping, 60 FPS live motion loops, and clean, uncompressed downloads.'}
            </p>
            <div className="flex items-center gap-3 text-[11px] text-neutral-400 font-mono mt-3">
              <span className="flex items-center gap-1 text-cyan-400">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span>3840×2160 UHD</span>
              </span>
              <span>·</span>
              <span>100% Free Personal License</span>
              <span>·</span>
              <span>Ultra HD Guaranteed</span>
            </div>
          </div>

          {/* Quick Policy & Legal Navigation Links */}
          <div className="flex flex-col items-center lg:items-end gap-3 text-center lg:text-right">
            <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>{t.navLegalMenu}</span>
            </span>

            <nav
              aria-label="Footer Legal Navigation"
              className="flex flex-wrap items-center justify-center lg:justify-end gap-x-6 gap-y-2.5 text-xs font-medium"
            >
              {onOpenBlog && (
                <button
                  type="button"
                  onClick={onOpenBlog}
                  className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-semibold transition-colors cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{t.navBlog}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onOpenLegalModal('privacy')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                {t.privacyPolicy}
              </button>

              <button
                type="button"
                onClick={() => onOpenLegalModal('terms')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                {t.termsOfService}
              </button>

              <button
                type="button"
                onClick={() => onOpenLegalModal('about')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                {t.aboutUs}
              </button>

              <button
                type="button"
                onClick={() => onOpenLegalModal('contact')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                {t.contactUs}
              </button>

              <button
                type="button"
                onClick={() => onOpenLegalModal('dmca')}
                className="text-amber-400/90 hover:text-amber-300 transition-colors cursor-pointer flex items-center gap-1"
              >
                <Scale className="w-3.5 h-3.5" />
                <span>{t.dmcaPolicy}</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Bottom Footer Row: Copyright & Disclaimers */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-400 text-center sm:text-left">
          <p>{t.footerCopyright}</p>
          <p className="text-[11px] text-neutral-400 font-mono">
            {lang === 'ar'
              ? 'جميع الصور المعروضة مرخصة للاستخدام الشخصي المجاني · متوافق مع سياسات الإعلانات وحماية البيانات'
              : 'Curated for personal desktop customization · GDPR, CCPA & AdSense compliant architecture'}
          </p>
        </div>
      </div>
    </footer>
  );
};
