import React, { useState } from 'react';
import {
  X,
  Download,
  Heart,
  Monitor,
  Smartphone,
  Check,
  Sparkles,
  Maximize2,
  Info,
  Play,
  Film,
  Flame,
  ChevronDown,
  HelpCircle,
  Apple
} from 'lucide-react';
import { Wallpaper, Language } from '../types';
import { translations } from '../translations';
import {
  downloadWallpaperWithResolution,
  downloadLiveMotionVideo,
  downloadDirectMediaFile,
  detectMediaExtension,
  downloadMobileLiveWallpaper,
  detectMobilePlatform,
  MobilePlatform,
} from '../utils/downloadEngine';
import { LiveMotionCanvas } from './LiveMotionCanvas';
import { getCategoryFallback, getSvgCardPlaceholder, markUrlAsFailed, isVideoUrl } from '../utils/mediaUtils';
import { cleanWallpaperTitle } from '../utils/titleSanitizer';

interface DownloadModalProps {
  wallpaper: Wallpaper | null;
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  isFavorited: boolean;
  onToggleFavorite: (id: string) => void;
  onRecordDownload: (wallpaper: Wallpaper, resolutionStr: string) => void;
}

interface ResolutionOption {
  id: string;
  labelKey: 'res4K' | 'res2K' | 'resFHD' | 'resUltraWide' | 'resMobile';
  width: number;
  height: number;
  aspectRatio: string;
  isMobile?: boolean;
  estSize: string;
}

const RESOLUTION_OPTIONS: ResolutionOption[] = [
  {
    id: '4k',
    labelKey: 'res4K',
    width: 3840,
    height: 2160,
    aspectRatio: '16:9',
    estSize: '12 - 16 MB',
  },
  {
    id: '2k',
    labelKey: 'res2K',
    width: 2560,
    height: 1440,
    aspectRatio: '16:9',
    estSize: '6 - 9 MB',
  },
  {
    id: 'fhd',
    labelKey: 'resFHD',
    width: 1920,
    height: 1080,
    aspectRatio: '16:9',
    estSize: '3 - 5 MB',
  },
  {
    id: 'ultrawide',
    labelKey: 'resUltraWide',
    width: 3440,
    height: 1440,
    aspectRatio: '21:9',
    estSize: '8 - 11 MB',
  },
  {
    id: 'mobile',
    labelKey: 'resMobile',
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    isMobile: true,
    estSize: '4 - 7 MB',
  },
];

export const DownloadModal: React.FC<DownloadModalProps> = ({
  wallpaper,
  isOpen,
  onClose,
  lang,
  isFavorited,
  onToggleFavorite,
  onRecordDownload,
}) => {
  const [selectedResId, setSelectedResId] = useState<string>('4k');
  const [downloading, setDownloading] = useState(false);
  const [recordingVideo, setRecordingVideo] = useState(false);
  const [downloadingMobile, setDownloadingMobile] = useState<MobilePlatform | null>(null);
  const [mobilePlatform, setMobilePlatform] = useState<MobilePlatform>(() => detectMobilePlatform());
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(false);
  const [isLiveMotionOn, setIsLiveMotionOn] = useState<boolean>(true);
  const [previewImgUrl, setPreviewImgUrl] = useState<string>(wallpaper?.url || '');
  const [videoError, setVideoError] = useState(false);

  React.useEffect(() => {
    if (wallpaper) {
      const isVid = Boolean(
        wallpaper.isLive &&
          (wallpaper.videoUrl ||
            wallpaper.formatType === 'video' ||
            isVideoUrl(wallpaper.url) ||
            isVideoUrl(wallpaper.videoUrl))
      );
      const safeImg = isVid
        ? (wallpaper.posterUrl || wallpaper.thumbnailUrl || getCategoryFallback(wallpaper.category))
        : (wallpaper.posterUrl || wallpaper.url);
      setPreviewImgUrl(safeImg);
      setVideoError(false);
    }
  }, [
    wallpaper?.id,
    wallpaper?.url,
    wallpaper?.videoUrl,
    wallpaper?.posterUrl,
    wallpaper?.thumbnailUrl,
    wallpaper?.category,
  ]);

  if (!isOpen || !wallpaper) return null;

  const t = translations[lang];
  const selectedRes = RESOLUTION_OPTIONS.find((r) => r.id === selectedResId) || RESOLUTION_OPTIONS[0];
  const rawTitle = wallpaper.title[lang] || wallpaper.title.en;
  const currentTitle = cleanWallpaperTitle(rawTitle);

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    setDownloadSuccess(false);

    try {
      const safeTitle = currentTitle.replace(/[^a-zA-Z0-9_\-\u0600-\u06FF]/g, '_').slice(0, 30) || 'Wallpaper';
      const filename = `DeskSpace4K_${safeTitle}_${selectedRes.width}x${selectedRes.height}`;

      // If wallpaper.url is a video, use posterUrl or preview image for still frame canvas rendering
      const imgUrlToUse = isVideoUrl(wallpaper.url)
        ? (wallpaper.posterUrl || previewImgUrl || getCategoryFallback(wallpaper.category))
        : (wallpaper.url || previewImgUrl);

      await downloadWallpaperWithResolution({
        imageUrl: imgUrlToUse,
        filename,
        targetWidth: selectedRes.width,
        targetHeight: selectedRes.height,
        quality: 0.95,
      });

      onRecordDownload(wallpaper, `${selectedRes.width}×${selectedRes.height}`);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadLiveVideo = async () => {
    if (recordingVideo) return;
    setRecordingVideo(true);
    setDownloadSuccess(false);

    try {
      const safeTitle = currentTitle.replace(/[^a-zA-Z0-9_\-\u0600-\u06FF]/g, '_').slice(0, 30) || 'Wallpaper';
      const baseFilename = `DeskSpace4K_LiveMotion_${safeTitle}_1080p`;

      const videoSrc = wallpaper.videoUrl || (isVideoUrl(wallpaper.url) ? wallpaper.url : null);
      if (videoSrc) {
        // Genuine video file download (.mp4 or .webm)
        await downloadDirectMediaFile(videoSrc, baseFilename, detectMediaExtension(videoSrc, 'mp4'));
      } else {
        // Canvas particle live motion loop
        await downloadLiveMotionVideo(wallpaper.url || previewImgUrl, wallpaper.category, baseFilename);
      }

      onRecordDownload(wallpaper, '4K Live Motion Video');
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error('Video download error:', err);
    } finally {
      setRecordingVideo(false);
    }
  };

  const handleDownloadMobileLive = async (targetPlatform: MobilePlatform) => {
    if (downloadingMobile || downloading || recordingVideo) return;
    setDownloadingMobile(targetPlatform);
    setDownloadSuccess(false);

    try {
      const safeTitle = currentTitle.replace(/[^a-zA-Z0-9_\-\u0600-\u06FF]/g, '_').slice(0, 30) || 'Wallpaper';
      const baseFilename = `DeskSpace4K_${safeTitle}`;
      const videoSrc = wallpaper.videoUrl || (isVideoUrl(wallpaper.url) ? wallpaper.url : null);
      const mediaSource = videoSrc || wallpaper.url || previewImgUrl;

      await downloadMobileLiveWallpaper(
        mediaSource,
        wallpaper.category,
        baseFilename,
        targetPlatform
      );

      const label = targetPlatform === 'ios' ? 'iPhone Live Photo (MP4)' : 'Android Live Wallpaper (MP4)';
      onRecordDownload(wallpaper, label);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error('Mobile Live download error:', err);
    } finally {
      setDownloadingMobile(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div
        className="relative w-full max-w-5xl my-auto bg-[#161618] border border-[#262833] rounded-2xl shadow-2xl overflow-hidden transition-all flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#262833] bg-[#121316]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-tight">
                {t.modalTitle}
              </h2>
              <p className="text-xs text-neutral-400 truncate max-w-xs sm:max-w-md">
                {currentTitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleFavorite(wallpaper.id)}
              className={`min-h-[44px] min-w-[44px] p-2.5 rounded-xl border transition-all flex items-center justify-center touch-manipulation active:scale-95 cursor-pointer ${
                isFavorited
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                  : 'bg-[#1E1F24] border-[#2A2C38] text-neutral-400 hover:text-white hover:bg-[#252834]'
              }`}
              title={isFavorited ? t.removeFromFavorites : t.addToFavorites}
            >
              <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-[#1E1F24] border border-[#2A2C38] text-neutral-400 hover:text-white hover:bg-[#252834] transition-colors flex items-center justify-center touch-manipulation active:scale-95 cursor-pointer"
              aria-label={t.close}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Left / Top: Interactive Media Preview Area */}
          <div className="lg:col-span-7 p-4 sm:p-6 bg-[#0E0F12] flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-[#262833] relative">
            {/* Preview Frame - 100% Clean without overlays covering the artwork */}
            <div className="w-full flex items-center justify-center min-h-[260px] sm:min-h-[340px] md:min-h-[400px]">
              {selectedRes.isMobile ? (
                /* Mobile Phone Frame Preview */
                <div className="relative w-[210px] sm:w-[240px] h-[380px] sm:h-[440px] rounded-[36px] p-2 bg-[#1C1D24] border-4 border-[#323647] shadow-2xl overflow-hidden flex flex-col items-center">
                  {/* Phone Notch/Island */}
                  <div className="w-20 h-4 bg-black rounded-full mb-1 z-20 shrink-0" />
                  <div className="relative w-full h-full rounded-[28px] overflow-hidden bg-black">
                    {wallpaper.isLive && !videoError && (wallpaper.videoUrl || /\.(mp4|webm|mov|avi)$/i.test(wallpaper.url)) ? (
                      <video
                        src={wallpaper.videoUrl || wallpaper.url}
                        autoPlay
                        loop
                        muted
                        playsInline
                        onError={() => setVideoError(true)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={previewImgUrl || getCategoryFallback(wallpaper.category)}
                        alt={currentTitle}
                        referrerPolicy="no-referrer"
                        onError={() => {
                          markUrlAsFailed(previewImgUrl);
                          if (previewImgUrl !== getCategoryFallback(wallpaper.category)) {
                            setPreviewImgUrl(getCategoryFallback(wallpaper.category));
                          } else {
                            setPreviewImgUrl(getSvgCardPlaceholder(currentTitle, wallpaper.category));
                          }
                        }}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                </div>
              ) : (
                /* Desktop Monitor Frame Preview - Pure & Unobstructed */
                <div
                  className={`relative w-full max-w-xl rounded-xl overflow-hidden shadow-2xl border border-[#2D3040] bg-[#14151B] transition-transform ${
                    previewZoom ? 'scale-105 z-20 cursor-zoom-out' : 'cursor-zoom-in'
                  }`}
                  onClick={() => setPreviewZoom(!previewZoom)}
                >
                  {wallpaper.isLive && !videoError && (wallpaper.videoUrl || /\.(mp4|webm|mov|avi)$/i.test(wallpaper.url)) ? (
                    <video
                      src={wallpaper.videoUrl || wallpaper.url}
                      autoPlay
                      loop
                      muted
                      playsInline
                      onError={() => {
                        markUrlAsFailed(wallpaper.videoUrl || wallpaper.url);
                        setVideoError(true);
                      }}
                      className="w-full h-auto aspect-video object-cover"
                    />
                  ) : (
                    <img
                      src={previewImgUrl || getCategoryFallback(wallpaper.category)}
                      alt={currentTitle}
                      referrerPolicy="no-referrer"
                      onError={() => {
                        markUrlAsFailed(previewImgUrl);
                        if (previewImgUrl !== getCategoryFallback(wallpaper.category)) {
                          setPreviewImgUrl(getCategoryFallback(wallpaper.category));
                        } else {
                          setPreviewImgUrl(getSvgCardPlaceholder(currentTitle, wallpaper.category));
                        }
                      }}
                      className="w-full h-auto aspect-video object-cover"
                    />
                  )}
                </div>
              )}
            </div>

            {/* Clean Info Bar below preview frame */}
            <div className="w-full mt-3 flex flex-wrap items-center justify-between text-xs text-neutral-400 gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-cyan-400 font-bold">
                  {selectedRes.width} × {selectedRes.height}
                </span>
                <span>·</span>
                <span>{selectedRes.aspectRatio}</span>
                {wallpaper.isLive && (
                  <>
                    <span>·</span>
                    <span className="text-rose-400 font-semibold flex items-center gap-1">
                      <Play className="w-2.5 h-2.5 fill-current" />
                      <span>Live 60 FPS</span>
                    </span>
                  </>
                )}
              </div>
              <span className="text-[11px] text-neutral-500">
                {previewZoom ? '100% Fit' : t.previewModeDesktop}
              </span>
            </div>

            {/* Color Palette Indicators */}
            {wallpaper.colorPalette && wallpaper.colorPalette.length > 0 && (
              <div className="w-full mt-4 flex items-center justify-between pt-3 border-t border-[#22242F] text-xs text-neutral-400">
                <span className="text-neutral-400">{t.colorPalette}:</span>
                <div className="flex items-center gap-1.5">
                  {wallpaper.colorPalette.map((color, idx) => (
                    <div
                      key={idx}
                      className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Technical Specs & Resolution Selector */}
          <div className="lg:col-span-5 p-5 sm:p-6 flex flex-col justify-between bg-[#161618]">
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-white tracking-wide uppercase mb-3 flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-cyan-400" />
                  {t.selectResolution}
                </h3>

                {/* Resolution selector radio cards */}
                <div className="space-y-2">
                  {RESOLUTION_OPTIONS.map((opt) => {
                    const isSelected = opt.id === selectedResId;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedResId(opt.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-gradient-to-r from-cyan-950/40 to-blue-950/30 border-cyan-500/60 text-white shadow-md shadow-cyan-950/20'
                            : 'bg-[#1C1E26] border-[#292C3B] text-neutral-300 hover:border-neutral-600 hover:bg-[#222530]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg ${
                              isSelected ? 'bg-cyan-500 text-black' : 'bg-[#262836] text-neutral-400'
                            }`}
                          >
                            {opt.isMobile ? (
                              <Smartphone className="w-4 h-4" />
                            ) : (
                              <Monitor className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white flex items-center gap-2">
                              {t[opt.labelKey]}
                            </div>
                            <div className="text-xs text-neutral-400 flex items-center gap-1.5">
                              <span>{opt.aspectRatio}</span>
                              <span>·</span>
                              <span>{opt.estSize}</span>
                            </div>
                          </div>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                            isSelected
                              ? 'border-cyan-400 bg-cyan-500 text-black'
                              : 'border-neutral-600'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Technical Specifications Summary */}
              <div className="p-3.5 rounded-xl bg-[#131418] border border-[#242632] space-y-2">
                <div className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-cyan-400" />
                  {t.specs}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-neutral-500 block">{t.dimensions}</span>
                    <span className="text-white font-mono">{selectedRes.width} × {selectedRes.height} px</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block">{t.aspectRatio}</span>
                    <span className="text-white font-mono">{selectedRes.aspectRatio}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block">{t.fileSize}</span>
                    <span className="text-white font-mono">{selectedRes.estSize}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block">{t.format}</span>
                    <span className="text-white font-mono">JPG / 4K UHD</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-5 pt-3.5 border-t border-[#262833] space-y-3">
              {downloadSuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-fade-in">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{t.downloadSuccess}</span>
                </div>
              )}

              {/* Dedicated Mobile Live Photo / Live Wallpaper Section */}
              <div className="p-3 sm:p-3.5 rounded-xl bg-gradient-to-b from-[#181A24] to-[#12131A] border border-cyan-500/30 space-y-2.5 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/25">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white tracking-wide">
                        {t.mobileLiveOptionsTitle}
                      </h4>
                      <p className="text-[10px] text-neutral-400">
                        {t.mobileLiveDesc}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Platform Toggle Tabs (iPhone vs Android) */}
                <div className="grid grid-cols-2 gap-1.5 bg-[#0E0F14] p-1 rounded-xl border border-[#272A3C]">
                  <button
                    type="button"
                    onClick={() => setMobilePlatform('ios')}
                    className={`min-h-[40px] px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer touch-manipulation active:scale-95 ${
                      mobilePlatform === 'ios'
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-black shadow-md'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Apple className="w-3.5 h-3.5" />
                    <span>iPhone (iOS)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMobilePlatform('android')}
                    className={`min-h-[40px] px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer touch-manipulation active:scale-95 ${
                      mobilePlatform === 'android'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-black shadow-md'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Android</span>
                  </button>
                </div>

                {/* Primary Mobile Live Download CTA Button */}
                <button
                  type="button"
                  onClick={() => handleDownloadMobileLive(mobilePlatform)}
                  disabled={Boolean(downloadingMobile) || downloading || recordingVideo}
                  className={`w-full flex items-center justify-center gap-2.5 min-h-[48px] py-3 px-4 rounded-xl font-black text-xs sm:text-sm text-white shadow-lg transition-all touch-manipulation active:scale-[0.98] disabled:opacity-60 cursor-pointer ${
                    mobilePlatform === 'ios'
                      ? 'bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 shadow-cyan-500/25'
                      : 'bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 shadow-emerald-500/25'
                  }`}
                >
                  {downloadingMobile === mobilePlatform ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                      <span>{lang === 'ar' ? 'جاري تصدير فيديو الهاتف 9:16...' : 'Generating 9:16 Mobile Loop...'}</span>
                    </>
                  ) : (
                    <>
                      <Film className="w-4 h-4 shrink-0" />
                      <span className="truncate">
                        {mobilePlatform === 'ios' ? t.downloadForIPhone : t.downloadForAndroid}
                      </span>
                    </>
                  )}
                </button>

                {/* Step-by-Step Instructions Toggle Accordion */}
                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={() => setIsGuideOpen(!isGuideOpen)}
                    className="w-full flex items-center justify-between text-[11px] text-neutral-300 hover:text-cyan-300 transition-colors py-1 cursor-pointer touch-manipulation"
                  >
                    <span className="flex items-center gap-1.5 font-semibold">
                      <HelpCircle className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>{t.mobileGuideToggle}</span>
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 shrink-0 ${
                        isGuideOpen ? 'rotate-180 text-cyan-400' : ''
                      }`}
                    />
                  </button>

                  {isGuideOpen && (
                    <div className="mt-2 p-3 rounded-xl bg-[#0F1016] border border-[#232635] text-[11px] space-y-2 text-neutral-300 animate-fade-in">
                      <div className="font-bold text-cyan-400 text-xs flex items-center gap-1.5">
                        {mobilePlatform === 'ios' ? (
                          <>
                            <Apple className="w-3.5 h-3.5 shrink-0" />
                            <span>{t.mobileGuideIos}</span>
                          </>
                        ) : (
                          <>
                            <Smartphone className="w-3.5 h-3.5 shrink-0" />
                            <span>{t.mobileGuideAndroid}</span>
                          </>
                        )}
                      </div>

                      {mobilePlatform === 'ios' ? (
                        <div className="space-y-1.5 text-neutral-300 leading-snug">
                          <p>{t.iosStep1}</p>
                          <p>{t.iosStep2}</p>
                          <p>{t.iosStep3}</p>
                        </div>
                      ) : (
                        <div className="space-y-1.5 text-neutral-300 leading-snug">
                          <p>{t.androidStep1}</p>
                          <p>{t.androidStep2}</p>
                          <p>{t.androidStep3}</p>
                        </div>
                      )}

                      <div className="pt-1.5 text-[10px] text-neutral-400 border-t border-[#1C1E2B] leading-tight">
                        {t.mobileNotice}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Still Photo Download Button */}
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading || recordingVideo || Boolean(downloadingMobile)}
                className="w-full flex items-center justify-center gap-2.5 min-h-[48px] py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-[#1E202B] hover:bg-[#252836] border border-[#2E3244] hover:border-cyan-500/50 text-white shadow-md transition-all touch-manipulation active:scale-[0.98] disabled:opacity-60 cursor-pointer"
              >
                {downloading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                    <span>{t.processingDownload}</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 stroke-[2.5] text-cyan-400 shrink-0" />
                    <span className="truncate">
                      {selectedRes.isMobile ? t.downloadMobileStill : `${t.downloadStillFrame} (${selectedRes.width}×${selectedRes.height})`}
                    </span>
                  </>
                )}
              </button>

              {/* Desktop 16:9 Live Motion Video Button */}
              {isLiveMotionOn && !selectedRes.isMobile && (
                <button
                  type="button"
                  onClick={handleDownloadLiveVideo}
                  disabled={recordingVideo || downloading || Boolean(downloadingMobile)}
                  className="w-full flex items-center justify-center gap-2 min-h-[44px] py-2.5 px-4 rounded-xl font-medium text-xs bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 transition-all touch-manipulation active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                >
                  {recordingVideo ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-rose-400 border-t-transparent rounded-full animate-spin shrink-0" />
                      <span>{lang === 'ar' ? 'جاري تصدير فيديو 60 FPS...' : 'Rendering 60 FPS Video...'}</span>
                    </>
                  ) : (
                    <>
                      <Film className="w-3.5 h-3.5 shrink-0" />
                      <span>{t.downloadLiveVideo}</span>
                    </>
                  )}
                </button>
              )}

              <p className="text-[10px] text-neutral-400 text-center leading-tight pt-1">
                {t.liveNotice}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
