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
  Apple,
  Copy,
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
  const isMobileInitial = Boolean(
    wallpaper?.aspectRatio === '9:16' ||
    wallpaper?.deviceFormat === 'mobile' ||
    wallpaper?.isMobile ||
    wallpaper?.category === 'Mobile' ||
    (typeof window !== 'undefined' && window.innerWidth < 768)
  );

  const [activeTab, setActiveTab] = useState<'mobile' | 'desktop'>(() => (isMobileInitial ? 'mobile' : 'desktop'));
  const [selectedResId, setSelectedResId] = useState<string>(() => (isMobileInitial ? 'mobile' : '4k'));
  const [downloading, setDownloading] = useState(false);
  const [recordingVideo, setRecordingVideo] = useState(false);
  const [downloadingMobile, setDownloadingMobile] = useState<MobilePlatform | null>(null);
  const [mobilePlatform, setMobilePlatform] = useState<MobilePlatform>(() => detectMobilePlatform());
  const [isGuideOpen, setIsGuideOpen] = useState(true);
  const [copiedSteps, setCopiedSteps] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(false);
  const [isLiveMotionOn, setIsLiveMotionOn] = useState<boolean>(true);
  const [previewImgUrl, setPreviewImgUrl] = useState<string>(wallpaper?.url || '');
  const [videoError, setVideoError] = useState(false);

  React.useEffect(() => {
    if (wallpaper) {
      const isMob = Boolean(
        wallpaper.aspectRatio === '9:16' ||
        wallpaper.deviceFormat === 'mobile' ||
        wallpaper.isMobile ||
        wallpaper.category === 'Mobile' ||
        (typeof window !== 'undefined' && window.innerWidth < 768)
      );
      if (isMob) {
        setActiveTab('mobile');
        setSelectedResId('mobile');
      } else {
        setActiveTab('desktop');
        setSelectedResId('4k');
      }

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
    wallpaper?.aspectRatio,
    wallpaper?.deviceFormat,
    wallpaper?.isMobile,
  ]);

  if (!isOpen || !wallpaper) return null;

  const t = (translations && (translations[lang] || translations.en)) || translations.en;
  const selectedRes = RESOLUTION_OPTIONS.find((r) => r.id === selectedResId) || RESOLUTION_OPTIONS[0];
  const rawTitle = typeof wallpaper.title === 'object' && wallpaper.title
    ? (wallpaper.title[lang] || wallpaper.title.en || wallpaper.title.ar || '')
    : String(wallpaper.title || '');
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

  const handleCopySteps = () => {
    const stepsText =
      mobilePlatform === 'ios'
        ? `${t.mobileGuideIos}:\n${t.iosStep1}\n${t.iosStep2}\n${t.iosStep3}`
        : `${t.mobileGuideAndroid}:\n${t.androidStep1}\n${t.androidStep2}\n${t.androidStep3}`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(stepsText).then(() => {
        setCopiedSteps(true);
        setTimeout(() => setCopiedSteps(false), 2500);
      }).catch(() => {
        setCopiedSteps(true);
        setTimeout(() => setCopiedSteps(false), 2500);
      });
    } else {
      setCopiedSteps(true);
      setTimeout(() => setCopiedSteps(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div
        className="relative w-full max-w-5xl my-0 sm:my-auto bg-[#161618] border-t sm:border border-[#262833] rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden transition-all flex flex-col max-h-[94vh] sm:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Handle Bar */}
        <div className="w-12 h-1.5 bg-[#343748] rounded-full mx-auto my-2 sm:hidden shrink-0" />

        {/* Modal Top Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-[#262833] bg-[#121316] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0 truncate">
              <h2 className="text-sm sm:text-base md:text-lg font-bold text-white tracking-tight leading-tight truncate">
                {t.modalTitle}
              </h2>
              <p className="text-xs text-neutral-400 truncate max-w-xs sm:max-w-md">
                {currentTitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
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

        {/* Format Mode Switcher: Mobile Live (9:16) vs Desktop 4K (16:9) */}
        <div className="px-4 sm:px-6 py-2.5 bg-[#0F1015] border-b border-[#232533] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 p-1 bg-[#181922] rounded-xl border border-[#272938] w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setActiveTab('mobile');
                setSelectedResId('mobile');
              }}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[40px] touch-manipulation ${
                activeTab === 'mobile'
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-black shadow-md font-black'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-4 h-4 shrink-0" />
              <span>{t.tabMobileLive}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('desktop');
                if (selectedResId === 'mobile') setSelectedResId('4k');
              }}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[40px] touch-manipulation ${
                activeTab === 'desktop'
                  ? 'bg-cyan-500 text-black shadow-md font-black'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Monitor className="w-4 h-4 shrink-0" />
              <span>{t.tabDesktop4K}</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-neutral-400">
            <span className="font-mono text-cyan-400 font-semibold">
              {activeTab === 'mobile'
                ? '1080 × 1920 (9:16)'
                : `${selectedRes.width} × ${selectedRes.height} (${selectedRes.aspectRatio})`}
            </span>
          </div>
        </div>

        {/* Modal Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-y-auto no-scrollbar flex-1">
          {/* Left / Top: Interactive Media Preview Area */}
          <div className="lg:col-span-6 p-4 sm:p-6 bg-[#0E0F12] flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-[#262833] relative">
            <div className="w-full flex items-center justify-center min-h-[240px] sm:min-h-[320px] md:min-h-[380px]">
              {activeTab === 'mobile' ? (
                /* Mobile Phone Frame Preview */
                <div className="relative w-[190px] sm:w-[220px] h-[350px] sm:h-[400px] rounded-[34px] p-2 bg-[#1C1D24] border-4 border-[#323647] shadow-2xl overflow-hidden flex flex-col items-center">
                  {/* Phone Notch/Island */}
                  <div className="w-16 h-3.5 bg-black rounded-full mb-1 z-20 shrink-0" />
                  <div className="relative w-full h-full rounded-[26px] overflow-hidden bg-black">
                    {wallpaper.isLive && !videoError && (wallpaper.videoUrl || (wallpaper.url && /\.(mp4|webm|mov|avi)$/i.test(wallpaper.url))) ? (
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
                        src={previewImgUrl || wallpaper.posterUrl || wallpaper.thumbnailUrl || getCategoryFallback(wallpaper.category)}
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
                /* Desktop Monitor Frame Preview */
                <div
                  className={`relative w-full max-w-xl rounded-xl overflow-hidden shadow-2xl border border-[#2D3040] bg-[#14151B] transition-transform ${
                    previewZoom ? 'scale-105 z-20 cursor-zoom-out' : 'cursor-zoom-in'
                  }`}
                  onClick={() => setPreviewZoom(!previewZoom)}
                >
                  {wallpaper.isLive && !videoError && (wallpaper.videoUrl || (wallpaper.url && /\.(mp4|webm|mov|avi)$/i.test(wallpaper.url))) ? (
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
                      src={previewImgUrl || wallpaper.posterUrl || wallpaper.thumbnailUrl || getCategoryFallback(wallpaper.category)}
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
                  {activeTab === 'mobile' ? '1080 × 1920' : `${selectedRes.width} × ${selectedRes.height}`}
                </span>
                <span>·</span>
                <span>{activeTab === 'mobile' ? '9:16 Mobile' : selectedRes.aspectRatio}</span>
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
                {activeTab === 'mobile' ? 'Mobile Lock Screen Fit' : previewZoom ? '100% Fit' : t.previewModeDesktop}
              </span>
            </div>
          </div>

          {/* Right: Technical Specs & Download Options */}
          <div className="lg:col-span-6 p-4 sm:p-6 flex flex-col justify-between bg-[#161618] space-y-4">
            {downloadSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-fade-in shadow-md">
                <Check className="w-4 h-4 shrink-0 stroke-[2.5]" />
                <span className="font-semibold">{t.downloadSuccess}</span>
              </div>
            )}

            {activeTab === 'mobile' ? (
              /* ======================================================== */
              /* TAB 1: DEDICATED MOBILE LIVE WALLPAPER / LIVE PHOTO VIEW */
              /* ======================================================== */
              <div className="space-y-4">
                {/* Platform Selector (iPhone iOS vs Android) */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2 block">
                    {t.detectedDevice || 'Target Device Platform'}
                  </label>
                  <div className="grid grid-cols-2 gap-2 bg-[#0E0F14] p-1.5 rounded-2xl border border-[#272A3C]">
                    <button
                      type="button"
                      onClick={() => setMobilePlatform('ios')}
                      className={`min-h-[46px] px-3 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer touch-manipulation active:scale-95 ${
                        mobilePlatform === 'ios'
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-black shadow-lg font-black'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <Apple className="w-4 h-4 shrink-0" />
                      <span>iPhone (iOS 17+)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMobilePlatform('android')}
                      className={`min-h-[46px] px-3 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer touch-manipulation active:scale-95 ${
                        mobilePlatform === 'android'
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-black shadow-lg font-black'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <Smartphone className="w-4 h-4 shrink-0" />
                      <span>Android (Galaxy/Pixel)</span>
                    </button>
                  </div>
                </div>

                {/* Primary Mobile Live CTA Button */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadMobileLive(mobilePlatform)}
                    disabled={Boolean(downloadingMobile) || downloading || recordingVideo}
                    className={`w-full flex items-center justify-center gap-2.5 min-h-[52px] py-3.5 px-5 rounded-2xl font-black text-sm text-white shadow-xl transition-all touch-manipulation active:scale-[0.98] disabled:opacity-60 cursor-pointer ${
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
                        <Film className="w-4 h-4 shrink-0 animate-pulse" />
                        <span className="truncate">
                          {mobilePlatform === 'ios'
                            ? (lang === 'ar' ? 'تحميل كخلفية حية لـ iPhone (Live Photo)' : 'Download Live Wallpaper for iPhone')
                            : (lang === 'ar' ? 'تحميل كفيديو حية لـ Android' : 'Download Live Wallpaper for Android')}
                        </span>
                      </>
                    )}
                  </button>

                  {/* Secondary Mobile Still Photo Button */}
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={downloading || recordingVideo || Boolean(downloadingMobile)}
                    className="w-full flex items-center justify-center gap-2 min-h-[44px] py-2.5 px-4 rounded-xl font-bold text-xs bg-[#1E202B] hover:bg-[#252836] border border-[#2E3244] text-neutral-200 hover:text-white transition-all touch-manipulation active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                  >
                    {downloading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                        <span>{t.processingDownload}</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>{t.downloadMobileStill}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Step-by-Step Instructions Panel (Interactive Accordion) */}
                <div className="p-3.5 rounded-2xl bg-[#0F1016] border border-[#232635] space-y-3">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setIsGuideOpen(!isGuideOpen)}
                      className="flex items-center gap-2 text-xs font-bold text-white hover:text-cyan-300 transition-colors cursor-pointer touch-manipulation"
                    >
                      <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>{t.mobileGuideToggle}</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ${
                          isGuideOpen ? 'rotate-180 text-cyan-400' : ''
                        }`}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={handleCopySteps}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#191B26] hover:bg-[#222534] border border-[#2D3144] text-[11px] text-neutral-300 hover:text-white transition-all cursor-pointer touch-manipulation"
                      title={t.copySteps}
                    >
                      {copiedSteps ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400 font-semibold">{t.stepsCopied}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-cyan-400" />
                          <span>{t.copySteps}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {isGuideOpen && (
                    <div className="space-y-2 text-xs text-neutral-300 pt-1 border-t border-[#1C1E2B] animate-fade-in leading-relaxed">
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
                        <div className="space-y-1.5 text-neutral-300">
                          <p className="bg-[#14151F] p-2 rounded-xl border border-[#222538]">{t.iosStep1}</p>
                          <p className="bg-[#14151F] p-2 rounded-xl border border-[#222538]">{t.iosStep2}</p>
                          <p className="bg-[#14151F] p-2 rounded-xl border border-[#222538]">{t.iosStep3}</p>
                        </div>
                      ) : (
                        <div className="space-y-1.5 text-neutral-300">
                          <p className="bg-[#14151F] p-2 rounded-xl border border-[#222538]">{t.androidStep1}</p>
                          <p className="bg-[#14151F] p-2 rounded-xl border border-[#222538]">{t.androidStep2}</p>
                          <p className="bg-[#14151F] p-2 rounded-xl border border-[#222538]">{t.androidStep3}</p>
                        </div>
                      )}

                      <p className="text-[10px] text-neutral-400 pt-1 leading-normal">
                        {mobilePlatform === 'ios' ? t.iosNotice : t.androidNotice}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* ======================================================== */
              /* TAB 2: DESKTOP 4K RESOLUTION & STILL DOWNLOAD VIEW       */
              /* ======================================================== */
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2 flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-cyan-400" />
                    {t.selectResolution}
                  </h3>

                  <div className="space-y-2">
                    {RESOLUTION_OPTIONS.filter((r) => !r.isMobile).map((opt) => {
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
                              <Monitor className="w-4 h-4" />
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

                {/* Primary Desktop 4K Still Download Button */}
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloading || recordingVideo || Boolean(downloadingMobile)}
                  className="w-full flex items-center justify-center gap-2.5 min-h-[50px] py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black shadow-lg shadow-cyan-500/25 transition-all touch-manipulation active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                >
                  {downloading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin shrink-0" />
                      <span>{t.processingDownload}</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 stroke-[2.5] shrink-0" />
                      <span className="truncate">
                        {`${t.downloadStillFrame} (${selectedRes.width}×${selectedRes.height})`}
                      </span>
                    </>
                  )}
                </button>

                {/* Desktop 16:9 Live Motion Video Button */}
                {isLiveMotionOn && (
                  <button
                    type="button"
                    onClick={handleDownloadLiveVideo}
                    disabled={recordingVideo || downloading || Boolean(downloadingMobile)}
                    className="w-full flex items-center justify-center gap-2 min-h-[46px] py-2.5 px-4 rounded-xl font-semibold text-xs bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 transition-all touch-manipulation active:scale-[0.98] disabled:opacity-60 cursor-pointer"
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
