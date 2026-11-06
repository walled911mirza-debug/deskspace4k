import React from 'react';
import { Monitor, ExternalLink } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../translations';

interface AdBannerProps {
  lang: Language;
  className?: string;
}

export const AdBanner: React.FC<AdBannerProps> = ({ lang, className = '' }) => {
  const t = translations[lang];

  return (
    <div className={`w-full max-w-5xl mx-auto my-8 px-4 ${className}`}>
      <div className="relative rounded-2xl bg-gradient-to-r from-[#14151B] via-[#181A22] to-[#14151B] border border-[#262835] p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 overflow-hidden shadow-lg">
        {/* Ad label for compliance */}
        <span className="absolute top-2 right-3 text-[10px] uppercase font-mono tracking-wider text-neutral-400 bg-[#1D1F28] px-2 py-0.5 rounded border border-neutral-800">
          {t.adLabel}
        </span>

        <div className="flex items-center gap-4 text-left">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <Monitor className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
              <span>Apex OLED 4K Ultrawide Displays</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-gradient-to-r from-cyan-500 to-purple-600 text-black font-bold">
                144Hz
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5 line-clamp-1">
              Elevate your workspace with true 10-bit HDR and 99.8% DCI-P3 color reproduction.
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.open('https://www.google.com', '_blank', 'noopener,noreferrer')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#202330] hover:bg-[#282C3D] border border-[#2D3144] text-xs font-semibold text-neutral-200 hover:text-white transition-colors cursor-pointer"
          >
            <span>Learn More</span>
            <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
          </button>
        </div>
      </div>
    </div>
  );
};
