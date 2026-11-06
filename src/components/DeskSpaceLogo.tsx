import React from 'react';

interface DeskSpaceLogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export const DeskSpaceLogo: React.FC<DeskSpaceLogoProps> = ({
  size = 40,
  showText = true,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* 1:1 Aspect Ratio Glowing Emblem Matching User's Design */}
      <div
        className="relative flex items-center justify-center shrink-0 rounded-xl overflow-hidden shadow-lg shadow-cyan-500/10 border border-[#23273D] bg-[#0E101A]"
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 512 512"
          className="w-full h-full p-0.5"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="logoInnerGlow" cx="50%" cy="50%" r="65%">
              <stop offset="0%" stopColor="#24153E" />
              <stop offset="70%" stopColor="#0E101A" />
              <stop offset="100%" stopColor="#08090F" />
            </radialGradient>

            <linearGradient id="logoMonitorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#EC4899" />
              <stop offset="35%" stopColor="#A855F7" />
              <stop offset="70%" stopColor="#06B6D4" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>

            <linearGradient id="logoDGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00F0FF" />
              <stop offset="30%" stopColor="#EC4899" />
              <stop offset="70%" stopColor="#FF5500" />
              <stop offset="100%" stopColor="#FACC15" />
            </linearGradient>
          </defs>

          {/* Background fill */}
          <rect width="512" height="512" rx="100" fill="url(#logoInnerGlow)" />

          {/* Glowing particle haze */}
          <circle cx="250" cy="240" r="120" fill="#9333EA" opacity="0.3" filter="blur(30px)" />
          <circle cx="170" cy="260" r="80" fill="#EC4899" opacity="0.35" filter="blur(25px)" />
          <circle cx="340" cy="220" r="70" fill="#06B6D4" opacity="0.3" filter="blur(25px)" />

          {/* Screen area */}
          <rect x="180" y="160" width="180" height="140" rx="16" fill="#150D28" stroke="rgba(255,255,255,0.06)" strokeWidth="2" />

          {/* Monitor Outline */}
          <rect
            x="170"
            y="145"
            width="200"
            height="165"
            rx="20"
            fill="none"
            stroke="url(#logoMonitorGrad)"
            strokeWidth="15"
            strokeLinecap="round"
          />

          {/* Monitor Stand */}
          <path
            d="M225 315 L205 348 L335 348 L315 315"
            fill="none"
            stroke="#00F0FF"
            strokeWidth="14"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Neon D Letter */}
          <path
            d="M125 150 L185 150 C235 150, 260 185, 260 230 C260 275, 235 310, 185 310 L125 310 Z"
            fill="none"
            stroke="url(#logoDGrad)"
            strokeWidth="18"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M152 185 L180 185 C205 185, 222 205, 222 230 C222 255, 205 275, 180 275 L152 275 Z"
            fill="none"
            stroke="url(#logoDGrad)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.95"
          />

          {/* 4K Digital Pixel Cubes */}
          <rect x="335" y="115" width="20" height="20" rx="3" fill="#EC4899" />
          <rect x="362" y="102" width="18" height="18" rx="3" fill="#FACC15" />
          <rect x="362" y="130" width="22" height="22" rx="4" fill="#00F0FF" />
          <rect x="394" y="115" width="16" height="16" rx="3" fill="#A855F7" />
          <rect x="390" y="142" width="17" height="17" rx="3" fill="#39FF14" />
        </svg>
      </div>

      {/* Brand Wordmark */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white">
              DeskSpace
            </span>
            <span className="font-black text-xs sm:text-sm px-1.5 py-0.5 rounded bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-black font-mono tracking-wider shadow-sm shadow-cyan-500/20">
              4K
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
