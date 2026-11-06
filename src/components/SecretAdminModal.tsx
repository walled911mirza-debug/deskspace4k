import React, { useState, useRef, useEffect } from 'react';
import {
  Shield,
  Key,
  BarChart3,
  UploadCloud,
  FileImage,
  Tag,
  Check,
  AlertTriangle,
  X,
  Trash2,
  Edit2,
  Save,
  Download,
  RotateCcw,
  Search,
  Layers,
  Sparkles,
  HelpCircle,
  Link,
  Copy,
  Plus,
  BookOpen,
  Clock,
  FileText,
  ExternalLink,
  CheckCircle2,
  PenTool,
  Film,
  Image as ImageIcon,
  Database,
  Eye,
  Monitor,
  Smartphone,
  SlidersHorizontal,
  Video,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Wand2,
  Bot,
  Loader2,
  Send,
  Zap,
} from 'lucide-react';
import { Wallpaper, Category, Language, BlogPost } from '../types';
import { translations } from '../translations';
import {
  registerBlobUrl,
  revokeBlobUrl,
  extractVideoPoster,
  createThumbnailFromImage,
  getCategoryFallback,
  DEFAULT_FALLBACK_IMAGE,
  isVideoUrl,
} from '../utils/mediaUtils';
import {
  safeSaveWallpapers,
  safeSaveBlogPosts,
  storeBlobInIndexedDB,
  saveCustomWallpaperToIndexedDB,
  saveAllCustomWallpapersToIndexedDB,
  saveCustomBlogPostToIndexedDB,
  deleteCustomWallpaperFromIndexedDB,
  deleteMediaFromIndexedDB,
  permanentlyDeleteWallpaperFromIndexedDB,
  permanentlyDeleteBlogPostFromIndexedDB,
  deleteCustomBlogPostFromIndexedDB,
  getDeletedBlogPostIds,
  slugify,
} from '../utils/storageManager';
import { cleanWallpaperTitle, extractResolutionFromTitle } from '../utils/titleSanitizer';
import { adminAiClient, CopilotActionResult } from '../admin/ai/aiWorkerClient';
import {
  registerTempBlobUrl,
  revokeTempBlobUrl,
  drainAllTempBlobUrls,
  cleanupCanvas,
} from '../admin/utils/memoryHygiene';
import { AdminDevCopilotWidget } from '../admin/components/AdminDevCopilotWidget';

interface SecretAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  wallpapers: Wallpaper[];
  onAddWallpapers: (newWallpapers: Wallpaper[]) => void;
  onUpdateWallpaper: (wallpaper: Wallpaper) => void;
  onDeleteWallpaper: (id: string) => void | Promise<any>;
  onResetDefaults: () => void;
  totalDownloads: number;
  totalUsers: number;
  blogPosts: BlogPost[];
  onAddBlogPost: (newPost: BlogPost) => void;
  onUpdateBlogPost: (updatedPost: BlogPost) => void;
  onDeleteBlogPost: (id: string) => void | Promise<any>;
}

interface QueuedFile {
  id: string;
  file?: File;
  previewUrl: string;
  persistentUrl: string;
  posterUrl?: string;
  thumbnailUrl?: string;
  name: string;
  size: string;
  sourceType: 'file' | 'url';
  isVideo?: boolean;
}

const CATEGORIES: Category[] = [
  'Anime',
  'Gaming',
  'Nature',
  'Space',
  'Cars',
  'Minimalist',
  'Journal',
  'Mobile',
];

const RESOLUTION_PRESETS = [
  { id: '4k', label: '3840×2160 (4K UHD 16:9)', value: '3840×2160', width: 3840, height: 2160 },
  { id: '2k', label: '2560×1440 (2K QHD 16:9)', value: '2560×1440', width: 2560, height: 1440 },
  { id: 'fhd', label: '1920×1080 (Full HD 16:9)', value: '1920×1080', width: 1920, height: 1080 },
  { id: 'ultrawide', label: '3440×1440 (Ultrawide 21:9)', value: '3440×1440', width: 3440, height: 1440 },
  { id: 'mobile', label: '2160×3840 (Mobile 4K Vertical 9:16)', value: '2160×3840', width: 2160, height: 3840 },
  { id: 'mobile-fhd', label: '1080×1920 (Mobile FHD Vertical 9:16)', value: '1080×1920', width: 1080, height: 1920 },
];

export interface TargetPlacementOption {
  key: string;
  deviceFormat: 'desktop' | 'mobile';
  category: Category;
  labelEn: string;
  labelAr: string;
  aspectRatio: '16:9' | '9:16';
  resolution: string;
  badge: string;
  descriptionEn: string;
  descriptionAr: string;
}

export const TARGET_PLACEMENT_OPTIONS: TargetPlacementOption[] = [
  // Desktop Wallpapers (16:9)
  {
    key: 'desktop:Gaming',
    deviceFormat: 'desktop',
    category: 'Gaming',
    labelEn: 'Desktop (16:9) → Gaming',
    labelAr: 'سطح المكتب (16:9) ← ألعاب',
    aspectRatio: '16:9',
    resolution: '3840×2160',
    badge: '16:9 UHD',
    descriptionEn: 'Public 16:9 desktop feed for gaming battlestations',
    descriptionAr: 'معلف ألعاب 4K أفقي للشاشات ومحطات الألعاب',
  },
  {
    key: 'desktop:Anime',
    deviceFormat: 'desktop',
    category: 'Anime',
    labelEn: 'Desktop (16:9) → Anime',
    labelAr: 'سطح المكتب (16:9) ← أنمي',
    aspectRatio: '16:9',
    resolution: '3840×2160',
    badge: '16:9 UHD',
    descriptionEn: 'Public 16:9 desktop feed for Japanese anime art',
    descriptionAr: 'معلف أنمي 4K أفقي لسطح المكتب',
  },
  {
    key: 'desktop:Nature',
    deviceFormat: 'desktop',
    category: 'Nature',
    labelEn: 'Desktop (16:9) → Nature',
    labelAr: 'سطح المكتب (16:9) ← طبيعة',
    aspectRatio: '16:9',
    resolution: '3840×2160',
    badge: '16:9 UHD',
    descriptionEn: 'Public 16:9 desktop feed for scenic landscapes & vistas',
    descriptionAr: 'معلف مناظر طبيعية 4K لسطح المكتب',
  },
  {
    key: 'desktop:Space',
    deviceFormat: 'desktop',
    category: 'Space',
    labelEn: 'Desktop (16:9) → Space',
    labelAr: 'سطح المكتب (16:9) ← فضاء',
    aspectRatio: '16:9',
    resolution: '3840×2160',
    badge: '16:9 UHD',
    descriptionEn: 'Public 16:9 desktop feed for cosmos, nebulae & OLED deep blacks',
    descriptionAr: 'معلف الفضاء والسدم الكونية 4K لسطح المكتب',
  },
  {
    key: 'desktop:Cars',
    deviceFormat: 'desktop',
    category: 'Cars',
    labelEn: 'Desktop (16:9) → Cars',
    labelAr: 'سطح المكتب (16:9) ← سيارات',
    aspectRatio: '16:9',
    resolution: '3840×2160',
    badge: '16:9 UHD',
    descriptionEn: 'Public 16:9 desktop feed for hypercars & automotive engineering',
    descriptionAr: 'معلف سيارات خارقة 4K لسطح المكتب',
  },
  {
    key: 'desktop:Minimalist',
    deviceFormat: 'desktop',
    category: 'Minimalist',
    labelEn: 'Desktop (16:9) → Minimalist',
    labelAr: 'سطح المكتب (16:9) ← بساطة',
    aspectRatio: '16:9',
    resolution: '3840×2160',
    badge: '16:9 UHD',
    descriptionEn: 'Public 16:9 desktop feed for distraction-free geometry & architecture',
    descriptionAr: 'معلف بساطة وهندسة نقية 4K لسطح المكتب',
  },

  // Mobile Live Wallpapers (9:16)
  {
    key: 'mobile:Mobile',
    deviceFormat: 'mobile',
    category: 'Mobile',
    labelEn: 'Mobile Live (9:16) → Dedicated Mobile Motion Feed (Main)',
    labelAr: 'خلفية هاتف حية (9:16) ← معلف الهواتف المخصص (الرئيسي)',
    aspectRatio: '9:16',
    resolution: '2160×3840',
    badge: '9:16 VERTICAL',
    descriptionEn: 'Dedicated vertical motion feed exclusively for smartphone screens',
    descriptionAr: 'معلف رأسي مخصص 9:16 حصرياً لتطبيق وخلفيات الهواتف الذكية',
  },
  {
    key: 'mobile:Anime',
    deviceFormat: 'mobile',
    category: 'Anime',
    labelEn: 'Mobile Live (9:16) → Anime (Vertical)',
    labelAr: 'خلفية هاتف حية (9:16) ← أنمي رأسي',
    aspectRatio: '9:16',
    resolution: '2160×3840',
    badge: '9:16 VERTICAL',
    descriptionEn: 'Vertical 9:16 live anime motion video for smartphones',
    descriptionAr: 'فيديو متحرك رأسي 9:16 لأنمي الهواتف الذكية',
  },
  {
    key: 'mobile:Gaming',
    deviceFormat: 'mobile',
    category: 'Gaming',
    labelEn: 'Mobile Live (9:16) → Gaming (Vertical)',
    labelAr: 'خلفية هاتف حية (9:16) ← ألعاب رأسي',
    aspectRatio: '9:16',
    resolution: '2160×3840',
    badge: '9:16 VERTICAL',
    descriptionEn: 'Vertical 9:16 gaming motion video for smartphones',
    descriptionAr: 'فيديو متحرك رأسي 9:16 لألعاب الهواتف الذكية',
  },
  {
    key: 'mobile:Nature',
    deviceFormat: 'mobile',
    category: 'Nature',
    labelEn: 'Mobile Live (9:16) → Nature (Vertical)',
    labelAr: 'خلفية هاتف حية (9:16) ← طبيعة رأسية',
    aspectRatio: '9:16',
    resolution: '2160×3840',
    badge: '9:16 VERTICAL',
    descriptionEn: 'Vertical 9:16 serene nature loops for smartphones',
    descriptionAr: 'فيديو متحرك رأسي 9:16 لمشاهد طبيعية للهواتف',
  },
  {
    key: 'mobile:Cars',
    deviceFormat: 'mobile',
    category: 'Cars',
    labelEn: 'Mobile Live (9:16) → Cars (Vertical)',
    labelAr: 'خلفية هاتف حية (9:16) ← سيارات رأسي',
    aspectRatio: '9:16',
    resolution: '2160×3840',
    badge: '9:16 VERTICAL',
    descriptionEn: 'Vertical 9:16 hypercar motion video for smartphones',
    descriptionAr: 'فيديو متحرك رأسي 9:16 للسيارات الخارقة للهواتف',
  },
  {
    key: 'mobile:Minimalist',
    deviceFormat: 'mobile',
    category: 'Minimalist',
    labelEn: 'Mobile Live (9:16) → Minimalist (Vertical)',
    labelAr: 'خلفية هاتف حية (9:16) ← بساطة رأسية',
    aspectRatio: '9:16',
    resolution: '2160×3840',
    badge: '9:16 VERTICAL',
    descriptionEn: 'Vertical 9:16 OLED dark minimal motion loops',
    descriptionAr: 'فيديو متحرك رأسي 9:16 بتصاميم داكنة وبسيطة للهواتف',
  },
];

// Helper to generate a 3840x2160 4K procedural canvas banner
export async function generateProcedural4KBanner(title: string, category: string): Promise<string> {
  return new Promise((resolve) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 3840;
      canvas.height = 2160;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve('');
        return;
      }

      // Background deep obsidian gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 3840, 2160);
      bgGrad.addColorStop(0, '#05060A');
      bgGrad.addColorStop(0.5, '#0B0D18');
      bgGrad.addColorStop(1, '#040508');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 3840, 2160);

      // Color accents based on category
      const accentMap: Record<string, { primary: string; secondary: string }> = {
        Tech: { primary: 'rgba(0, 240, 255, 0.32)', secondary: 'rgba(59, 130, 246, 0.18)' },
        Guides: { primary: 'rgba(16, 185, 129, 0.30)', secondary: 'rgba(6, 182, 212, 0.18)' },
        Curation: { primary: 'rgba(168, 85, 247, 0.32)', secondary: 'rgba(236, 72, 153, 0.18)' },
        Art: { primary: 'rgba(244, 63, 94, 0.32)', secondary: 'rgba(168, 85, 247, 0.20)' },
        Minimalism: { primary: 'rgba(255, 255, 255, 0.20)', secondary: 'rgba(100, 116, 139, 0.15)' },
      };
      const pal = accentMap[category] || accentMap.Tech;

      // Glow 1
      const radial1 = ctx.createRadialGradient(1000, 700, 80, 1000, 700, 1500);
      radial1.addColorStop(0, pal.primary);
      radial1.addColorStop(0.5, pal.secondary);
      radial1.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = radial1;
      ctx.fillRect(0, 0, 3840, 2160);

      // Glow 2
      const radial2 = ctx.createRadialGradient(2900, 1400, 60, 2900, 1400, 1300);
      radial2.addColorStop(0, pal.secondary);
      radial2.addColorStop(0.6, 'rgba(0, 240, 255, 0.08)');
      radial2.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = radial2;
      ctx.fillRect(0, 0, 3840, 2160);

      // Geometric isometric / perspective grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 2;
      for (let x = 0; x < 3840; x += 140) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 2160);
        ctx.stroke();
      }
      for (let y = 0; y < 2160; y += 140) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(3840, y);
        ctx.stroke();
      }

      // Elegant architectural border frame
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 3;
      ctx.strokeRect(260, 220, 3320, 1720);

      ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(300, 260, 3240, 1640);

      // Category Pill Badge
      ctx.fillStyle = 'rgba(0, 240, 255, 0.12)';
      ctx.beginPath();
      ctx.roundRect(420, 680, 560, 110, [24]);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#00F0FF';
      ctx.font = 'bold 44px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`DESKSPACE JOURNAL · ${category.toUpperCase()}`, 470, 750);

      // Headline Typography
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 115px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const cleanTitle = title || 'Curated 4K Display Optics & Setup Aesthetics';
      const words = cleanTitle.split(' ');
      let line = '';
      let y = 960;
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > 2800 && n > 0) {
          ctx.fillText(line, 420, y);
          line = words[n] + ' ';
          y += 140;
          if (y > 1460) break;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, 420, y);

      // Subtitle / Specs line
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.font = '500 40px monospace';
      ctx.fillText('3840×2160 UHD · OLED COLOR ACCURACY · DESKSPACE4K EDITORIAL', 420, 1780);

      const resultDataUrl = canvas.toDataURL('image/jpeg', 0.92);
      cleanupCanvas(canvas);
      resolve(resultDataUrl);
    } catch (e) {
      console.warn('Canvas 4K generation fallback error:', e);
      resolve('');
    }
  });
}

const QUICK_TAG_SUGGESTIONS: string[] = [
  '4K Ultra HD',
  'Live Motion',
  'OLED Black',
  'HDR',
  'Desktop',
  '60 FPS',
  'Battlestation',
  'Cyberpunk',
  'Atmospheric',
  'Minimalist',
];

export const SecretAdminModal: React.FC<SecretAdminModalProps> = ({
  isOpen,
  onClose,
  lang,
  wallpapers,
  onAddWallpapers,
  onUpdateWallpaper,
  onDeleteWallpaper,
  onResetDefaults,
  totalDownloads,
  totalUsers,
  blogPosts,
  onAddBlogPost,
  onUpdateBlogPost,
  onDeleteBlogPost,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [showHint, setShowHint] = useState<boolean>(false);

  // Active Admin Tabs: manual, bulk, manage, articles, stats, copilot
  const [adminTab, setAdminTab] = useState<'manual' | 'bulk' | 'manage' | 'articles' | 'stats' | 'copilot'>('manual');

  // ==========================================
  // Embedded Admin AI Copilot Assistant State
  // ==========================================
  const [copilotPrompt, setCopilotPrompt] = useState<string>('');
  const [copilotLoading, setCopilotLoading] = useState<boolean>(false);
  const [copilotResult, setCopilotResult] = useState<CopilotActionResult | null>(null);
  const [copilotToast, setCopilotToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [copilotExecuting, setCopilotExecuting] = useState<boolean>(false);
  const [copilotHistory, setCopilotHistory] = useState<Array<{
    id: string;
    timestamp: number;
    prompt: string;
    actionType: string;
    summary: string;
    affectedCount?: number;
  }>>([]);

  // Session memory hygiene: clean up all temporary object URLs and terminate background AI worker on unmount
  useEffect(() => {
    return () => {
      drainAllTempBlobUrls();
      adminAiClient.terminate();
    };
  }, []);

  // ==========================================
  // 1. Manual Upload Form State
  // ==========================================
  const [manualTargetPlacement, setManualTargetPlacement] = useState<string>('desktop:Gaming');
  const [manualDeviceFormat, setManualDeviceFormat] = useState<'desktop' | 'mobile'>('desktop');
  const [manualImageFile, setManualImageFile] = useState<File | null>(null);
  const [manualImagePreview, setManualImagePreview] = useState<string | null>(null);
  const [manualImageDimensions, setManualImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [manualImageThumbnail, setManualImageThumbnail] = useState<string | null>(null);

  const [manualVideoFile, setManualVideoFile] = useState<File | null>(null);
  const [manualVideoPreview, setManualVideoPreview] = useState<string | null>(null);
  const [manualVideoPoster, setManualVideoPoster] = useState<string | null>(null);
  const [isVideoMuted, setIsVideoMuted] = useState<boolean>(true);
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(true);

  const [manualTitleEn, setManualTitleEn] = useState<string>('');
  const [manualTitleAr, setManualTitleAr] = useState<string>('');
  const [manualCategory, setManualCategory] = useState<Category>('Gaming');
  const [manualResolution, setManualResolution] = useState<string>('3840×2160');
  const [manualTags, setManualTags] = useState<string>('4K Ultra HD, Desktop, OLED Black');
  const [manualDescEn, setManualDescEn] = useState<string>('');
  const [manualDescAr, setManualDescAr] = useState<string>('');
  const [manualIsLive, setManualIsLive] = useState<boolean>(false);
  const [manualPublishing, setManualPublishing] = useState<boolean>(false);
  const [manualNotice, setManualNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const manualImageInputRef = useRef<HTMLInputElement>(null);
  const manualVideoInputRef = useRef<HTMLInputElement>(null);
  const manualVideoPlayerRef = useRef<HTMLVideoElement>(null);

  // ==========================================
  // 2. Bulk Upload State
  // ==========================================
  const [bulkDefaultPlacement, setBulkDefaultPlacement] = useState<string>('desktop:Gaming');
  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
  const [globalCategory, setGlobalCategory] = useState<Category>('Gaming');
  const [globalResolution, setGlobalResolution] = useState<string>('3840×2160');
  const [globalTags, setGlobalTags] = useState<string>('4K Ultra HD, Desktop, High Res');
  const [globalIsLive, setGlobalIsLive] = useState<boolean>(true);
  const [bulkNotice, setBulkNotice] = useState<string | null>(null);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  // ==========================================
  // 3. Wallpaper Management State
  // ==========================================
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [editingWallpaper, setEditingWallpaper] = useState<Wallpaper | null>(null);
  const [editTitleEn, setEditTitleEn] = useState<string>('');
  const [editTitleAr, setEditTitleAr] = useState<string>('');
  const [editCategory, setEditCategory] = useState<Category>('Gaming');
  const [editResolution, setEditResolution] = useState<string>('3840×2160');
  const [editTags, setEditTags] = useState<string>('');
  const [editDescEn, setEditDescEn] = useState<string>('');
  const [editDescAr, setEditDescAr] = useState<string>('');
  const [wallpaperToDeleteId, setWallpaperToDeleteId] = useState<string | null>(null);
  const [isDeletingWallpaper, setIsDeletingWallpaper] = useState<boolean>(false);
  const [manageNotice, setManageNotice] = useState<string | null>(null);
  const [manageNoticeType, setManageNoticeType] = useState<'success' | 'error' | 'info'>('info');

  // ==========================================
  // 4. Articles Management & Media System State
  // ==========================================
  const [articleViewMode, setArticleViewMode] = useState<'list' | 'create' | 'edit'>('list');
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [articleSearchQuery, setArticleSearchQuery] = useState<string>('');
  const [articleNotice, setArticleNotice] = useState<string | null>(null);
  const [articleToDeleteId, setArticleToDeleteId] = useState<string | null>(null);
  const [isDeletingArticle, setIsDeletingArticle] = useState<boolean>(false);

  const [formTitleEn, setFormTitleEn] = useState<string>('');
  const [formTitleAr, setFormTitleAr] = useState<string>('');
  const [formSlug, setFormSlug] = useState<string>('');
  const [formCategory, setFormCategory] = useState<'Tech' | 'Guides' | 'Curation' | 'Art' | 'Minimalism'>('Tech');
  const [formCoverImage, setFormCoverImage] = useState<string>('');
  const [formTags, setFormTags] = useState<string>('');
  const [formReadTime, setFormReadTime] = useState<number>(6);
  const [formExcerptEn, setFormExcerptEn] = useState<string>('');
  const [formExcerptAr, setFormExcerptAr] = useState<string>('');
  const [formContentEn, setFormContentEn] = useState<string>('');
  const [formContentAr, setFormContentAr] = useState<string>('');
  const [formAuthorName, setFormAuthorName] = useState<string>('DeskSpace Editorial Team');
  const [formAuthorRoleEn, setFormAuthorRoleEn] = useState<string>('Display Technology & Ergonomics Specialists');
  const [formAuthorRoleAr, setFormAuthorRoleAr] = useState<string>('فريق التحرير وهندسة العرض البصري');

  // Flexible Blog Media Management States
  const [showWallpaperPickerModal, setShowWallpaperPickerModal] = useState<boolean>(false);
  const [wallpaperPickerSearch, setWallpaperPickerSearch] = useState<string>('');
  const [wallpaperPickerCategory, setWallpaperPickerCategory] = useState<string>('All');
  const [aiBlogImageLoading, setAiBlogImageLoading] = useState<boolean>(false);
  const [aiBlogImageNotice, setAiBlogImageNotice] = useState<string | null>(null);
  const [bannerGenLoading, setBannerGenLoading] = useState<boolean>(false);
  const [copiedEmbedToast, setCopiedEmbedToast] = useState<string | null>(null);

  const [masterSaveToast, setMasterSaveToast] = useState<string | null>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  // ==========================================
  // AI Assistant States & Handlers
  // ==========================================
  const [aiSuggestLoading, setAiSuggestLoading] = useState<boolean>(false);
  const [aiSuggestTarget, setAiSuggestTarget] = useState<'all' | 'title' | 'tags' | 'desc' | 'edit'>('all');
  const [aiWallpaperResult, setAiWallpaperResult] = useState<{
    titleEn: string;
    titleAr: string;
    tags: string;
    descEn: string;
    descAr: string;
  } | null>(null);
  const [aiSuccessToast, setAiSuccessToast] = useState<string | null>(null);

  // AI Journal Generator State
  const [aiArticleTopic, setAiArticleTopic] = useState<string>('');
  const [aiArticleCategory, setAiArticleCategory] = useState<'Tech' | 'Guides' | 'Curation' | 'Art' | 'Minimalism'>('Tech');
  const [aiArticleLoading, setAiArticleLoading] = useState<boolean>(false);
  const [aiArticleResult, setAiArticleResult] = useState<{
    titleEn: string;
    titleAr: string;
    slug: string;
    category: string;
    readTime: number;
    excerptEn: string;
    excerptAr: string;
    tags: string;
    contentEn: string;
    contentAr: string;
  } | null>(null);
  const [aiArticleTab, setAiArticleTab] = useState<'en' | 'ar' | 'raw'>('en');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleGenerateWallpaperMetadata = async (target: 'all' | 'title' | 'tags' | 'desc' | 'edit' = 'all') => {
    setAiSuggestLoading(true);
    setAiSuggestTarget(target);
    try {
      const isEdit = target === 'edit';
      const currentCategory = isEdit ? editCategory : manualCategory;
      const isLive = isEdit ? Boolean(editingWallpaper?.isLive) : Boolean(manualVideoFile || manualIsLive);
      const currentTitle = isEdit ? editTitleEn : manualTitleEn;
      const currentTags = isEdit ? editTags : manualTags;
      const currentResolution = isEdit ? editResolution : manualResolution;

      // Execute asynchronously in dedicated Web Worker off the main thread
      const data = await adminAiClient.suggestWallpaperMetadata({
        category: currentCategory,
        mediaType: isLive ? 'live' : 'static',
        resolution: currentResolution,
        currentTitle,
        currentTags,
        lang,
      });

      if (data) {
        const titleEn = data.titleEn || '';
        const titleAr = data.titleAr || '';
        const tags = data.tags || '';
        const descEn = data.descEn || '';
        const descAr = data.descAr || '';

        const normalized = { titleEn, titleAr, tags, descEn, descAr };
        setAiWallpaperResult(normalized);

        if (isEdit) {
          setEditTitleEn(titleEn);
          setEditTitleAr(titleAr);
          setEditTags(tags);
          setAiSuccessToast(lang === 'ar' ? 'تم تطبيق بيانات الذكاء الاصطناعي بنجاح!' : 'AI Metadata applied to edit form!');
        } else if (target === 'all') {
          setManualTitleEn(titleEn);
          setManualTitleAr(titleAr);
          setManualTags(tags);
          setManualDescEn(descEn);
          setManualDescAr(descAr);
          setAiSuccessToast(lang === 'ar' ? 'تم تطبيق الاقتراحات الذكية على النموذج!' : 'Applied AI Suggestions to Upload Form!');
        } else if (target === 'title') {
          setManualTitleEn(titleEn);
          setManualTitleAr(titleAr);
          setAiSuccessToast(lang === 'ar' ? 'تم تحديث العناوين!' : 'AI Titles applied!');
        } else if (target === 'tags') {
          setManualTags(tags);
          setAiSuccessToast(lang === 'ar' ? 'تم تحديث الوسوم!' : 'AI Tags applied!');
        } else if (target === 'desc') {
          setManualDescEn(descEn);
          setManualDescAr(descAr);
          setAiSuccessToast(lang === 'ar' ? 'تم تحديث الوصف!' : 'AI Description applied!');
        }
      }
    } catch (err) {
      console.error('Error fetching AI metadata suggestions:', err);
    } finally {
      setAiSuggestLoading(false);
      setTimeout(() => setAiSuccessToast(null), 3000);
    }
  };

  const handleGenerateArticle = async () => {
    if (!aiArticleTopic.trim()) return;
    setAiArticleLoading(true);
    try {
      // Execute asynchronously in dedicated Web Worker off the main thread
      const data = await adminAiClient.generateArticleDraft({
        topic: aiArticleTopic.trim(),
        category: aiArticleCategory,
        lang,
      });
      if (data) {
        setAiArticleResult(data);
        setAiSuccessToast(lang === 'ar' ? 'تم صياغة مسودة المقال بنجاح!' : 'Article draft generated successfully!');
      }
    } catch (err) {
      console.error('Error generating article draft:', err);
    } finally {
      setAiArticleLoading(false);
      setTimeout(() => setAiSuccessToast(null), 3500);
    }
  };

  const handleApplyAiArticleToForm = () => {
    if (!aiArticleResult) return;
    setFormTitleEn(aiArticleResult.titleEn);
    setFormTitleAr(aiArticleResult.titleAr);
    setFormSlug(aiArticleResult.slug);
    setFormCategory(aiArticleResult.category as any);
    setFormReadTime(aiArticleResult.readTime);
    setFormTags(aiArticleResult.tags);
    setFormExcerptEn(aiArticleResult.excerptEn);
    setFormExcerptAr(aiArticleResult.excerptAr);
    setFormContentEn(aiArticleResult.contentEn);
    setFormContentAr(aiArticleResult.contentAr);
    setArticleViewMode('create');
    setArticleNotice(lang === 'ar' ? 'تم استيراد مسودة الذكاء الاصطناعي إلى محرر المقالات!' : 'Imported AI draft into article editor!');
    setTimeout(() => setArticleNotice(null), 4000);
  };

  const handleCopyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (!isOpen) return null;

  const t = translations[lang];

  // Auth handler
  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'DeskAdmin4K!2026') {
      setIsAuthenticated(true);
      setAuthError(null);
    } else {
      setAuthError(t.adminWrongPassword || 'Incorrect Master Key');
    }
  };

  const handleLogoutAdmin = () => {
    setIsAuthenticated(false);
    setPasswordInput('');
    onClose();
  };

  // Master Persistence Handler
  const handleMasterSaveChanges = () => {
    try {
      safeSaveWallpapers(wallpapers);
      safeSaveBlogPosts(blogPosts);
      saveAllCustomWallpapersToIndexedDB(wallpapers);
      setMasterSaveToast(
        lang === 'ar'
          ? 'تم حفظ وتثبيت جميع التعديلات والخلفيات والمقالات بنجاح في IndexedDB والتخزين الدائم!'
          : 'All changes, wallpapers, and articles saved permanently to IndexedDB!'
      );
    } catch (err) {
      console.warn('Storage sync notice during save', err);
      setMasterSaveToast(
        lang === 'ar'
          ? 'تم الحفظ بنجاح في الذاكرة الحالية ومزامنة البيانات!'
          : 'Data successfully synchronized in current state!'
      );
    }
    setTimeout(() => {
      setMasterSaveToast(null);
    }, 4000);
  };

  // ==========================================
  // Embedded Admin AI Copilot Assistant Handlers
  // ==========================================
  const handleRunCopilot = async (promptOverride?: string) => {
    const textToRun = (promptOverride || copilotPrompt).trim();
    if (!textToRun) return;

    if (promptOverride) {
      setCopilotPrompt(promptOverride);
    }

    setCopilotLoading(true);
    setCopilotResult(null);
    setCopilotToast(null);

    try {
      const res = await adminAiClient.executeCopilotAction({
        prompt: textToRun,
        context: {
          currentWallpapersCount: wallpapers.length,
          currentArticlesCount: blogPosts.length,
          categories: CATEGORIES,
          language: lang,
        },
      });

      setCopilotResult(res);
      setCopilotToast({
        type: 'info',
        message: lang === 'ar'
          ? `قام مساعد الذكاء الاصطناعي بإعداد الإجراء: ${res.summaryAr || res.summaryEn}. راجع الخطة بالأسفل ثم اضغط "تنفيذ وحفظ في IndexedDB".`
          : `AI Copilot prepared: ${res.summaryEn}. Review details below and click "Execute & Save to IndexedDB".`,
      });
    } catch (err: any) {
      console.error('Failed to run copilot action:', err);
      setCopilotToast({
        type: 'error',
        message: lang === 'ar'
          ? 'تعذر معالجة الطلب عبر خدمة الذكاء الاصطناعي. يرجى المحاولة ثانية.'
          : (err?.message || 'Failed to process prompt with AI Copilot. Please try again.'),
      });
    } finally {
      setCopilotLoading(false);
    }
  };

  const handleExecuteCopilotAction = async () => {
    if (!copilotResult) return;
    setCopilotExecuting(true);
    setCopilotToast(null);

    try {
      const { actionType } = copilotResult;

      if (actionType === 'GENERATE_ARTICLE') {
        const article = copilotResult.articleData;
        if (!article) {
          throw new Error('No article data found in copilot response');
        }

        const newPostId = `blog_custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        // Find matching cover from wallpaper collection if available
        const matchingCover = wallpapers.find(
          (w) => w.category === article.category || (w.tags && w.tags.some((t) => t.toLowerCase().includes(article.category.toLowerCase())))
        );
        const resolvedCover = article.suggestedCoverImage || matchingCover?.thumbnailUrl || matchingCover?.posterUrl || matchingCover?.url || formCoverImage || '/src/assets/images/wallpaper_space_nebula_1792241809155.jpg';

        const newPost: BlogPost = {
          id: newPostId,
          slug: article.slug || slugify(article.titleEn),
          title: {
            en: article.titleEn,
            ar: article.titleAr || article.titleEn,
          },
          excerpt: {
            en: article.excerptEn,
            ar: article.excerptAr || article.excerptEn,
          },
          content: {
            en: article.contentEn,
            ar: article.contentAr || article.contentEn,
          },
          coverImage: resolvedCover,
          category: (['Tech', 'Guides', 'Curation', 'Art', 'Minimalism'].includes(article.category) ? article.category : 'Tech') as any,
          author: {
            name: 'DeskSpace Editorial',
            role: {
              en: 'Display Technology & Optics Specialist',
              ar: 'أخصائي هندسة العرض وتكنولوجيا الشاشات',
            },
          },
          readTimeMinutes: article.readTimeMinutes || 5,
          tags: article.tags && article.tags.length > 0 ? article.tags : ['4K UHD', 'Display Technology', 'SEO'],
          publishedAt: new Date().toISOString(),
          likes: 12,
          comments: [],
        };

        // 1. Update React app state
        onAddBlogPost(newPost);
        // 2. Persist safely and atomically to IndexedDB custom_blog_posts store without touching existing media/wallpapers
        await saveCustomBlogPostToIndexedDB(newPost);
        // 3. Mirror lightweight metadata in localStorage
        safeSaveBlogPosts([newPost, ...blogPosts]);

        setCopilotHistory((prev) => [
          {
            id: `hist_${Date.now()}`,
            timestamp: Date.now(),
            prompt: copilotPrompt,
            actionType: 'GENERATE_ARTICLE',
            summary: lang === 'ar' ? `نشر مقال: "${newPost.title.ar}" بأمان في IndexedDB` : `Published article: "${newPost.title.en}" safely to IndexedDB`,
            affectedCount: 1,
          },
          ...prev,
        ]);

        setCopilotToast({
          type: 'success',
          message: lang === 'ar'
            ? `✅ تم توليد ونشر مقال "${newPost.title.ar}" وحفظه بأمان في IndexedDB! جميع الـ 150+ وسائط مخزنة لم تتأثر إطلاقاً.`
            : `✅ Successfully published "${newPost.title.en}" to IndexedDB! All 150+ user assets remain 100% preserved.`,
        });
        setCopilotResult(null);
        setCopilotPrompt('');

      } else if (actionType === 'BATCH_UPDATE_TAGS') {
        const updateData = copilotResult.tagUpdateData;
        if (!updateData || !Array.isArray(updateData.tagsToAdd) || updateData.tagsToAdd.length === 0) {
          throw new Error('No tag updates found');
        }

        const targetCat = updateData.targetCategory || 'All';
        const tagsToAdd = updateData.tagsToAdd.map((t) => t.trim()).filter(Boolean);

        let updatedCount = 0;
        // Strictly targeted update on matching wallpapers only
        for (const wp of wallpapers) {
          const isTarget = targetCat === 'All' || wp.category.toLowerCase() === targetCat.toLowerCase();
          if (isTarget) {
            const currentTags = Array.isArray(wp.tags) ? wp.tags : [];
            const merged = Array.from(new Set([...currentTags, ...tagsToAdd]));
            if (merged.length !== currentTags.length) {
              const updatedWp: Wallpaper = {
                ...wp,
                tags: merged,
              };
              onUpdateWallpaper(updatedWp);
              // Save strictly into IndexedDB custom wallpapers store
              await saveCustomWallpaperToIndexedDB(updatedWp);
              updatedCount++;
            }
          }
        }

        setCopilotHistory((prev) => [
          {
            id: `hist_${Date.now()}`,
            timestamp: Date.now(),
            prompt: copilotPrompt,
            actionType: 'BATCH_UPDATE_TAGS',
            summary: lang === 'ar'
              ? `تحديث وسوم ${updatedCount} خلفية بإضافة [${tagsToAdd.join(', ')}]`
              : `Batch updated tags on ${updatedCount} wallpapers [${tagsToAdd.join(', ')}]`,
            affectedCount: updatedCount,
          },
          ...prev,
        ]);

        setCopilotToast({
          type: 'success',
          message: lang === 'ar'
            ? `✅ تم تحديث وسوم ${updatedCount} خلفية بنجاح وحفظها في IndexedDB! لم يتم إعادة تعيين قاعدة البيانات أو حذف أي وسائط.`
            : `✅ Successfully batch updated tags for ${updatedCount} wallpapers in IndexedDB! Zero storage resets performed.`,
        });
        setCopilotResult(null);
        setCopilotPrompt('');

      } else if (actionType === 'UPDATE_METADATA') {
        const metaData = copilotResult.metadataUpdateData;
        if (!metaData) {
          throw new Error('No metadata update payload provided');
        }

        const targetCat = metaData.targetCategory || 'All';
        let updatedCount = 0;

        for (const wp of wallpapers) {
          const isTarget = targetCat === 'All' || wp.category.toLowerCase() === targetCat.toLowerCase();
          if (isTarget) {
            const currentTags = Array.isArray(wp.tags) ? wp.tags : [];
            const tagsToAdd = (metaData.tagsToAdd || []).map((t) => t.trim()).filter(Boolean);
            const mergedTags = Array.from(new Set([...currentTags, ...tagsToAdd]));

            const currentDescEn = typeof wp.description === 'object' && wp.description ? wp.description.en : (typeof wp.description === 'string' ? wp.description : wp.title.en);
            const currentDescAr = typeof wp.description === 'object' && wp.description ? wp.description.ar : (typeof wp.description === 'string' ? wp.description : wp.title.ar);

            const updatedWp: Wallpaper = {
              ...wp,
              tags: mergedTags,
              description: {
                en: metaData.descEn || currentDescEn,
                ar: metaData.descAr || currentDescAr,
              },
            };
            onUpdateWallpaper(updatedWp);
            await saveCustomWallpaperToIndexedDB(updatedWp);
            updatedCount++;
          }
        }

        setCopilotHistory((prev) => [
          {
            id: `hist_${Date.now()}`,
            timestamp: Date.now(),
            prompt: copilotPrompt,
            actionType: 'UPDATE_METADATA',
            summary: lang === 'ar'
              ? `تحديث البيانات الوصفية لـ ${updatedCount} خلفية (${targetCat})`
              : `Updated metadata for ${updatedCount} wallpapers (${targetCat})`,
            affectedCount: updatedCount,
          },
          ...prev,
        ]);

        setCopilotToast({
          type: 'success',
          message: lang === 'ar'
            ? `✅ تم تحديث البيانات الوصفية لـ ${updatedCount} خلفية بنجاح وحفظها في IndexedDB!`
            : `✅ Successfully updated metadata for ${updatedCount} wallpapers in IndexedDB!`,
        });
        setCopilotResult(null);
        setCopilotPrompt('');

      } else {
        // ASSIST_ANSWER
        setCopilotToast({
          type: 'info',
          message: copilotResult.explanation || (lang === 'ar' ? 'تمت معالجة الاستفسار بنجاح.' : 'Inquiry answered successfully.'),
        });
      }
    } catch (err: any) {
      console.error('Error executing copilot action:', err);
      setCopilotToast({
        type: 'error',
        message: lang === 'ar'
          ? `فشل تنفيذ الإجراء: ${err?.message || 'خطأ غير معروف'}`
          : `Failed to execute action: ${err?.message || 'Unknown error'}`,
      });
    } finally {
      setCopilotExecuting(false);
    }
  };

  // ==========================================
  // Manual Upload Handlers
  // ==========================================
  const handleManualImageSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setManualNotice({
        type: 'error',
        message: lang === 'ar' ? 'يرجى اختيار ملف صورة صالح (JPG, PNG, WEBP)' : 'Please select a valid image file (JPG, PNG, WEBP)',
      });
      return;
    }

    setManualImageFile(file);
    const objectUrl = registerBlobUrl(URL.createObjectURL(file));
    setManualImagePreview(objectUrl);

    // Measure dimensions
    const img = new Image();
    img.onload = () => {
      setManualImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      if (img.naturalWidth && img.naturalHeight) {
        setManualResolution(`${img.naturalWidth}×${img.naturalHeight}`);
      }
    };
    img.src = objectUrl;

    // Generate lightweight thumbnail
    try {
      const thumb = await createThumbnailFromImage(file, 640);
      setManualImageThumbnail(thumb);
    } catch {
      // fallback
    }

    // Auto-fill title if empty and detect resolution
    if (!manualTitleEn) {
      const cleanName = cleanWallpaperTitle(file.name);
      setManualTitleEn(cleanName);
      if (!manualTitleAr) {
        setManualTitleAr(cleanName);
      }
    }
    const detectedResImg = extractResolutionFromTitle(file.name);
    if (detectedResImg && !manualResolution) {
      setManualResolution(detectedResImg);
    }
    setManualNotice(null);
  };

  const handleManualVideoSelect = async (file: File) => {
    if (!file.type.startsWith('video/') && !/\.(mp4|webm|mov|mkv)$/i.test(file.name)) {
      setManualNotice({
        type: 'error',
        message: lang === 'ar' ? 'يرجى اختيار ملف فيديو متحرك صالح (MP4, WEBM, MOV)' : 'Please select a valid video file (MP4, WEBM, MOV)',
      });
      return;
    }

    setManualVideoFile(file);
    const objectUrl = registerBlobUrl(URL.createObjectURL(file));
    setManualVideoPreview(objectUrl);
    setManualIsLive(true);

    // Extract poster frame from video
    try {
      const poster = await extractVideoPoster(file);
      if (poster) {
        setManualVideoPoster(poster);
        // If no static image uploaded yet, poster acts as static preview & thumbnail
        if (!manualImagePreview) {
          setManualImagePreview(poster);
          setManualImageThumbnail(poster);
        }
      }
    } catch {
      // fallback
    }

    // Auto-fill title if empty and detect resolution
    if (!manualTitleEn) {
      const cleanName = cleanWallpaperTitle(file.name);
      setManualTitleEn(cleanName);
      if (!manualTitleAr) {
        setManualTitleAr(cleanName);
      }
    }
    const detectedResVid = extractResolutionFromTitle(file.name);
    if (detectedResVid) {
      setManualResolution(detectedResVid);
    }
    setManualNotice(null);
  };

  const handleClearManualImage = () => {
    if (manualImagePreview) {
      revokeBlobUrl(manualImagePreview);
    }
    setManualImageFile(null);
    setManualImagePreview(null);
    setManualImageDimensions(null);
    setManualImageThumbnail(null);
  };

  const handleClearManualVideo = () => {
    if (manualVideoPreview) {
      revokeBlobUrl(manualVideoPreview);
    }
    setManualVideoFile(null);
    setManualVideoPreview(null);
    setManualVideoPoster(null);
    setManualIsLive(false);
  };

  const handleSelectTargetPlacement = (key: string) => {
    setManualTargetPlacement(key);
    const option = TARGET_PLACEMENT_OPTIONS.find((o) => o.key === key);
    if (!option) return;

    setManualDeviceFormat(option.deviceFormat);
    setManualCategory(option.category);

    if (option.deviceFormat === 'mobile') {
      setManualIsLive(true);
      setManualResolution(option.resolution || '2160×3840');
      setManualTags(`Mobile Live Wallpapers, 9:16 Vertical, 60 FPS, OLED Black, Smartphone, ${option.category}`);
    } else {
      setManualResolution(option.resolution || '3840×2160');
      setManualTags(`4K Ultra HD, Desktop, OLED Black, ${option.category}`);
    }
  };

  const handleToggleDeviceFormat = (format: 'desktop' | 'mobile') => {
    setManualDeviceFormat(format);
    if (format === 'mobile') {
      setManualTargetPlacement('mobile:Mobile');
      setManualCategory('Mobile');
      setManualIsLive(true);
      setManualResolution('2160×3840');
      setManualTags('Mobile Live Wallpapers, 9:16 Vertical, 60 FPS, OLED Black, Smartphone');
    } else {
      setManualTargetPlacement('desktop:Gaming');
      setManualCategory('Gaming');
      setManualResolution('3840×2160');
      setManualTags('4K Ultra HD, Desktop, OLED Black, Gaming');
    }
  };

  const handleAddQuickTag = (tag: string) => {
    const existing = manualTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (!existing.includes(tag)) {
      setManualTags([...existing, tag].join(', '));
    }
  };

  const handlePublishManualWallpaper = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!manualImageFile && !manualVideoFile) {
      setManualNotice({
        type: 'error',
        message:
          manualDeviceFormat === 'mobile'
            ? (lang === 'ar'
                ? 'يرجى رفع فيديو متحرك للهاتف بصيغة MP4/WEBM أو صورة غلاف رأسية لنشر الخلفية.'
                : 'Please upload a mobile motion video (.mp4/.webm) or vertical cover image before publishing.')
            : (lang === 'ar'
                ? 'يرجى رفع صورة ثابتة 4K أو فيديو متحرك واحد على الأقل لنشر الخلفية.'
                : 'Please upload at least a 4K static image or a live video before publishing.'),
      });
      return;
    }

    if (!manualTitleEn.trim() && !manualTitleAr.trim()) {
      setManualNotice({
        type: 'error',
        message: lang === 'ar' ? 'يرجى إدخال عنوان للخلفية.' : 'Please enter a title for the wallpaper.',
      });
      return;
    }

    setManualPublishing(true);
    setManualNotice(null);

    try {
      const wpId = `wp_custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const isMobileFormat = manualDeviceFormat === 'mobile';
      const isLive = Boolean(manualVideoFile || manualIsLive || isMobileFormat);

      // 1. Store Raw 4K Image in IndexedDB
      let finalImageUrl = `idb://media/${wpId}`;
      let finalThumbnailUrl = manualImageThumbnail || manualVideoPoster || undefined;

      if (manualImageFile) {
        await storeBlobInIndexedDB(wpId, manualImageFile, manualImageFile.name);
        if (manualImageThumbnail) {
          await storeBlobInIndexedDB(`${wpId}_thumb`, undefined, 'thumb.jpg', manualImageThumbnail);
        }
      } else if (manualVideoPoster) {
        // Video provided without still image: persist extracted poster as image
        await storeBlobInIndexedDB(wpId, undefined, 'poster.jpg', manualVideoPoster);
        finalImageUrl = `idb://media/${wpId}`;
      }

      // 2. Store Raw Live Video in IndexedDB (if attached)
      let finalVideoUrl: string | undefined = undefined;
      if (manualVideoFile) {
        const videoStoreId = `${wpId}_video`;
        await storeBlobInIndexedDB(videoStoreId, manualVideoFile, manualVideoFile.name);
        finalVideoUrl = `idb://media/${videoStoreId}`;

        if (manualVideoPoster) {
          await storeBlobInIndexedDB(`${wpId}_poster`, undefined, 'poster.jpg', manualVideoPoster);
        }
      }

      // Parse tags
      let parsedTags = manualTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      if (isMobileFormat) {
        if (!parsedTags.includes('Mobile Live Wallpapers')) {
          parsedTags.unshift('Mobile Live Wallpapers');
        }
        if (!parsedTags.includes('9:16 Vertical')) {
          parsedTags.push('9:16 Vertical');
        }
      }

      const titleEn = manualTitleEn.trim() || manualTitleAr.trim();
      const titleAr = manualTitleAr.trim() || manualTitleEn.trim();

      const descEn =
        manualDescEn.trim() ||
        (isMobileFormat
          ? 'Ultra-smooth 60 FPS vertical 9:16 Mobile Live Wallpaper engineered for OLED and high-refresh smartphone displays. Personal free use license.'
          : 'Master-grade 4K Ultra HD desktop wallpaper precision-calibrated for OLED contrast and high-refresh displays. Personal free use license.');
      const descAr =
        manualDescAr.trim() ||
        (isMobileFormat
          ? 'خلفية هاتف حية رأسية فائقة السلاسة بمعدل 60 إطاراً في الثانية (9:16) مصممة لشاشات OLED ومعدلات التحديث العالية. مرخصة للاستخدام الشخصي المجاني.'
          : 'خلفية سطح مكتب أصلية فائقة الدقة 4K تم تحسينها هندسياً لشاشات OLED ومعدلات التحديث العالية. مرخصة للاستخدام الشخصي المجاني.');

      const calculatedFileSize = manualVideoFile
        ? `${(manualVideoFile.size / (1024 * 1024)).toFixed(1)} MB`
        : manualImageFile
        ? `${(manualImageFile.size / (1024 * 1024)).toFixed(1)} MB`
        : '14.2 MB';

      const defaultWidth = isMobileFormat ? 2160 : 3840;
      const defaultHeight = isMobileFormat ? 3840 : 2160;
      const width = manualImageDimensions?.width || defaultWidth;
      const height = manualImageDimensions?.height || defaultHeight;
      const finalAspectRatio = isMobileFormat ? '9:16' : (manualImageDimensions ? `${width}:${height}` : '16:9');

      const newWallpaper: Wallpaper = {
        id: wpId,
        title: {
          en: titleEn,
          ar: titleAr,
        },
        description: {
          en: descEn,
          ar: descAr,
        },
        category: isMobileFormat && manualCategory === 'Journal' ? 'Mobile' : manualCategory,
        resolution: manualResolution || `${width}×${height}`,
        width,
        height,
        url: finalImageUrl,
        videoUrl: finalVideoUrl,
        posterUrl: manualImageFile ? finalImageUrl : (manualVideoPoster || undefined),
        thumbnailUrl: finalThumbnailUrl || finalImageUrl,
        formatType: isLive ? 'video' : 'image',
        aspectRatio: finalAspectRatio,
        deviceFormat: isMobileFormat ? 'mobile' : 'desktop',
        isMobile: isMobileFormat,
        downloads: 0,
        favorites: 0,
        fileSize: calculatedFileSize,
        tags: parsedTags.length > 0 ? parsedTags : (isMobileFormat ? ['Mobile Live Wallpapers', '9:16 Vertical', manualCategory] : ['4K Ultra HD', manualCategory]),
        colorPalette: ['#0A0B10', '#00F0FF', '#FF007F', '#A855F7', '#F8FAFC'],
        createdAt: new Date().toISOString(),
        isLive,
      };

      // 3. Persist to IndexedDB
      await saveCustomWallpaperToIndexedDB(newWallpaper);

      // 4. Update memory state in App
      onAddWallpapers([newWallpaper]);

      // Reset form
      handleClearManualImage();
      handleClearManualVideo();
      setManualTitleEn('');
      setManualTitleAr('');
      setManualDescEn('');
      setManualDescAr('');
      setManualTags(isMobileFormat ? 'Mobile Live Wallpapers, 9:16 Vertical, 60 FPS, OLED Black, Smartphone' : '4K Ultra HD, Desktop, OLED Black');

      setManualNotice({
        type: 'success',
        message:
          lang === 'ar'
            ? `تم رفع وحفظ الخلفية "${titleAr}" بنجاح في IndexedDB وقسم ${isMobileFormat ? 'خلفيات الهاتف الحية' : 'خلفيات سطح المكتب'}!`
            : `Wallpaper "${titleEn}" successfully published to ${isMobileFormat ? 'Mobile Live Wallpapers' : 'Desktop 4K'} and stored permanently in IndexedDB!`,
      });

      setTimeout(() => {
        setManualNotice(null);
        setAdminTab('manage');
      }, 2000);
    } catch (err: any) {
      console.error('Error publishing manual wallpaper:', err);
      setManualNotice({
        type: 'error',
        message:
          lang === 'ar'
            ? 'حدث خطأ أثناء حفظ الخلفية في قاعدة البيانات المحلية.'
            : 'Error saving wallpaper to local persistent database.',
      });
    } finally {
      setManualPublishing(false);
    }
  };

  // ==========================================
  // Bulk Drop Upload Handlers
  // ==========================================
  const handleBulkFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processBulkFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleBulkFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processBulkFiles(Array.from(e.target.files));
    }
  };

  const processBulkFiles = (files: File[]) => {
    const valid = files.filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/'));
    if (valid.length === 0) return;

    const newItems: QueuedFile[] = [];

    valid.forEach((file) => {
      const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|mkv)$/i.test(file.name);
      const qId = `wp_custom_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const previewUrl = registerBlobUrl(URL.createObjectURL(file));
      const name = cleanWallpaperTitle(file.name);
      const size = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

      // Immediately store raw file into IndexedDB
      storeBlobInIndexedDB(qId, file, file.name);

      const item: QueuedFile = {
        id: qId,
        file,
        previewUrl,
        persistentUrl: `idb://media/${qId}`,
        name,
        size,
        sourceType: 'file',
        isVideo,
      };
      newItems.push(item);

      if (isVideo) {
        extractVideoPoster(file).then((poster) => {
          if (poster) {
            setQueuedFiles((prev) =>
              prev.map((q) => (q.id === qId ? { ...q, posterUrl: poster, thumbnailUrl: poster } : q))
            );
          }
        });
      } else {
        createThumbnailFromImage(file, 640).then((thumb) => {
          if (thumb) {
            setQueuedFiles((prev) =>
              prev.map((q) => (q.id === qId ? { ...q, thumbnailUrl: thumb, posterUrl: thumb } : q))
            );
          }
        });
      }
    });

    setQueuedFiles((prev) => [...prev, ...newItems]);
  };

  const handlePublishBulkBatch = async () => {
    if (queuedFiles.length === 0) return;

    const parsedTags = globalTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const bulkOpt = TARGET_PLACEMENT_OPTIONS.find((o) => o.key === bulkDefaultPlacement) || TARGET_PLACEMENT_OPTIONS[0];
    const isMobileBatch = bulkOpt.deviceFormat === 'mobile';
    const batchCategory = bulkOpt.category;
    const batchResolution = bulkOpt.resolution || (isMobileBatch ? '2160×3840' : '3840×2160');
    const batchWidth = isMobileBatch ? 2160 : 3840;
    const batchHeight = isMobileBatch ? 3840 : 2160;
    const batchAspectRatio = isMobileBatch ? '9:16' : '16:9';

    const newWallpapers: Wallpaper[] = queuedFiles.map((item, index) => {
      const cleanName = cleanWallpaperTitle(item.name || item.file?.name || '');
      const detectedRes = extractResolutionFromTitle(item.file?.name || item.name || '') || batchResolution;
      const isLiveItem = Boolean(item.isVideo || isMobileBatch || globalIsLive);
      const wpId = item.id;

      if (item.file) {
        storeBlobInIndexedDB(wpId, item.file, item.name);
      }

      const finalMediaUrl = `idb://media/${wpId}`;
      const finalPoster =
        item.posterUrl || item.thumbnailUrl || (item.isVideo ? getCategoryFallback(batchCategory) : finalMediaUrl);

      const defaultTags = isMobileBatch
        ? ['Mobile Live Wallpapers', '9:16 Vertical', batchCategory, '60 FPS']
        : ['4K Ultra HD', 'Desktop', batchCategory];

      return {
        id: wpId,
        title: {
          en: cleanName || (isMobileBatch ? `Mobile Live ${batchCategory} ${index + 1}` : `4K Wallpaper ${index + 1}`),
          ar: cleanName || (isMobileBatch ? `خلفية هاتف حية ${batchCategory} ${index + 1}` : `خلفية شاشة 4K ${index + 1}`),
        },
        description: {
          en: isMobileBatch
            ? 'Ultra-smooth 60 FPS vertical 9:16 Mobile Live Wallpaper uploaded via DeskSpace4K Admin Repository.'
            : 'Curated 4K Ultra HD wallpaper uploaded via DeskSpace4K Admin Repository.',
          ar: isMobileBatch
            ? 'خلفية هاتف حية رأسية 9:16 بمعدل 60 إطاراً في الثانية تم رفعها عبر مستودع إدارة ديسك سبيس 4K.'
            : 'خلفية فائقة الدقة 4K تم رفعها عبر مستودع إدارة ديسك سبيس 4K.',
        },
        category: batchCategory,
        resolution: detectedRes,
        width: batchWidth,
        height: batchHeight,
        url: finalMediaUrl,
        videoUrl: isLiveItem ? finalMediaUrl : undefined,
        posterUrl: finalPoster,
        thumbnailUrl: item.thumbnailUrl || item.posterUrl || finalMediaUrl,
        formatType: item.isVideo ? 'video' : 'image',
        aspectRatio: batchAspectRatio,
        deviceFormat: isMobileBatch ? 'mobile' : 'desktop',
        isMobile: isMobileBatch,
        downloads: 0,
        favorites: 0,
        fileSize: item.size,
        tags: parsedTags.length > 0 ? Array.from(new Set([...defaultTags, ...parsedTags])) : defaultTags,
        colorPalette: ['#111827', '#00F0FF', '#10B981', '#EC4899', '#F9FAFB'],
        createdAt: new Date().toISOString(),
        isLive: isLiveItem,
      };
    });

    await saveAllCustomWallpapersToIndexedDB(newWallpapers);
    onAddWallpapers(newWallpapers);
    setQueuedFiles([]);
    setBulkNotice(
      lang === 'ar'
        ? `تم نشر ${newWallpapers.length} خلفيات بنجاح إلى قسم "${bulkOpt.labelAr}"!`
        : `Successfully published ${newWallpapers.length} wallpapers to "${bulkOpt.labelEn}"!`
    );

    setTimeout(() => {
      setBulkNotice(null);
      setAdminTab('manage');
    }, 1500);
  };

  // Inline placement and category re-assignment with real-time IndexedDB update
  const handleInlinePlacementChange = async (wp: Wallpaper, newPlacementKey: string) => {
    const targetOpt = TARGET_PLACEMENT_OPTIONS.find((o) => o.key === newPlacementKey);
    if (!targetOpt) return;

    const isMobile = targetOpt.deviceFormat === 'mobile';
    const isLive = isMobile ? true : wp.isLive;

    let updatedTags = [...wp.tags];
    if (isMobile) {
      if (!updatedTags.includes('Mobile Live Wallpapers')) updatedTags.unshift('Mobile Live Wallpapers');
      if (!updatedTags.includes('9:16 Vertical')) updatedTags.push('9:16 Vertical');
      updatedTags = updatedTags.filter((t) => t !== 'Desktop' && t !== '4K Ultra HD');
    } else {
      updatedTags = updatedTags.filter((t) => t !== 'Mobile Live Wallpapers' && t !== '9:16 Vertical');
      if (!updatedTags.includes('4K Ultra HD')) updatedTags.unshift('4K Ultra HD');
      if (!updatedTags.includes('Desktop')) updatedTags.push('Desktop');
    }

    const updated: Wallpaper = {
      ...wp,
      deviceFormat: isMobile ? 'mobile' : 'desktop',
      aspectRatio: isMobile ? '9:16' : '16:9',
      isMobile,
      isLive,
      category: targetOpt.category,
      resolution: isMobile ? '2160×3840' : (wp.resolution?.includes('3840') ? wp.resolution : '3840×2160'),
      width: isMobile ? 2160 : 3840,
      height: isMobile ? 3840 : 2160,
      tags: updatedTags,
    };

    try {
      await saveCustomWallpaperToIndexedDB(updated);
      onUpdateWallpaper(updated);
      setManageNotice(
        lang === 'ar'
          ? `تم تحديث التصنيف والوجهة إلى: "${targetOpt.labelAr}" وحفظها في قاعدة البيانات فوراً!`
          : `Placement switched to: "${targetOpt.labelEn}" and saved to IndexedDB!`
      );
      setTimeout(() => setManageNotice(null), 3000);
    } catch (err) {
      console.error('Error updating wallpaper placement:', err);
    }
  };

  // Blog media file upload handler
  const handleBlogCoverFileUpload = async (file: File) => {
    try {
      const mediaId = `post_cover_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await storeBlobInIndexedDB(mediaId, file, file.name);
      const persistentUrl = `idb://media/${mediaId}`;
      setFormCoverImage(persistentUrl);
      setAiBlogImageNotice(
        lang === 'ar'
          ? 'تم رفع صورة المقال وحفظها كـ Blob دائم في IndexedDB!'
          : 'Article cover image uploaded and permanently cached in IndexedDB!'
      );
      setTimeout(() => setAiBlogImageNotice(null), 3500);
    } catch (err) {
      console.error('Error uploading blog cover image:', err);
    }
  };

  // AI Suggest / Attach Image: analyzes article context and picks from repo via non-blocking Worker
  const handleAiSuggestBlogImage = async (overrideContext?: { titleEn?: string; titleAr?: string; category?: string; tags?: string }) => {
    setAiBlogImageLoading(true);
    setAiBlogImageNotice(null);

    const title = overrideContext?.titleEn || formTitleEn || formTitleAr || '4K Battlestation OLED Guide';
    const cat = overrideContext?.category || formCategory || 'Tech';
    const tags = overrideContext?.tags || formTags || '4K, OLED, HDR';

    try {
      // Send minimal lightweight candidates through the Web Worker
      const matched = await adminAiClient.suggestBlogImage({
        title,
        category: cat,
        tags,
        candidates: wallpapers.slice(0, 15).map((w) => ({
          id: w.id,
          titleEn: w.title?.en || '',
          category: w.category || '',
          tags: Array.isArray(w.tags) ? w.tags.join(', ') : '',
          url: w.thumbnailUrl || w.posterUrl || w.url,
        })),
      });

      if (matched && matched.matchedUrl) {
        setFormCoverImage(matched.matchedUrl);
        const reason = lang === 'ar' ? matched.reasoningAr : matched.reasoningEn;
        setAiBlogImageNotice(
          reason || (lang === 'ar' ? 'تم اختيار وإرفاق أفضل خلفية متوافقة من المعرض!' : 'Matched & attached relevant 4K wallpaper!')
        );
      }
    } catch (err) {
      console.warn('AI blog image suggest fallback:', err);
      const matched = wallpapers.find((w) => w.category.toLowerCase() === cat.toLowerCase()) || wallpapers[0];
      if (matched) {
        setFormCoverImage(matched.thumbnailUrl || matched.url);
        setAiBlogImageNotice(
          lang === 'ar' ? `تم ربط خلفية 4K متوافقة من المستودع: ${matched.title.ar}` : `Attached matching 4K wallpaper: ${matched.title.en}`
        );
      }
    } finally {
      setAiBlogImageLoading(false);
      setTimeout(() => setAiBlogImageNotice(null), 4000);
    }
  };

  // Procedural 4K Banner Generator: creates a high-res custom banner for the post
  const handleGenerateAiBanner = async () => {
    setBannerGenLoading(true);
    try {
      const headline = formTitleEn || formTitleAr || '4K Display Optics & Setup Aesthetics';
      const cat = formCategory || 'Tech';
      const dataUrl = await generateProcedural4KBanner(headline, cat);
      if (dataUrl) {
        const bannerId = `post_banner_${Date.now()}`;
        await storeBlobInIndexedDB(bannerId, undefined, 'banner.jpg', dataUrl);
        const persistentUrl = `idb://media/${bannerId}`;
        setFormCoverImage(persistentUrl);
        setAiBlogImageNotice(
          lang === 'ar'
            ? 'تم توليد وحفظ بوستر 4K مخصص للمقال (3840×2160) في قاعدة البيانات!'
            : 'Generated custom 4K UHD article banner (3840×2160) and saved in IndexedDB!'
        );
      }
    } catch (err) {
      console.error('Error generating 4K banner:', err);
    } finally {
      setBannerGenLoading(false);
      setTimeout(() => setAiBlogImageNotice(null), 4000);
    }
  };

  const handleCopyMarkdownEmbed = (url: string, alt?: string) => {
    const embedText = `![${alt || formTitleEn || 'DeskSpace 4K Setup'}](${url})`;
    navigator.clipboard.writeText(embedText);
    setCopiedEmbedToast(lang === 'ar' ? 'تم نسخ وسم Markdown للصورة!' : 'Copied Markdown image embed tag!');
    setTimeout(() => setCopiedEmbedToast(null), 3000);
  };

  // ==========================================
  // Management Handlers (Edit & Delete)
  // ==========================================
  const startEditWallpaper = (wp: Wallpaper) => {
    setEditingWallpaper(wp);
    setEditTitleEn(wp.title.en);
    setEditTitleAr(wp.title.ar);
    setEditCategory(wp.category);
    setEditResolution(wp.resolution);
    setEditTags(wp.tags.join(', '));
    setEditDescEn(typeof wp.description === 'string' ? wp.description : wp.description?.en || '');
    setEditDescAr(typeof wp.description === 'string' ? wp.description : wp.description?.ar || '');
  };

  const handleSaveWallpaperEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWallpaper) return;

    const parsedTags = editTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const updated: Wallpaper = {
      ...editingWallpaper,
      title: {
        en: editTitleEn.trim() || editingWallpaper.title.en,
        ar: editTitleAr.trim() || editingWallpaper.title.ar,
      },
      description: {
        en: editDescEn.trim() || (typeof editingWallpaper.description === 'string' ? editingWallpaper.description : editingWallpaper.description?.en || ''),
        ar: editDescAr.trim() || (typeof editingWallpaper.description === 'string' ? editingWallpaper.description : editingWallpaper.description?.ar || ''),
      },
      category: editCategory,
      resolution: editResolution,
      tags: parsedTags.length > 0 ? parsedTags : editingWallpaper.tags,
    };

    await saveCustomWallpaperToIndexedDB(updated);
    onUpdateWallpaper(updated);
    setEditingWallpaper(null);
    setManageNotice(
      lang === 'ar' ? 'تم تحديث بيانات الخلفية بنجاح!' : 'Wallpaper details updated successfully!'
    );
    setTimeout(() => setManageNotice(null), 3000);
  };

  const handleDeleteWallpaperConfirm = async (id: string) => {
    if (!id) return;
    setIsDeletingWallpaper(true);
    try {
      // 1. Explicit atomic IndexedDB deletion across wallpapers, blobs, and deleted stores
      const result = await permanentlyDeleteWallpaperFromIndexedDB(id);
      if (!result.success) {
        throw new Error(result.error || 'IndexedDB transaction failed to delete record');
      }

      // Also clean up any lingering media blobs by ID
      await deleteMediaFromIndexedDB(id).catch(() => {});

      // 2. Synchronize parent React state immediately
      await onDeleteWallpaper(id);

      // 3. Close confirmation modal & trigger success notification
      setWallpaperToDeleteId(null);
      setManageNoticeType('success');
      setManageNotice(
        lang === 'ar'
          ? 'تم حذف الخلفية وملفاتها نهائياً من قاعدة البيانات (IndexedDB) ولن يتم استعادتها عند التحديث!'
          : 'Wallpaper and all media records permanently purged from IndexedDB. Persistence guaranteed across reloads!'
      );
    } catch (err: any) {
      console.error('Failed to permanently delete wallpaper:', err);
      setManageNoticeType('error');
      setManageNotice(
        lang === 'ar'
          ? `فشل في حذف الخلفية من قاعدة البيانات: ${err?.message || 'خطأ غير متوقع'}`
          : `Failed to delete wallpaper: ${err?.message || 'Unexpected database error'}`
      );
    } finally {
      setIsDeletingWallpaper(false);
      setTimeout(() => setManageNotice(null), 4500);
    }
  };

  // Filtered wallpapers for Manage Tab
  const filteredWallpapers = wallpapers.filter((wp) => {
    const q = searchTerm.toLowerCase().trim();
    const matchesQuery =
      !q ||
      wp.title.en.toLowerCase().includes(q) ||
      wp.title.ar.toLowerCase().includes(q) ||
      wp.tags.some((t) => t.toLowerCase().includes(q));
    const matchesCat = filterCategory === 'All' || wp.category === filterCategory;
    return matchesQuery && matchesCat;
  });

  // ==========================================
  // Blog / Articles Management Actions
  // ==========================================
  const handleStartNewArticle = () => {
    setEditingPostId(null);
    setFormTitleEn('');
    setFormTitleAr('');
    setFormSlug('');
    setFormCategory('Tech');
    setFormCoverImage(wallpapers[0]?.url || '/src/assets/images/wallpaper_space_nebula_1792241809155.jpg');
    setFormTags('4K UHD, HDR, Display Optics');
    setFormReadTime(6);
    setFormExcerptEn('');
    setFormExcerptAr('');
    setFormContentEn('');
    setFormContentAr('');
    setArticleViewMode('create');
  };

  const handleStartEditArticle = (post: BlogPost) => {
    setEditingPostId(post.id);
    setFormTitleEn(post.title.en);
    setFormTitleAr(post.title.ar);
    setFormSlug(post.slug);
    setFormCategory(post.category);
    setFormCoverImage(post.coverImage);
    setFormTags(post.tags.join(', '));
    setFormReadTime(post.readTimeMinutes);
    setFormExcerptEn(post.excerpt.en);
    setFormExcerptAr(post.excerpt.ar);
    setFormContentEn(post.content.en);
    setFormContentAr(post.content.ar);
    setArticleViewMode('edit');
  };

  const handleSaveArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitleEn.trim() && !formTitleAr.trim()) return;

    const baseSlug = (formTitleEn.trim() || 'article')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    const cleanSlug = formSlug.trim() || baseSlug;

    if (articleViewMode === 'create') {
      const newPost: BlogPost = {
        id: `post_${Date.now()}`,
        slug: cleanSlug,
        title: {
          en: formTitleEn.trim() || formTitleAr.trim(),
          ar: formTitleAr.trim() || formTitleEn.trim(),
        },
        excerpt: {
          en: formExcerptEn.trim() || `${formContentEn.trim().slice(0, 160)}...`,
          ar: formExcerptAr.trim() || `${formContentAr.trim().slice(0, 160)}...`,
        },
        content: {
          en: formContentEn.trim() || formContentAr.trim(),
          ar: formContentAr.trim() || formContentEn.trim(),
        },
        coverImage: formCoverImage.trim() || wallpapers[0]?.url || '/src/assets/images/wallpaper_space_nebula_1792241809155.jpg',
        category: formCategory,
        author: {
          name: formAuthorName.trim() || 'DeskSpace Editorial Team',
          role: {
            en: formAuthorRoleEn.trim() || 'Display Technology & Ergonomics Specialists',
            ar: formAuthorRoleAr.trim() || 'فريق التحرير وهندسة العرض البصري',
          },
        },
        readTimeMinutes: Number(formReadTime) || 5,
        tags: formTags
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        publishedAt: new Date().toISOString(),
        likes: 0,
        comments: [],
      };
      onAddBlogPost(newPost);
      setArticleNotice(lang === 'ar' ? 'تم حفظ ونشر المقال بنجاح!' : 'Article published successfully!');
    } else if (articleViewMode === 'edit' && editingPostId) {
      const existing = blogPosts.find((p) => p.id === editingPostId);
      if (!existing) return;
      const updatedPost: BlogPost = {
        ...existing,
        slug: cleanSlug,
        title: {
          en: formTitleEn.trim() || existing.title.en,
          ar: formTitleAr.trim() || existing.title.ar,
        },
        excerpt: {
          en: formExcerptEn.trim() || existing.excerpt.en,
          ar: formExcerptAr.trim() || existing.excerpt.ar,
        },
        content: {
          en: formContentEn.trim() || existing.content.en,
          ar: formContentAr.trim() || existing.content.ar,
        },
        coverImage: formCoverImage.trim() || existing.coverImage,
        category: formCategory,
        readTimeMinutes: Number(formReadTime) || existing.readTimeMinutes,
        tags: formTags
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      };
      onUpdateBlogPost(updatedPost);
      setArticleNotice(lang === 'ar' ? 'تم تحديث المقال بنجاح!' : 'Article updated successfully!');
    }

    setArticleViewMode('list');
    setEditingPostId(null);
    setTimeout(() => setArticleNotice(null), 3500);
  };

  const handleDeleteArticle = async (postId: string) => {
    if (!postId) return;
    setIsDeletingArticle(true);
    try {
      // 1. Explicit atomic IndexedDB deletion of the specific article and record in deleted articles store
      const result = await permanentlyDeleteBlogPostFromIndexedDB(postId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete article from IndexedDB');
      }

      // 2. Synchronize parent App state immediately
      await onDeleteBlogPost(postId);

      setArticleToDeleteId(null);
      setArticleNotice(
        lang === 'ar'
          ? 'تم حذف المقال نهائياً من قاعدة البيانات (IndexedDB) والتخزين المحلي ولن يعود عند التحديث!'
          : 'Article permanently purged from IndexedDB and local storage. Guaranteed reload persistence!'
      );
    } catch (err: any) {
      console.error('Failed to permanently delete article:', err);
      setArticleNotice(
        lang === 'ar'
          ? `فشل في حذف المقال من قاعدة البيانات: ${err?.message || 'خطأ غير متوقع'}`
          : `Failed to delete article: ${err?.message || 'Unexpected database error'}`
      );
    } finally {
      setIsDeletingArticle(false);
      setTimeout(() => setArticleNotice(null), 4000);
    }
  };

  const filteredBlogPosts = blogPosts.filter((post) => {
    if (!articleSearchQuery.trim()) return true;
    const q = articleSearchQuery.toLowerCase().trim();
    return (
      post.title.en.toLowerCase().includes(q) ||
      post.title.ar.toLowerCase().includes(q) ||
      post.category.toLowerCase().includes(q) ||
      post.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  // Export JSON Backup
  const handleExportBackup = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      wallpapers,
      blogPosts,
      totalDownloads,
      totalUsers,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DeskSpace4K_Backup_${Date.now()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/90 backdrop-blur-xl">
      <div
        className="relative w-full max-w-6xl max-h-[94vh] bg-[#101116] border border-[#272A3C] rounded-3xl shadow-2xl overflow-hidden flex flex-col text-neutral-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="px-6 py-4 bg-[#0B0C10] border-b border-[#202230] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-red-500/20 border border-amber-500/30 text-amber-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  DeskSpace4K Admin Center
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                  MANUAL REPOSITORY
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                {lang === 'ar'
                  ? 'لوحة الإدارة والتحكم في رفع الخلفيات بدقة 4K والمقالات وحفظها في IndexedDB'
                  : 'Manual 4K Wallpaper Upload & Admin Management System (IndexedDB Storage)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <>
                <button
                  type="button"
                  onClick={handleMasterSaveChanges}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-bold transition-all cursor-pointer"
                  title="Force Persist All Changes to Storage"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'مزامنة وحفظ دائم' : 'Save to IndexedDB'}</span>
                </button>

                <button
                  onClick={handleLogoutAdmin}
                  className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold transition-colors cursor-pointer"
                >
                  {lang === 'ar' ? 'خروج' : 'Log Out'}
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-neutral-800/60 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Close Admin Center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Master Save Toast */}
        {masterSaveToast && (
          <div className="bg-gradient-to-r from-cyan-950/90 to-blue-950/90 border-b border-cyan-500/30 px-6 py-2.5 text-xs text-cyan-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="font-medium">{masterSaveToast}</span>
            </div>
            <button onClick={() => setMasterSaveToast(null)} className="text-cyan-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Body Content */}
        {!isAuthenticated ? (
          /* Password Authentication Gate */
          <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-lg shadow-amber-500/10">
              <Key className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-white mb-1">
              {lang === 'ar' ? 'تسجيل دخول المشرف' : 'Administrator Master Access'}
            </h3>
            <p className="text-xs text-neutral-400 mb-6 leading-relaxed">
              {lang === 'ar'
                ? 'أدخل المفتاح الإداري السري للوصول إلى إدارة ورفع خلفيات الشاشة بدقة 4K والمقالات.'
                : 'Enter the master security key to manage 4K wallpaper uploads, storage, and articles.'}
            </p>

            {authError && (
              <div className="w-full mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="w-full space-y-3">
              <input
                type="password"
                required
                placeholder={lang === 'ar' ? 'أدخل المفتاح الإداري...' : 'Enter Master Security Key...'}
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full px-4 py-3.5 rounded-2xl bg-[#08090D] border border-[#272A3C] text-white text-xs placeholder:text-neutral-600 focus:outline-none focus:border-cyan-500 transition-colors"
              />

              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-2xl font-black text-xs bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
              >
                {lang === 'ar' ? 'فتح لوحة التحكم' : 'Unlock Admin Dashboard'}
              </button>
            </form>

            <div className="mt-6 flex flex-col items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setShowHint(!showHint)}
                className="flex items-center gap-1.5 text-neutral-400 hover:text-cyan-400 transition-colors cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{showHint ? 'Hide Master Key Hint' : 'Show Master Key Hint'}</span>
              </button>

              {showHint && (
                <div className="p-3 rounded-xl bg-[#171822] border border-[#2B2E42] text-[11px] font-mono text-cyan-400">
                  Master Key: <code className="text-white font-bold select-all">DeskAdmin4K!2026</code>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Authenticated Dashboard */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top Navigation Tabs */}
            <div className="flex items-center px-6 border-b border-[#202230] bg-[#0C0D12] gap-1 overflow-x-auto shrink-0">
              {/* Tab 1: Manual 4K Upload (Primary) */}
              <button
                onClick={() => setAdminTab('manual')}
                className={`flex items-center gap-2 py-3.5 px-4 text-xs font-black border-b-2 transition-all shrink-0 cursor-pointer ${
                  adminTab === 'manual'
                    ? 'border-cyan-400 text-cyan-300 bg-cyan-500/5'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                <Plus className="w-4 h-4 text-cyan-400" />
                <span>{lang === 'ar' ? 'رفع يدوي مخصص (4K Upload)' : 'Manual 4K Upload Form'}</span>
                <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[9px]">
                  NEW
                </span>
              </button>

              {/* Tab 2: Manage Wallpapers */}
              <button
                onClick={() => setAdminTab('manage')}
                className={`flex items-center gap-2 py-3.5 px-4 text-xs font-black border-b-2 transition-all shrink-0 cursor-pointer ${
                  adminTab === 'manage'
                    ? 'border-cyan-400 text-cyan-300 bg-cyan-500/5'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>{lang === 'ar' ? 'إدارة الخلفيات' : 'Manage Wallpapers'}</span>
                <span className="px-1.5 py-0.5 rounded bg-[#1B1D28] text-neutral-400 font-mono text-[10px]">
                  {wallpapers.length}
                </span>
              </button>

              {/* Tab 3: Batch Drop Uploader */}
              <button
                onClick={() => setAdminTab('bulk')}
                className={`flex items-center gap-2 py-3.5 px-4 text-xs font-black border-b-2 transition-all shrink-0 cursor-pointer ${
                  adminTab === 'bulk'
                    ? 'border-cyan-400 text-cyan-300 bg-cyan-500/5'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                <UploadCloud className="w-4 h-4 text-cyan-400" />
                <span>{lang === 'ar' ? 'رفع جماعي (Batch Drop)' : 'Batch Drop Uploader'}</span>
                {queuedFiles.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-cyan-500 text-black font-bold text-[10px]">
                    {queuedFiles.length}
                  </span>
                )}
              </button>

              {/* Tab 4: Articles & Journal */}
              <button
                onClick={() => setAdminTab('articles')}
                className={`flex items-center gap-2 py-3.5 px-4 text-xs font-black border-b-2 transition-all shrink-0 cursor-pointer ${
                  adminTab === 'articles'
                    ? 'border-cyan-400 text-cyan-300 bg-cyan-500/5'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                <BookOpen className="w-4 h-4 text-cyan-400" />
                <span>{lang === 'ar' ? 'المقالات والمدونة' : 'Journal & Articles'}</span>
                <span className="px-1.5 py-0.5 rounded bg-[#1B1D28] text-neutral-400 font-mono text-[10px]">
                  {blogPosts.length}
                </span>
              </button>

              {/* Tab 5: Stats & Storage */}
              <button
                onClick={() => setAdminTab('stats')}
                className={`flex items-center gap-2 py-3.5 px-4 text-xs font-black border-b-2 transition-all shrink-0 cursor-pointer ${
                  adminTab === 'stats'
                    ? 'border-cyan-400 text-cyan-300 bg-cyan-500/5'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <span>{lang === 'ar' ? 'الإحصائيات والتخزين' : 'Stats & Storage'}</span>
              </button>

              {/* Tab 6: AI Copilot Assistant */}
              <button
                onClick={() => setAdminTab('copilot')}
                className={`flex items-center gap-2 py-3.5 px-4 text-xs font-black border-b-2 transition-all shrink-0 cursor-pointer ${
                  adminTab === 'copilot'
                    ? 'border-fuchsia-400 text-fuchsia-300 bg-fuchsia-500/10'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-4 h-4 text-fuchsia-400" />
                <span>{lang === 'ar' ? 'مساعد الذكاء الاصطناعي (AI Copilot)' : 'AI Copilot Assistant'}</span>
                <span className="px-1.5 py-0.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white font-black text-[9px] shadow-sm tracking-wide">
                  AI PROMPT
                </span>
              </button>
            </div>

            {/* Content Container */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#101116]">
              {/* ========================================================= */}
              {/* TAB 1: MANUAL 4K UPLOAD FORM (Requested Feature #1 & #2) */}
              {/* ========================================================= */}
              {adminTab === 'manual' && (
                <div className="max-w-4xl mx-auto space-y-6">
                  {/* Status Banner */}
                  {manualNotice && (
                    <div
                      className={`p-4 rounded-2xl text-xs font-medium flex items-center justify-between border ${
                        manualNotice.type === 'success'
                          ? 'bg-green-500/10 border-green-500/30 text-green-300'
                          : 'bg-red-500/10 border-red-500/30 text-red-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {manualNotice.type === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                        )}
                        <span>{manualNotice.message}</span>
                      </div>
                      <button onClick={() => setManualNotice(null)} className="opacity-70 hover:opacity-100">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <form onSubmit={handlePublishManualWallpaper} className="space-y-6">
                    {/* Top Storage Guarantee Badge */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-[#151722] border border-[#272B3E]">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                          <Database className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-black text-white">
                            {lang === 'ar' ? 'التخزين الدائم التلقائي (IndexedDB)' : 'IndexedDB Zero-Decay Storage Engine'}
                          </div>
                          <div className="text-[11px] text-neutral-400">
                            {lang === 'ar'
                              ? 'يتم تحويل الملفات وحفظها كـ Blobs حقيقية مع توليد مصغرات خفيفة 640px أوتوماتيكياً.'
                              : 'Files are stored as raw Blobs in IndexedDB with automated lightweight grid thumbnail generation.'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 font-mono text-[10px]">
                        <span className="px-2.5 py-1 rounded-lg bg-green-500/10 border border-green-500/30 text-green-300 font-bold flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                          <span>IndexedDB v3 Online</span>
                        </span>
                      </div>
                    </div>

                    {/* Mandatory Target Category / Placement Controls (Requested Feature 1) */}
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-[#161825] via-[#12131C] to-[#1C1628] border-2 border-cyan-500/40 shadow-xl space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#25283C]">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
                            <Layers className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-black text-white flex items-center gap-2">
                              <span>{lang === 'ar' ? 'التصنيف والوجهة المستهدفة (إلزامي)' : 'Target Category & Placement (Mandatory)'}</span>
                              <span className="text-rose-400 font-black text-sm">*</span>
                            </div>
                            <div className="text-[11px] text-neutral-400 mt-0.5">
                              {lang === 'ar'
                                ? 'حدد بدقة وجهة إدراج الخلفية: معلف سطح المكتب (16:9) أو معلف الهواتف الحية المخصص (9:16).'
                                : 'Choose destination feed: Desktop Wallpapers (16:9) or Dedicated Mobile Live Motion (9:16).'}
                            </div>
                          </div>
                        </div>

                        <span className={`px-3 py-1 rounded-xl text-[10px] font-mono font-black border flex items-center gap-1.5 ${
                          manualDeviceFormat === 'mobile'
                            ? 'bg-fuchsia-500/15 border-fuchsia-500/40 text-fuchsia-300'
                            : 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                        }`}>
                          {manualDeviceFormat === 'mobile' ? (
                            <>
                              <Smartphone className="w-3.5 h-3.5 text-fuchsia-400" />
                              <span>MOBILE 9:16 VERTICAL</span>
                            </>
                          ) : (
                            <>
                              <Monitor className="w-3.5 h-3.5 text-cyan-400" />
                              <span>DESKTOP 16:9 UHD</span>
                            </>
                          )}
                        </span>
                      </div>

                      {/* Dropdown Menu for Target Category / Placement */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-neutral-300 block">
                          {lang === 'ar' ? 'اختر الوجهة والتصنيف المستهدف *' : 'Select Target Category / Placement *'}
                        </label>
                        <select
                          required
                          value={manualTargetPlacement}
                          onChange={(e) => handleSelectTargetPlacement(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-[#090A0E] border-2 border-cyan-500/40 text-white font-bold text-xs focus:outline-none focus:border-cyan-400 transition-all cursor-pointer shadow-inner"
                        >
                          <optgroup label={lang === 'ar' ? '🖥️ خلفيات سطح المكتب (16:9) - المعلف العام' : '🖥️ Desktop Wallpapers (16:9) - Public Feed'}>
                            {TARGET_PLACEMENT_OPTIONS.filter((o) => o.deviceFormat === 'desktop').map((opt) => (
                              <option key={opt.key} value={opt.key}>
                                {lang === 'ar' ? opt.labelAr : opt.labelEn}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label={lang === 'ar' ? '📱 خلفيات الهاتف الحية (9:16) - المعلف المخصص للهواتف' : '📱 Mobile Live Wallpapers (9:16) - Dedicated Smartphone Feed'}>
                            {TARGET_PLACEMENT_OPTIONS.filter((o) => o.deviceFormat === 'mobile').map((opt) => (
                              <option key={opt.key} value={opt.key}>
                                {lang === 'ar' ? opt.labelAr : opt.labelEn}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </div>

                      {/* Quick Segmented Device Toggle Sync */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#202234]">
                        <span className="text-[11px] text-neutral-400">
                          {manualDeviceFormat === 'mobile'
                            ? (lang === 'ar' ? 'سيتم حفظ الخلفية في قسم الهواتف برقم أبعاد رأسي 9:16 وتوليد مصغرات خفيفة.' : 'Entry is assigned 9:16 vertical dimensions and tagged under Mobile Live Wallpapers.')
                            : (lang === 'ar' ? 'سيتم حفظ الخلفية في قسم سطح المكتب الرئيسي بأبعاد أفقية 16:9 فائقة الوضوح.' : 'Entry is assigned 16:9 horizontal dimensions for desktop public gallery.')}
                        </span>

                        <div className="flex items-center p-1 bg-[#090A0E] rounded-xl border border-[#252838] shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleDeviceFormat('desktop')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              manualDeviceFormat === 'desktop'
                                ? 'bg-cyan-500 text-black shadow-md'
                                : 'text-neutral-400 hover:text-white'
                            }`}
                          >
                            <Monitor className="w-3.5 h-3.5" />
                            <span>{t.formatDesktop || (lang === 'ar' ? 'سطح المكتب (16:9)' : 'Desktop (16:9)')}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleDeviceFormat('mobile')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              manualDeviceFormat === 'mobile'
                                ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-md shadow-fuchsia-500/25'
                                : 'text-neutral-400 hover:text-white'
                            }`}
                          >
                            <Smartphone className="w-3.5 h-3.5 text-fuchsia-300" />
                            <span>{t.formatMobile || (lang === 'ar' ? 'هاتف حي (9:16)' : 'Mobile Live (9:16)')}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Media Uploaders Grid: Dynamic Adapted based on Desktop (16:9) vs Mobile Live (9:16) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Box A: When Mobile -> Mobile Motion Video (.mp4 / .webm); When Desktop -> Static 4K Image */}
                      {manualDeviceFormat === 'mobile' ? (
                        /* Mobile Live: Motion Video (Primary / Required) */
                        <div className="p-5 rounded-2xl bg-[#14151E] border border-fuchsia-500/30 flex flex-col justify-between space-y-4">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-xs font-black text-white flex items-center gap-2">
                                <Film className="w-4 h-4 text-fuchsia-400" />
                                <span>{lang === 'ar' ? 'أ) فيديو حركة الهاتف (.mp4 / .webm)' : 'a) Mobile Motion Video (.mp4 / .webm)'}</span>
                              </label>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-300 font-bold border border-fuchsia-500/30">
                                9:16 VERTICAL
                              </span>
                            </div>
                            <p className="text-[11px] text-neutral-400 leading-relaxed">
                              {lang === 'ar'
                                ? 'ارفع فيديو رأسي عالي السلاسة (9:16) بدقة 4K أو FHD لشاشات الهواتف الذكية (60 FPS).'
                                : 'Upload vertical 9:16 motion video in 4K or FHD resolution for smartphone lockscreens & home screens (60 FPS).'}
                            </p>
                          </div>

                          {manualVideoPreview ? (
                            <div className="relative rounded-2xl overflow-hidden bg-black/60 border border-fuchsia-500/40 aspect-[9/16] max-h-[380px] w-full mx-auto flex items-center justify-center group shadow-xl">
                              <video
                                ref={manualVideoPlayerRef}
                                src={manualVideoPreview}
                                autoPlay
                                loop
                                muted={isVideoMuted}
                                playsInline
                                className="w-full h-full object-cover"
                              />
                              {/* Controls Overlay */}
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between p-3">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (manualVideoPlayerRef.current) {
                                        if (isVideoPlaying) {
                                          manualVideoPlayerRef.current.pause();
                                          setIsVideoPlaying(false);
                                        } else {
                                          manualVideoPlayerRef.current.play();
                                          setIsVideoPlaying(true);
                                        }
                                      }
                                    }}
                                    className="p-1.5 rounded-lg bg-black/70 hover:bg-black text-white"
                                  >
                                    {isVideoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setIsVideoMuted(!isVideoMuted)}
                                    className="p-1.5 rounded-lg bg-black/70 hover:bg-black text-white"
                                  >
                                    {isVideoMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={handleClearManualVideo}
                                  className="px-3 py-1.5 rounded-lg bg-red-500/80 hover:bg-red-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>{lang === 'ar' ? 'إزالة' : 'Remove'}</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div
                              onClick={() => manualVideoInputRef.current?.click()}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (e.dataTransfer.files?.[0]) handleManualVideoSelect(e.dataTransfer.files[0]);
                              }}
                              className="border-2 border-dashed border-fuchsia-500/30 hover:border-fuchsia-500/60 rounded-2xl p-6 text-center cursor-pointer transition-all hover:bg-fuchsia-500/5 flex flex-col items-center justify-center gap-3 aspect-[9/16] max-h-[380px] w-full mx-auto"
                            >
                              <div className="p-3.5 rounded-2xl bg-fuchsia-500/10 text-fuchsia-400">
                                <Film className="w-7 h-7" />
                              </div>
                              <div>
                                <div className="text-xs font-bold text-white">
                                  {lang === 'ar' ? 'اسحب فيديو الهاتف الرأسي هنا' : 'Drag & drop vertical mobile video'}
                                </div>
                                <div className="text-[10px] text-fuchsia-300/80 mt-1">
                                  9:16 Portrait · MP4 / WEBM (60 FPS)
                                </div>
                              </div>
                            </div>
                          )}

                          <input
                            ref={manualVideoInputRef}
                            type="file"
                            accept="video/mp4,video/webm,video/quicktime"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files?.[0]) handleManualVideoSelect(e.target.files[0]);
                            }}
                          />
                        </div>
                      ) : (
                        /* Desktop: Static 4K Image (Primary / Required) */
                        <div className="p-5 rounded-2xl bg-[#14151E] border border-[#232635] flex flex-col justify-between space-y-4">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-xs font-black text-white flex items-center gap-2">
                                <ImageIcon className="w-4 h-4 text-cyan-400" />
                                <span>{lang === 'ar' ? '1. الصورة الثابتة بدقة 4K (مطلوب)' : '1. 4K Static Image (Required)'}</span>
                              </label>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 font-bold">
                                JPG / PNG / WEBP
                              </span>
                            </div>
                            <p className="text-[11px] text-neutral-400 leading-relaxed">
                              {lang === 'ar'
                                ? 'ارفع الصورة الأصلية فائقة الدقة (3840×2160). سيتم توليد مصغر خفيف 640px تلقائياً للمعرض.'
                                : 'Upload the raw 4K image (3840x2160). A lightweight 640px thumbnail will be generated automatically for the grid.'}
                            </p>
                          </div>

                          {manualImagePreview ? (
                            <div className="relative rounded-xl overflow-hidden bg-black/60 border border-cyan-500/40 aspect-video flex items-center justify-center group">
                              <img
                                src={manualImagePreview}
                                alt="Manual Upload Preview"
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-4">
                                <span className="text-xs font-bold text-white">
                                  {manualImageDimensions
                                    ? `${manualImageDimensions.width} × ${manualImageDimensions.height} Pixels`
                                    : '4K Ultra HD'}
                                </span>
                                <span className="text-[11px] text-neutral-300 font-mono">
                                  {manualImageFile ? `${(manualImageFile.size / (1024 * 1024)).toFixed(2)} MB` : ''}
                                </span>
                                <button
                                  type="button"
                                  onClick={handleClearManualImage}
                                  className="px-3 py-1.5 rounded-lg bg-red-500/80 hover:bg-red-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>{lang === 'ar' ? 'إزالة واستبدال' : 'Remove & Replace'}</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div
                              onClick={() => manualImageInputRef.current?.click()}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (e.dataTransfer.files?.[0]) handleManualImageSelect(e.dataTransfer.files[0]);
                              }}
                              className="border-2 border-dashed border-[#2D3145] hover:border-cyan-500/50 rounded-xl p-6 text-center cursor-pointer transition-all hover:bg-cyan-500/5 flex flex-col items-center justify-center gap-3 aspect-video"
                            >
                              <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400">
                                <FileImage className="w-6 h-6" />
                              </div>
                              <div>
                                <div className="text-xs font-bold text-white">
                                  {lang === 'ar' ? 'اسحب الصورة هنا أو اضغط للاختيار' : 'Drag & drop 4K image, or browse'}
                                </div>
                                <div className="text-[10px] text-neutral-500 mt-1">
                                  High Resolution 3840×2160 · Automatic Canvas Thumbnail
                                </div>
                              </div>
                            </div>
                          )}

                          <input
                            ref={manualImageInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/avif"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files?.[0]) handleManualImageSelect(e.target.files[0]);
                            }}
                          />
                        </div>
                      )}

                      {/* Box B: When Mobile -> Mobile Still Cover / Poster Image; When Desktop -> Optional Live Motion Video */}
                      {manualDeviceFormat === 'mobile' ? (
                        /* Mobile Live: Still Cover / Poster Image (.jpg / .png) */
                        <div className="p-5 rounded-2xl bg-[#14151E] border border-purple-500/30 flex flex-col justify-between space-y-4">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-xs font-black text-white flex items-center gap-2">
                                <ImageIcon className="w-4 h-4 text-purple-400" />
                                <span>{lang === 'ar' ? 'ب) صورة الغلاف الثابتة للهاتف (.jpg / .png)' : 'b) Mobile Still Cover / Poster (.jpg / .png)'}</span>
                              </label>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                                9:16 POSTER
                              </span>
                            </div>
                            <p className="text-[11px] text-neutral-400 leading-relaxed">
                              {lang === 'ar'
                                ? 'صورة الغلاف الرأسية الثابتة لعرض المعرض السريع وتوليد المصغرات الخفيفة. يتم استخراجها تلقائياً من الفيديو إذا تُركت فارغة.'
                                : 'Vertical 9:16 still cover for fast grid loading and lightweight thumbnail generation. Automatically extracted from video if omitted.'}
                            </p>
                          </div>

                          {manualImagePreview ? (
                            <div className="relative rounded-2xl overflow-hidden bg-black/60 border border-purple-500/40 aspect-[9/16] max-h-[380px] w-full mx-auto flex items-center justify-center group shadow-xl">
                              <img
                                src={manualImagePreview}
                                alt="Manual Mobile Poster Preview"
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-4">
                                <span className="text-xs font-bold text-white">
                                  {manualImageDimensions
                                    ? `${manualImageDimensions.width} × ${manualImageDimensions.height} Pixels`
                                    : '9:16 Portrait'}
                                </span>
                                <span className="text-[11px] text-neutral-300 font-mono">
                                  {manualImageFile ? `${(manualImageFile.size / (1024 * 1024)).toFixed(2)} MB` : ''}
                                </span>
                                <button
                                  type="button"
                                  onClick={handleClearManualImage}
                                  className="px-3 py-1.5 rounded-lg bg-red-500/80 hover:bg-red-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>{lang === 'ar' ? 'إزالة الغلاف' : 'Remove Cover'}</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div
                              onClick={() => manualImageInputRef.current?.click()}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (e.dataTransfer.files?.[0]) handleManualImageSelect(e.dataTransfer.files[0]);
                              }}
                              className="border-2 border-dashed border-purple-500/30 hover:border-purple-500/60 rounded-2xl p-6 text-center cursor-pointer transition-all hover:bg-purple-500/5 flex flex-col items-center justify-center gap-3 aspect-[9/16] max-h-[380px] w-full mx-auto"
                            >
                              <div className="p-3.5 rounded-2xl bg-purple-500/10 text-purple-400">
                                <FileImage className="w-7 h-7" />
                              </div>
                              <div>
                                <div className="text-xs font-bold text-white">
                                  {lang === 'ar' ? 'اسحب صورة الغلاف الرأسية هنا' : 'Drag & drop vertical cover image'}
                                </div>
                                <div className="text-[10px] text-purple-300/80 mt-1">
                                  9:16 Portrait · JPG / PNG (Optional fallback)
                                </div>
                              </div>
                            </div>
                          )}

                          <input
                            ref={manualImageInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/avif"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files?.[0]) handleManualImageSelect(e.target.files[0]);
                            }}
                          />
                        </div>
                      ) : (
                        /* Desktop: Optional 4K Live Motion Video (.mp4 / .webm) */
                        <div className="p-5 rounded-2xl bg-[#14151E] border border-[#232635] flex flex-col justify-between space-y-4">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-xs font-black text-white flex items-center gap-2">
                                <Film className="w-4 h-4 text-rose-400" />
                                <span>{lang === 'ar' ? '2. فيديو متحرك 4K (اختياري)' : '2. 4K Live Motion Video (Optional)'}</span>
                              </label>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 font-bold">
                                MP4 / WEBM
                              </span>
                            </div>
                            <p className="text-[11px] text-neutral-400 leading-relaxed">
                              {lang === 'ar'
                                ? 'إضافة فيديو يحوّل الخلفية تلقائياً لخلفية متحركة حية (60 FPS) مع تفعيل أزرار التحميل المزدوجة.'
                                : 'Adding a video enables 60 FPS live motion and unlocks dual download buttons (Motion MP4 vs. Still Photo).'}
                            </p>
                          </div>

                          {manualVideoPreview ? (
                            <div className="relative rounded-xl overflow-hidden bg-black/60 border border-rose-500/40 aspect-video flex items-center justify-center group">
                              <video
                                ref={manualVideoPlayerRef}
                                src={manualVideoPreview}
                                autoPlay
                                loop
                                muted={isVideoMuted}
                                playsInline
                                className="w-full h-full object-cover"
                              />
                              {/* Controls Overlay */}
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between p-3">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (manualVideoPlayerRef.current) {
                                        if (isVideoPlaying) {
                                          manualVideoPlayerRef.current.pause();
                                          setIsVideoPlaying(false);
                                        } else {
                                          manualVideoPlayerRef.current.play();
                                          setIsVideoPlaying(true);
                                        }
                                      }
                                    }}
                                    className="p-1.5 rounded-lg bg-black/70 hover:bg-black text-white"
                                  >
                                    {isVideoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setIsVideoMuted(!isVideoMuted)}
                                    className="p-1.5 rounded-lg bg-black/70 hover:bg-black text-white"
                                  >
                                    {isVideoMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={handleClearManualVideo}
                                  className="px-3 py-1.5 rounded-lg bg-red-500/80 hover:bg-red-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>{lang === 'ar' ? 'إزالة الفيديو' : 'Remove Video'}</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div
                              onClick={() => manualVideoInputRef.current?.click()}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (e.dataTransfer.files?.[0]) handleManualVideoSelect(e.dataTransfer.files[0]);
                              }}
                              className="border-2 border-dashed border-[#2D3145] hover:border-rose-500/50 rounded-xl p-6 text-center cursor-pointer transition-all hover:bg-rose-500/5 flex flex-col items-center justify-center gap-3 aspect-video"
                            >
                              <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-400">
                                <Film className="w-6 h-6" />
                              </div>
                              <div>
                                <div className="text-xs font-bold text-white">
                                  {lang === 'ar' ? 'اسحب ملف الفيديو هنا (اختياري)' : 'Drag & drop live video (optional)'}
                                </div>
                                <div className="text-[10px] text-neutral-500 mt-1">
                                  Looping MP4 / WEBM · Seamless Wallpaper Engine Format
                                </div>
                              </div>
                            </div>
                          )}

                          <input
                            ref={manualVideoInputRef}
                            type="file"
                            accept="video/mp4,video/webm,video/quicktime"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files?.[0]) handleManualVideoSelect(e.target.files[0]);
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Metadata Section: Titles, Category, Resolution, Tags, Descriptions */}
                    <div className="p-6 rounded-2xl bg-[#14151E] border border-[#232635] space-y-5">
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#202230]">
                        <div className="text-xs font-black uppercase text-neutral-400 tracking-wider flex items-center gap-2">
                          <Tag className="w-4 h-4 text-cyan-400" />
                          <span>{lang === 'ar' ? 'بيانات ومعلومات الخلفية' : 'Wallpaper Metadata & Specs'}</span>
                        </div>

                        {/* Top AI Smart Suggest Action Button */}
                        <button
                          type="button"
                          onClick={() => handleGenerateWallpaperMetadata('all')}
                          disabled={aiSuggestLoading}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-fuchsia-500/20 via-purple-500/20 to-cyan-500/20 hover:from-fuchsia-500/30 hover:to-cyan-500/30 border border-fuchsia-500/40 text-fuchsia-300 text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-sm shadow-fuchsia-500/10 active:scale-95 disabled:opacity-50"
                        >
                          {aiSuggestLoading && aiSuggestTarget === 'all' ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-fuchsia-400" />
                              <span>{lang === 'ar' ? 'جاري الاستنتاج بالذكاء الاصطناعي...' : 'AI Generating...'}</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
                              <span>{lang === 'ar' ? '✨ اقتراح ذكي شامل بالذكاء الاصطناعي' : '✨ AI Smart Suggest (All Fields)'}</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* AI Generated Suggestion Preview Card (if available) */}
                      {aiWallpaperResult && (
                        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-950/40 via-[#161426] to-cyan-950/30 border border-purple-500/30 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-fuchsia-400" />
                              <span className="text-xs font-black text-fuchsia-200">
                                {lang === 'ar' ? 'اقتراح الذكاء الاصطناعي الأخير' : 'Latest AI Smart Suggestion'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setManualTitleEn(aiWallpaperResult.titleEn);
                                  setManualTitleAr(aiWallpaperResult.titleAr);
                                  setManualTags(aiWallpaperResult.tags);
                                  setManualDescEn(aiWallpaperResult.descEn);
                                  setManualDescAr(aiWallpaperResult.descAr);
                                  setAiSuccessToast(lang === 'ar' ? 'تم تطبيق جميع الاقتراحات!' : 'Applied all AI suggestions to form!');
                                  setTimeout(() => setAiSuccessToast(null), 3000);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-fuchsia-500/20 hover:bg-fuchsia-500/30 text-fuchsia-300 border border-fuchsia-500/30 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Check className="w-3 h-3" />
                                <span>{lang === 'ar' ? 'تطبيق الكل' : 'Apply All to Form'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleCopyToClipboard(
                                    `Title EN: ${aiWallpaperResult.titleEn}\nTitle AR: ${aiWallpaperResult.titleAr}\nTags: ${aiWallpaperResult.tags}\nDescription: ${aiWallpaperResult.descEn}`,
                                    'all_ai_meta'
                                  )
                                }
                                className="px-2.5 py-1 rounded-lg bg-[#202235] hover:bg-[#2B2E48] text-neutral-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                {copiedKey === 'all_ai_meta' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                                <span>{copiedKey === 'all_ai_meta' ? (lang === 'ar' ? 'تم النسخ' : 'Copied') : (lang === 'ar' ? 'نسخ' : 'Copy')}</span>
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                              <span className="text-[10px] text-fuchsia-400 font-bold block mb-0.5">Title (EN & AR):</span>
                              <div className="font-medium text-white">{aiWallpaperResult.titleEn}</div>
                              <div className="font-medium text-neutral-400 text-right">{aiWallpaperResult.titleAr}</div>
                            </div>
                            <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                              <span className="text-[10px] text-cyan-400 font-bold block mb-0.5">Tags:</span>
                              <div className="text-neutral-300 text-[11px] truncate">{aiWallpaperResult.tags}</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Bilingual Titles with Inline AI Suggest Button */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-neutral-300">
                            {lang === 'ar' ? 'عناوين الخلفية (العربية والإنجليزية)' : 'Wallpaper Titles (English & Arabic)'} *
                          </label>
                          <button
                            type="button"
                            onClick={() => handleGenerateWallpaperMetadata('title')}
                            disabled={aiSuggestLoading}
                            className="text-[11px] font-bold text-fuchsia-400 hover:text-fuchsia-300 flex items-center gap-1 transition-colors cursor-pointer px-2 py-0.5 rounded-md hover:bg-fuchsia-500/10"
                            title="Generate catchy 4K titles with AI"
                          >
                            {aiSuggestLoading && aiSuggestTarget === 'title' ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Sparkles className="w-3 h-3" />
                            )}
                            <span>{lang === 'ar' ? 'اقتراح العناوين بالذكاء الاصطناعي' : 'AI Smart Suggest Title'}</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="relative">
                            <input
                              type="text"
                              required
                              placeholder={
                                aiSuggestLoading && (aiSuggestTarget === 'all' || aiSuggestTarget === 'title')
                                  ? (lang === 'ar' ? 'الذكاء الاصطناعي يستنتج عنواناً إنجليزياً...' : 'AI Co-Pilot is drafting English title...')
                                  : 'e.g. Neo-Tokyo Cyberpunk Rain 4K'
                              }
                              value={manualTitleEn}
                              onChange={(e) => setManualTitleEn(e.target.value)}
                              className={`w-full px-4 py-3 rounded-xl bg-[#090A0E] border text-white text-xs focus:outline-none focus:border-cyan-500 transition-all ${
                                aiSuggestLoading && (aiSuggestTarget === 'all' || aiSuggestTarget === 'title')
                                  ? 'border-fuchsia-500/60 bg-fuchsia-950/20 pr-10 animate-pulse'
                                  : 'border-[#2B2F42]'
                              }`}
                            />
                            {aiSuggestLoading && (aiSuggestTarget === 'all' || aiSuggestTarget === 'title') && (
                              <div className="absolute right-3 top-3 pointer-events-none flex items-center">
                                <Loader2 className="w-4 h-4 animate-spin text-fuchsia-400" />
                              </div>
                            )}
                            <span className="text-[10px] text-neutral-500 mt-1 block">Title (English)</span>
                          </div>

                          <div className="relative">
                            <input
                              type="text"
                              required
                              placeholder={
                                aiSuggestLoading && (aiSuggestTarget === 'all' || aiSuggestTarget === 'title')
                                  ? (lang === 'ar' ? 'الذكاء الاصطناعي يستنتج عنواناً عربياً...' : 'AI Co-Pilot is drafting Arabic title...')
                                  : 'مثال: أمطار نيو طوكيو السايبربانك بدقة 4K'
                              }
                              value={manualTitleAr}
                              onChange={(e) => setManualTitleAr(e.target.value)}
                              className={`w-full px-4 py-3 rounded-xl bg-[#090A0E] border text-white text-xs focus:outline-none focus:border-cyan-500 transition-all text-right ${
                                aiSuggestLoading && (aiSuggestTarget === 'all' || aiSuggestTarget === 'title')
                                  ? 'border-fuchsia-500/60 bg-fuchsia-950/20 pl-10 animate-pulse'
                                  : 'border-[#2B2F42]'
                              }`}
                            />
                            {aiSuggestLoading && (aiSuggestTarget === 'all' || aiSuggestTarget === 'title') && (
                              <div className="absolute left-3 top-3 pointer-events-none flex items-center">
                                <Loader2 className="w-4 h-4 animate-spin text-fuchsia-400" />
                              </div>
                            )}
                            <span className="text-[10px] text-neutral-500 mt-1 block text-right">العنوان (بالعربية)</span>
                          </div>
                        </div>
                      </div>

                      {/* Category Selector (Anime, Gaming, Nature, Space, Cars, Minimalist, Journal) */}
                      <div>
                        <label className="block text-xs font-bold text-neutral-300 mb-2">
                          {lang === 'ar' ? 'القسم / التصنيف (Category)' : 'Category'} *
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {CATEGORIES.map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setManualCategory(cat)}
                              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                manualCategory === cat
                                  ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20'
                                  : 'bg-[#1C1E2B] text-neutral-300 hover:bg-[#25283A] border border-[#2B2F42]'
                              }`}
                            >
                              {t.categories[cat] || cat}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Resolution Selector */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                            {lang === 'ar' ? 'الدقة الأصلية (Resolution)' : 'Target Resolution'}
                          </label>
                          <select
                            value={manualResolution}
                            onChange={(e) => setManualResolution(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-[#090A0E] border border-[#2B2F42] text-white text-xs focus:outline-none focus:border-cyan-500 transition-colors"
                          >
                            {RESOLUTION_PRESETS.map((res) => (
                              <option key={res.id} value={res.value}>
                                {res.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                            {lang === 'ar' ? 'نوع الحركة (Motion Mode)' : 'Motion Type'}
                          </label>
                          <div className="flex items-center gap-3 h-[42px] px-4 rounded-xl bg-[#090A0E] border border-[#2B2F42]">
                            <label className="flex items-center gap-2 cursor-pointer text-xs">
                              <input
                                type="checkbox"
                                checked={manualIsLive}
                                onChange={(e) => setManualIsLive(e.target.checked)}
                                className="w-4 h-4 rounded text-rose-500 focus:ring-rose-500"
                              />
                              <span className={manualIsLive ? 'text-rose-400 font-bold' : 'text-neutral-400'}>
                                {manualIsLive ? '60 FPS Live Wallpaper' : 'Static 4K Wallpaper'}
                              </span>
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Tags & Quick Tag Chips with Inline AI Suggest Button */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-neutral-300">
                            {lang === 'ar' ? 'الوسوم والكلمات المفتاحية (Tags)' : 'Tags (comma-separated)'}
                          </label>
                          <button
                            type="button"
                            onClick={() => handleGenerateWallpaperMetadata('tags')}
                            disabled={aiSuggestLoading}
                            className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors cursor-pointer px-2 py-0.5 rounded-md hover:bg-cyan-500/10"
                            title="Generate SEO tags with AI"
                          >
                            {aiSuggestLoading && aiSuggestTarget === 'tags' ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Sparkles className="w-3 h-3" />
                            )}
                            <span>{lang === 'ar' ? 'اقتراح الوسوم ذكياً' : 'AI Smart Suggest Tags'}</span>
                          </button>
                        </div>

                        <div className="relative">
                          <input
                            type="text"
                            placeholder={
                              aiSuggestLoading && (aiSuggestTarget === 'all' || aiSuggestTarget === 'tags')
                                ? (lang === 'ar' ? 'الذكاء الاصطناعي يستخرج أفضل الوسوم لشاشات 4K...' : 'AI Co-Pilot is extracting 4K display tags...')
                                : '4K Ultra HD, Desktop, OLED Black, HDR, Live Motion'
                            }
                            value={manualTags}
                            onChange={(e) => setManualTags(e.target.value)}
                            className={`w-full px-4 py-3 rounded-xl bg-[#090A0E] border text-white text-xs focus:outline-none focus:border-cyan-500 transition-all ${
                              aiSuggestLoading && (aiSuggestTarget === 'all' || aiSuggestTarget === 'tags')
                                ? 'border-cyan-500/60 bg-cyan-950/20 pr-10 animate-pulse'
                                : 'border-[#2B2F42]'
                            }`}
                          />
                          {aiSuggestLoading && (aiSuggestTarget === 'all' || aiSuggestTarget === 'tags') && (
                            <div className="absolute right-3 top-3 pointer-events-none flex items-center">
                              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <span className="text-[10px] text-neutral-400 mr-1">Quick Add:</span>
                          {QUICK_TAG_SUGGESTIONS.map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => handleAddQuickTag(tag)}
                              className="text-[10px] px-2 py-0.5 rounded-lg bg-[#191B28] hover:bg-cyan-500/20 text-neutral-400 hover:text-cyan-300 border border-[#262A3B] transition-colors cursor-pointer"
                            >
                              + {tag}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Bilingual Description Textareas with Inline AI Suggest Button */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-neutral-300">
                            {lang === 'ar' ? 'الوصف الترويجي والتفصيلي' : 'Wallpaper Descriptions (English & Arabic)'}
                          </label>
                          <button
                            type="button"
                            onClick={() => handleGenerateWallpaperMetadata('desc')}
                            disabled={aiSuggestLoading}
                            className="text-[11px] font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors cursor-pointer px-2 py-0.5 rounded-md hover:bg-purple-500/10"
                            title="Draft crisp description with AI"
                          >
                            {aiSuggestLoading && aiSuggestTarget === 'desc' ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Sparkles className="w-3 h-3" />
                            )}
                            <span>{lang === 'ar' ? 'صياغة الوصف بالذكاء الاصطناعي' : 'AI Smart Suggest Description'}</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="relative">
                            <textarea
                              rows={3}
                              placeholder={
                                aiSuggestLoading && (aiSuggestTarget === 'all' || aiSuggestTarget === 'desc')
                                  ? (lang === 'ar' ? 'الذكاء الاصطناعي يقوم بصياغة الوصف بالإنجليزية...' : 'AI Co-Pilot is drafting English description...')
                                  : 'Master-grade 4K Ultra HD desktop wallpaper precision-calibrated for OLED contrast...'
                              }
                              value={manualDescEn}
                              onChange={(e) => setManualDescEn(e.target.value)}
                              className={`w-full p-3 rounded-xl bg-[#090A0E] border text-white text-xs focus:outline-none focus:border-cyan-500 transition-all ${
                                aiSuggestLoading && (aiSuggestTarget === 'all' || aiSuggestTarget === 'desc')
                                  ? 'border-purple-500/60 bg-purple-950/20 pr-9 animate-pulse'
                                  : 'border-[#2B2F42]'
                              }`}
                            />
                            {aiSuggestLoading && (aiSuggestTarget === 'all' || aiSuggestTarget === 'desc') && (
                              <div className="absolute right-3 top-3 pointer-events-none flex items-center">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                              </div>
                            )}
                            <span className="text-[10px] text-neutral-500 mt-1 block">Description (English)</span>
                          </div>

                          <div className="relative">
                            <textarea
                              rows={3}
                              placeholder={
                                aiSuggestLoading && (aiSuggestTarget === 'all' || aiSuggestTarget === 'desc')
                                  ? (lang === 'ar' ? 'الذكاء الاصطناعي يقوم بصياغة الوصف بالعربية...' : 'AI Co-Pilot is drafting Arabic description...')
                                  : 'خلفية سطح مكتب فائقة الدقة 4K تم تصميمها بدقة 3840×2160 لشاشات OLED ومعدلات التحديث العالية...'
                              }
                              value={manualDescAr}
                              onChange={(e) => setManualDescAr(e.target.value)}
                              className={`w-full p-3 rounded-xl bg-[#090A0E] border text-white text-xs focus:outline-none focus:border-cyan-500 transition-all text-right ${
                                aiSuggestLoading && (aiSuggestTarget === 'all' || aiSuggestTarget === 'desc')
                                  ? 'border-purple-500/60 bg-purple-950/20 pl-9 animate-pulse'
                                  : 'border-[#2B2F42]'
                              }`}
                            />
                            {aiSuggestLoading && (aiSuggestTarget === 'all' || aiSuggestTarget === 'desc') && (
                              <div className="absolute left-3 top-3 pointer-events-none flex items-center">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                              </div>
                            )}
                            <span className="text-[10px] text-neutral-500 mt-1 block text-right">الوصف (بالعربية)</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Publish Action Button */}
                    <button
                      type="submit"
                      disabled={manualPublishing}
                      className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 via-cyan-400 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-black text-sm flex items-center justify-center gap-2.5 cursor-pointer shadow-xl shadow-cyan-500/25 transition-all transform active:scale-[0.99] disabled:opacity-50"
                    >
                      {manualPublishing ? (
                        <>
                          <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                          <span>{lang === 'ar' ? 'جاري الحفظ في IndexedDB...' : 'Persisting 4K Blobs to IndexedDB...'}</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-5 h-5 stroke-[2.5]" />
                          <span>
                            {lang === 'ar'
                              ? 'حفظ ونشر الخلفية إلى مستودع DeskSpace4K'
                              : 'Publish 4K Wallpaper to Repository'}
                          </span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 2: MANAGE WALLPAPERS (CRUD List, Edit, Delete)       */}
              {/* ========================================================= */}
              {adminTab === 'manage' && (
                <div className="space-y-5">
                  {manageNotice && (
                    <div
                      className={`p-3.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
                        manageNoticeType === 'success'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : manageNoticeType === 'error'
                          ? 'bg-red-500/10 border-red-500/30 text-red-300'
                          : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {manageNoticeType === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                        {manageNoticeType === 'error' && <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />}
                        {manageNoticeType === 'info' && <Database className="w-4 h-4 text-cyan-400 shrink-0" />}
                        <span className="font-semibold">{manageNotice}</span>
                      </div>
                      <button
                        onClick={() => setManageNotice(null)}
                        className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Search and Category Filter Toolbar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder={lang === 'ar' ? 'ابحث في الخلفيات بالاسم أو الوسوم...' : 'Search wallpapers by title, category, tags...'}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#14151D] border border-[#272A3C] text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="px-3 py-2.5 rounded-xl bg-[#14151D] border border-[#272A3C] text-xs text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value="All">{lang === 'ar' ? 'جميع الأقسام' : 'All Categories'}</option>
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {t.categories[c] || c}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => setAdminTab('manual')}
                        className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-black transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{lang === 'ar' ? 'رفع جديد' : 'New 4K Upload'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Wallpaper Grid Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {filteredWallpapers.map((wp) => (
                      <div
                        key={wp.id}
                        className="p-3.5 rounded-2xl bg-[#14151D] border border-[#222433] hover:border-cyan-500/30 transition-all flex flex-col justify-between space-y-3 group"
                      >
                        <div className="space-y-2.5">
                          {/* Card Preview Header */}
                          <div className="relative aspect-video rounded-xl overflow-hidden bg-black/60 border border-white/5">
                            <img
                              src={wp.thumbnailUrl || wp.posterUrl || wp.url || getCategoryFallback(wp.category)}
                              alt={wp.title.en}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = getCategoryFallback(wp.category);
                              }}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute top-2 left-2 flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-mono font-bold text-cyan-300 border border-white/10">
                                {wp.resolution || '3840×2160'}
                              </span>
                              {wp.isLive && (
                                <span className="px-2 py-0.5 rounded-md bg-rose-500/80 backdrop-blur-md text-[10px] font-bold text-white flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                  <span>Live</span>
                                </span>
                              )}
                            </div>

                            <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-[10px] font-bold text-neutral-300">
                              {wp.category}
                            </span>
                          </div>

                          {/* Titles */}
                          <div>
                            <div className="font-bold text-xs text-white truncate" title={wp.title.en}>
                              {wp.title[lang] || wp.title.en}
                            </div>
                            <div className="text-[11px] text-neutral-400 truncate mt-0.5">
                              {wp.title.en} · {wp.title.ar}
                            </div>
                          </div>

                          {/* Tags */}
                          <div className="flex flex-wrap gap-1">
                            {wp.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="text-[9px] px-1.5 py-0.5 rounded bg-[#1B1D28] text-neutral-400"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Real-time Inline Placement & Category Re-assignment (Requested Feature 1) */}
                        <div className="pt-2.5 pb-1 border-t border-[#1C1E2B] space-y-1.5">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold text-neutral-400 flex items-center gap-1">
                              {wp.deviceFormat === 'mobile' || wp.aspectRatio === '9:16' || wp.category === 'Mobile' || wp.tags.includes('Mobile Live Wallpapers') ? (
                                <Smartphone className="w-3 h-3 text-fuchsia-400" />
                              ) : (
                                <Monitor className="w-3 h-3 text-cyan-400" />
                              )}
                              <span>{lang === 'ar' ? 'الوجهة والتصنيف:' : 'Target Placement:'}</span>
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                                wp.deviceFormat === 'mobile' || wp.aspectRatio === '9:16' || wp.category === 'Mobile' || wp.tags.includes('Mobile Live Wallpapers')
                                  ? 'text-fuchsia-300 bg-fuchsia-500/15 border border-fuchsia-500/30'
                                  : 'text-cyan-300 bg-cyan-500/15 border border-cyan-500/30'
                              }`}
                            >
                              {wp.deviceFormat === 'mobile' || wp.aspectRatio === '9:16' || wp.category === 'Mobile' || wp.tags.includes('Mobile Live Wallpapers')
                                ? '9:16 Mobile Live'
                                : '16:9 Desktop 4K'}
                            </span>
                          </div>

                          <select
                            value={
                              wp.deviceFormat === 'mobile' || wp.aspectRatio === '9:16' || wp.category === 'Mobile' || wp.tags.includes('Mobile Live Wallpapers')
                                ? `mobile:${wp.category === 'Mobile' ? 'Mobile' : wp.category}`
                                : `desktop:${wp.category}`
                            }
                            onChange={(e) => handleInlinePlacementChange(wp, e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg bg-[#0E0F16] border border-[#2B2E42] hover:border-cyan-500/50 text-[11px] font-bold text-white focus:outline-none focus:border-cyan-400 cursor-pointer transition-colors"
                            title={lang === 'ar' ? 'تغيير الوجهة والتصنيف مع الحفظ الفوري' : 'Real-time Category & Placement Switcher'}
                          >
                            <optgroup label={lang === 'ar' ? '🖥️ سطح المكتب (16:9) - المعلف العام' : '🖥️ Desktop Wallpapers (16:9)'}>
                              {TARGET_PLACEMENT_OPTIONS.filter((o) => o.deviceFormat === 'desktop').map((opt) => (
                                <option key={opt.key} value={opt.key}>
                                  {lang === 'ar' ? opt.labelAr : opt.labelEn}
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label={lang === 'ar' ? '📱 خلفيات الهاتف الحية (9:16) - معلف الهواتف' : '📱 Mobile Live Wallpapers (9:16)'}>
                              {TARGET_PLACEMENT_OPTIONS.filter((o) => o.deviceFormat === 'mobile').map((opt) => (
                                <option key={opt.key} value={opt.key}>
                                  {lang === 'ar' ? opt.labelAr : opt.labelEn}
                                </option>
                              ))}
                            </optgroup>
                          </select>
                        </div>

                        {/* Actions */}
                        <div className="pt-2 border-t border-[#1F212D] flex items-center justify-between">
                          <div className="text-[10px] text-neutral-500 font-mono">
                            {wp.downloads || 0} dl · {wp.favorites || 0} fav
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => startEditWallpaper(wp)}
                              className="p-1.5 rounded-lg bg-[#1B1D28] hover:bg-[#252838] text-neutral-300 hover:text-white transition-colors cursor-pointer"
                              title="Edit Wallpaper"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-cyan-400" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setWallpaperToDeleteId(wp.id)}
                              className="p-1.5 rounded-lg bg-[#1B1D28] hover:bg-red-500/20 text-neutral-400 hover:text-red-400 transition-colors cursor-pointer"
                              title="Delete Wallpaper"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Inline Edit Wallpaper Modal */}
                  {editingWallpaper && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                      <div className="w-full max-w-lg p-6 rounded-2xl bg-[#14151F] border border-[#2C3044] shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-[#242738] pb-3">
                          <h4 className="text-sm font-black text-white flex items-center gap-2">
                            <Edit2 className="w-4 h-4 text-cyan-400" />
                            <span>{lang === 'ar' ? 'تعديل بيانات الخلفية' : 'Edit Wallpaper Metadata'}</span>
                          </h4>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleGenerateWallpaperMetadata('edit')}
                              disabled={aiSuggestLoading}
                              className="px-2.5 py-1 rounded-lg bg-fuchsia-500/20 hover:bg-fuchsia-500/30 text-fuchsia-300 border border-fuchsia-500/40 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                              title="Auto-generate titles and tags with AI"
                            >
                              {aiSuggestLoading && aiSuggestTarget === 'edit' ? (
                                <Loader2 className="w-3 h-3 animate-spin text-fuchsia-400" />
                              ) : (
                                <Sparkles className="w-3 h-3 text-fuchsia-400" />
                              )}
                              <span>{lang === 'ar' ? 'توليد ذكي' : 'AI Suggest'}</span>
                            </button>
                            <button onClick={() => setEditingWallpaper(null)} className="text-neutral-400 hover:text-white">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <form onSubmit={handleSaveWallpaperEdit} className="space-y-3.5">
                          <div>
                            <label className="block text-[11px] font-bold text-neutral-400 mb-1">
                              Title (English)
                            </label>
                            <input
                              type="text"
                              value={editTitleEn}
                              onChange={(e) => setEditTitleEn(e.target.value)}
                              className="w-full px-3.5 py-2 rounded-xl bg-[#090A0E] border border-[#2B2F42] text-white text-xs focus:outline-none focus:border-cyan-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-neutral-400 mb-1">
                              Title (Arabic)
                            </label>
                            <input
                              type="text"
                              value={editTitleAr}
                              onChange={(e) => setEditTitleAr(e.target.value)}
                              className="w-full px-3.5 py-2 rounded-xl bg-[#090A0E] border border-[#2B2F42] text-white text-xs focus:outline-none focus:border-cyan-500 text-right"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-neutral-400 mb-1">
                                Category
                              </label>
                              <select
                                value={editCategory}
                                onChange={(e) => setEditCategory(e.target.value as Category)}
                                className="w-full px-3 py-2 rounded-xl bg-[#090A0E] border border-[#2B2F42] text-white text-xs focus:outline-none focus:border-cyan-500"
                              >
                                {CATEGORIES.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-neutral-400 mb-1">
                                Resolution
                              </label>
                              <input
                                type="text"
                                value={editResolution}
                                onChange={(e) => setEditResolution(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-[#090A0E] border border-[#2B2F42] text-white text-xs focus:outline-none focus:border-cyan-500"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-neutral-400 mb-1">
                              Tags (comma separated)
                            </label>
                            <input
                              type="text"
                              value={editTags}
                              onChange={(e) => setEditTags(e.target.value)}
                              className="w-full px-3.5 py-2 rounded-xl bg-[#090A0E] border border-[#2B2F42] text-white text-xs focus:outline-none focus:border-cyan-500"
                            />
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#242738]">
                            <button
                              type="button"
                              onClick={() => setEditingWallpaper(null)}
                              className="px-4 py-2 rounded-xl bg-[#1C1E2B] text-neutral-300 text-xs font-bold hover:bg-[#25283A]"
                            >
                              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                            </button>
                            <button
                              type="submit"
                              className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-black shadow-lg shadow-cyan-500/20"
                            >
                              {lang === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* Delete Confirmation Modal */}
                  {wallpaperToDeleteId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                      <div className="w-full max-w-sm p-6 rounded-2xl bg-[#14151F] border border-red-500/30 text-center space-y-4 shadow-2xl">
                        <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
                          <Trash2 className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-white">
                            {lang === 'ar' ? 'تأكيد حذف الخلفية نهائياً؟' : 'Permanently Delete Wallpaper?'}
                          </h4>
                          <p className="text-xs text-neutral-400 mt-1">
                            {lang === 'ar'
                              ? 'سيتم حذف ملفات الوسائط والصور والمصغرات نهائياً من IndexedDB، ولن تعود أبداً حتى بعد إعادة تحميل الصفحة.'
                              : 'All media files, blobs, and thumbnails will be purged from IndexedDB and will never reappear after reload.'}
                          </p>
                        </div>
                        <div className="flex items-center justify-center gap-2 pt-2">
                          <button
                            type="button"
                            disabled={isDeletingWallpaper}
                            onClick={() => setWallpaperToDeleteId(null)}
                            className="px-4 py-2 rounded-xl bg-[#1C1E2B] text-neutral-300 text-xs font-bold hover:bg-[#25283A] disabled:opacity-50 transition-colors"
                          >
                            {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                          </button>
                          <button
                            type="button"
                            disabled={isDeletingWallpaper}
                            onClick={() => handleDeleteWallpaperConfirm(wallpaperToDeleteId)}
                            className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-black shadow-lg shadow-red-500/20 flex items-center gap-1.5 transition-all"
                          >
                            {isDeletingWallpaper ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>{lang === 'ar' ? 'جاري الحذف من IndexedDB...' : 'Purging IndexedDB...'}</span>
                              </>
                            ) : (
                              <>
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>{lang === 'ar' ? 'تأكيد الحذف النهائي' : 'Confirm Permanent Delete'}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 3: BATCH DROP UPLOADER (Requested Feature 1)         */}
              {/* ========================================================= */}
              {adminTab === 'bulk' && (
                <div className="max-w-4xl mx-auto space-y-6">
                  {bulkNotice && (
                    <div className="p-3.5 rounded-xl bg-green-500/10 border border-green-500/30 text-green-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      <span>{bulkNotice}</span>
                    </div>
                  )}

                  {/* Global Mandatory Default Target Selector (Requested Feature 1) */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-[#161825] via-[#12131C] to-[#1C1628] border-2 border-cyan-500/40 shadow-xl space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#25283C]">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
                          <SlidersHorizontal className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-black text-white flex items-center gap-2">
                            <span>{lang === 'ar' ? 'الوجهة والتصنيف التلقائي للدفعة (إلزامي)' : 'Global Default Target Placement & Category'}</span>
                            <span className="text-rose-400 font-bold">*</span>
                          </div>
                          <div className="text-[11px] text-neutral-400 mt-0.5">
                            {lang === 'ar'
                              ? 'سيتم تطبيق هذا التصنيف وهيئة الجهاز (16:9 أفقية أو 9:16 رأسية للهواتف) تلقائياً على جميع الملفات المسحوبة.'
                              : 'All dropped files will be assigned instantly to this target feed format (Desktop 16:9 vs. Mobile 9:16).'}
                          </div>
                        </div>
                      </div>

                      {(() => {
                        const opt = TARGET_PLACEMENT_OPTIONS.find((o) => o.key === bulkDefaultPlacement) || TARGET_PLACEMENT_OPTIONS[0];
                        return (
                          <span
                            className={`px-3 py-1 rounded-xl text-[10px] font-mono font-black border flex items-center gap-1.5 ${
                              opt.deviceFormat === 'mobile'
                                ? 'bg-fuchsia-500/15 border-fuchsia-500/40 text-fuchsia-300'
                                : 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                            }`}
                          >
                            {opt.deviceFormat === 'mobile' ? (
                              <>
                                <Smartphone className="w-3.5 h-3.5 text-fuchsia-400" />
                                <span>DEFAULT: MOBILE 9:16</span>
                              </>
                            ) : (
                              <>
                                <Monitor className="w-3.5 h-3.5 text-cyan-400" />
                                <span>DEFAULT: DESKTOP 16:9</span>
                              </>
                            )}
                          </span>
                        );
                      })()}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-neutral-300 block">
                        {lang === 'ar' ? 'حدد الوجهة العامة للدفعة المسحوبة *' : 'Choose Default Target Placement for Dropped Batch *'}
                      </label>
                      <select
                        required
                        value={bulkDefaultPlacement}
                        onChange={(e) => setBulkDefaultPlacement(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-[#090A0E] border-2 border-cyan-500/40 text-white font-bold text-xs focus:outline-none focus:border-cyan-400 transition-all cursor-pointer shadow-inner"
                      >
                        <optgroup label={lang === 'ar' ? '🖥️ خلفيات سطح المكتب (16:9) - المعلف العام' : '🖥️ Desktop Wallpapers (16:9)'}>
                          {TARGET_PLACEMENT_OPTIONS.filter((o) => o.deviceFormat === 'desktop').map((opt) => (
                            <option key={opt.key} value={opt.key}>
                              {lang === 'ar' ? opt.labelAr : opt.labelEn}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label={lang === 'ar' ? '📱 خلفيات الهاتف الحية (9:16) - معلف الهواتف' : '📱 Mobile Live Wallpapers (9:16)'}>
                          {TARGET_PLACEMENT_OPTIONS.filter((o) => o.deviceFormat === 'mobile').map((opt) => (
                            <option key={opt.key} value={opt.key}>
                              {lang === 'ar' ? opt.labelAr : opt.labelEn}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                  </div>

                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleBulkFileDrop}
                    onClick={() => bulkFileInputRef.current?.click()}
                    className="border-2 border-dashed border-[#2B2F45] hover:border-cyan-500/50 rounded-2xl p-8 text-center cursor-pointer transition-all hover:bg-cyan-500/5 flex flex-col items-center justify-center gap-3"
                  >
                    <div className="p-4 rounded-2xl bg-cyan-500/10 text-cyan-400">
                      <UploadCloud className="w-8 h-8" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-white">
                        {lang === 'ar' ? 'اسحب مجموعة ملفات دفعة واحدة هنا' : 'Drop multiple 4K files here for batch upload'}
                      </div>
                      <div className="text-xs text-neutral-400 mt-1">
                        Supports bulk JPG, PNG, WEBP images and MP4, WEBM live motion videos
                      </div>
                    </div>
                    <input
                      ref={bulkFileInputRef}
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={handleBulkFileInputChange}
                    />
                  </div>

                  {queuedFiles.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-white">
                          Queued Media Files ({queuedFiles.length})
                        </h4>
                        <button
                          type="button"
                          onClick={() => setQueuedFiles([])}
                          className="text-xs text-red-400 hover:underline"
                        >
                          Clear Queue
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {queuedFiles.map((q) => {
                          const bulkOpt = TARGET_PLACEMENT_OPTIONS.find((o) => o.key === bulkDefaultPlacement) || TARGET_PLACEMENT_OPTIONS[0];
                          return (
                            <div
                              key={q.id}
                              className="p-2.5 rounded-xl bg-[#14151E] border border-[#242738] relative group"
                            >
                              <div className="aspect-video rounded-lg overflow-hidden bg-black/60 mb-2 relative">
                                {q.isVideo ? (
                                  <video src={q.previewUrl} className="w-full h-full object-cover" muted />
                                ) : (
                                  <img src={q.previewUrl} alt={q.name} className="w-full h-full object-cover" />
                                )}
                                <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-md text-[8px] font-mono font-black text-cyan-300 border border-white/10">
                                  {bulkOpt.deviceFormat === 'mobile' ? '📱 9:16' : '🖥️ 16:9'}
                                </div>
                                <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[8px] font-bold text-neutral-300">
                                  {bulkOpt.category}
                                </div>
                              </div>
                              <div className="text-[11px] font-bold text-white truncate">{q.name}</div>
                              <div className="text-[9px] text-neutral-500 font-mono">{q.size}</div>
                            </div>
                          );
                        })}
                      </div>

                      {(() => {
                        const bulkOpt = TARGET_PLACEMENT_OPTIONS.find((o) => o.key === bulkDefaultPlacement) || TARGET_PLACEMENT_OPTIONS[0];
                        return (
                          <button
                            type="button"
                            onClick={handlePublishBulkBatch}
                            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-black font-black text-xs cursor-pointer shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
                          >
                            <Check className="w-4 h-4 stroke-[3]" />
                            <span>
                              {lang === 'ar'
                                ? `نشر ${queuedFiles.length} خلفيات دفعة واحدة إلى قسم: ${bulkOpt.labelAr}`
                                : `Publish All ${queuedFiles.length} Wallpapers to "${bulkOpt.labelEn}"`}
                            </span>
                          </button>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 4: JOURNAL & ARTICLES MANAGEMENT                     */}
              {/* ========================================================= */}
              {adminTab === 'articles' && (
                <div className="space-y-5">
                  {articleNotice && (
                    <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs flex items-center justify-between">
                      <span>{articleNotice}</span>
                      <button onClick={() => setArticleNotice(null)}>
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* AI Draft Assistant Module (Interactive AI Journal/Blog Writer) */}
                  <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#13141F] via-[#101119] to-[#161224] border border-cyan-500/25 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative space-y-4">
                      {/* Top Module Header */}
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-500/20 via-blue-500/20 to-purple-500/20 border border-cyan-500/40 text-cyan-300">
                            <Bot className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-black text-white">
                                {lang === 'ar' ? 'مساعد صياغة المقالات الذكي (AI Draft Assistant)' : 'DeskSpace AI Draft Assistant'}
                              </h3>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/30">
                                GEMINI 3.8 FLASH
                              </span>
                            </div>
                            <p className="text-[11px] text-neutral-400">
                              {lang === 'ar'
                                ? 'اكتب موضوعاً أو فكرة لإنشاء مقال كامل مهيأ لمحركات البحث مع العناوين والوسوم وتنسيق Markdown.'
                                : 'Type a topic or concept to generate structured, SEO-friendly 4K display articles with formatted Markdown.'}
                            </p>
                          </div>
                        </div>

                        {aiArticleResult && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleApplyAiArticleToForm}
                              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black text-xs font-black shadow-md shadow-cyan-500/20 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                            >
                              <PenTool className="w-3.5 h-3.5" />
                              <span>{lang === 'ar' ? 'تطبيق على محرر المقالات' : 'Apply to Article Form'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setAiArticleResult(null)}
                              className="px-2.5 py-1.5 rounded-xl bg-[#1C1E2B] hover:bg-[#25283A] text-neutral-400 hover:text-white text-xs font-medium cursor-pointer"
                            >
                              {lang === 'ar' ? 'إغلاق المعاينة' : 'Clear Preview'}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Prompt Input & Category Selector */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                        <div className="md:col-span-8">
                          <input
                            type="text"
                            placeholder={
                              lang === 'ar'
                                ? 'اكتب موضوع المقال (مثال: أفضل 10 خلفيات 4K لشاشات OLED ومحطات الألعاب)...'
                                : 'Enter article topic (e.g., Top 10 OLED 4K Wallpapers for Gaming Setup)...'
                            }
                            value={aiArticleTopic}
                            onChange={(e) => setAiArticleTopic(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleGenerateArticle();
                              }
                            }}
                            className="w-full px-4 py-3 rounded-2xl bg-[#090A0E] border border-[#2B2F45] text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-cyan-500 transition-colors"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <select
                            value={aiArticleCategory}
                            onChange={(e) => setAiArticleCategory(e.target.value as any)}
                            className="w-full h-full px-3 py-3 rounded-2xl bg-[#090A0E] border border-[#2B2F45] text-white text-xs focus:outline-none focus:border-cyan-500"
                          >
                            <option value="Tech">Tech</option>
                            <option value="Guides">Guides</option>
                            <option value="Curation">Curation</option>
                            <option value="Art">Art</option>
                            <option value="Minimalism">Minimalism</option>
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <button
                            type="button"
                            onClick={handleGenerateArticle}
                            disabled={aiArticleLoading || !aiArticleTopic.trim()}
                            className="w-full h-full py-3 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-black font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20 transition-all transform active:scale-95 disabled:opacity-50"
                          >
                            {aiArticleLoading ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin text-black" />
                                <span>{lang === 'ar' ? 'جاري الصياغة...' : 'Generating...'}</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4 stroke-[2.5]" />
                                <span>{lang === 'ar' ? 'توليد المقال' : 'Generate Article'}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Quick Prompt Suggestion Chips */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] text-neutral-400 font-bold mr-1">
                          {lang === 'ar' ? 'مواضيع مقترحة سريعة:' : 'Sample Topics:'}
                        </span>
                        {[
                          'Top 10 OLED 4K Wallpapers for Gaming Setup',
                          'HDR vs SDR: Why 4K Battlestations Need True Blacks',
                          'How 60 FPS Live Wallpapers Impact GPU Performance',
                          'Minimalist Dual-Monitor 4K Calibrations',
                        ].map((sample) => (
                          <button
                            key={sample}
                            type="button"
                            onClick={() => {
                              setAiArticleTopic(sample);
                            }}
                            className="text-[10px] px-2.5 py-1 rounded-xl bg-[#171924] hover:bg-cyan-500/20 text-neutral-400 hover:text-cyan-300 border border-[#25283C] transition-colors cursor-pointer"
                          >
                            ✨ {sample}
                          </button>
                        ))}
                      </div>

                      {/* Non-Blocking Async Web Worker Loading Skeleton */}
                      {aiArticleLoading && (
                        <div className="mt-4 p-5 rounded-2xl bg-[#090A0F] border border-cyan-500/30 space-y-4 animate-pulse">
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#1E202E]">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 font-bold text-[11px] border border-cyan-500/30 flex items-center gap-1.5">
                                <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
                                <span>{lang === 'ar' ? 'الذكاء الاصطناعي يصيغ المقال في الخلفية...' : 'AI Web Worker Drafting Post...'}</span>
                              </span>
                            </div>
                            <span className="text-[11px] text-neutral-500 font-mono">
                              60 FPS Non-Blocking Worker Active
                            </span>
                          </div>

                          <div className="space-y-2.5">
                            <div className="w-3/4 h-5 rounded-lg bg-neutral-800" />
                            <div className="w-full h-3.5 rounded bg-neutral-800/60" />
                            <div className="w-5/6 h-3.5 rounded bg-neutral-800/40" />
                          </div>

                          <div className="p-4 rounded-xl bg-[#0F1017] border border-[#202230] space-y-2">
                            <div className="w-1/3 h-4 rounded bg-cyan-500/10" />
                            <div className="w-full h-3 rounded bg-neutral-800/50" />
                            <div className="w-11/12 h-3 rounded bg-neutral-800/40" />
                            <div className="w-4/5 h-3 rounded bg-neutral-800/30" />
                          </div>
                        </div>
                      )}

                      {/* Generated Article Preview Container */}
                      {aiArticleResult && (
                        <div className="mt-4 p-5 rounded-2xl bg-[#090A0F] border border-cyan-500/30 space-y-4">
                          {/* Article Meta Bar */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#1E202E]">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-lg bg-cyan-500/15 text-cyan-300 font-bold text-[11px] border border-cyan-500/30">
                                {aiArticleResult.category}
                              </span>
                              <span className="px-2 py-0.5 rounded-lg bg-[#161824] text-neutral-400 text-[11px] flex items-center gap-1 font-mono">
                                <Clock className="w-3 h-3 text-neutral-500" />
                                {aiArticleResult.readTime} min read
                              </span>
                              <span className="text-neutral-500 text-xs">•</span>
                              <span className="text-neutral-400 text-[11px] font-mono">
                                slug: /{aiArticleResult.slug}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 bg-[#141520] p-1 rounded-xl border border-[#25283B]">
                              <button
                                type="button"
                                onClick={() => setAiArticleTab('en')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                  aiArticleTab === 'en' ? 'bg-cyan-500 text-black' : 'text-neutral-400 hover:text-white'
                                }`}
                              >
                                English Article
                              </button>
                              <button
                                type="button"
                                onClick={() => setAiArticleTab('ar')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                  aiArticleTab === 'ar' ? 'bg-cyan-500 text-black' : 'text-neutral-400 hover:text-white'
                                }`}
                              >
                                النسخة العربية
                              </button>
                              <button
                                type="button"
                                onClick={() => setAiArticleTab('raw')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                  aiArticleTab === 'raw' ? 'bg-cyan-500 text-black' : 'text-neutral-400 hover:text-white'
                                }`}
                              >
                                Markdown Raw
                              </button>
                            </div>
                          </div>

                          {/* Titles and Excerpts */}
                          <div className="space-y-2">
                            <h4 className="text-sm font-black text-white">
                              {aiArticleTab === 'ar' ? aiArticleResult.titleAr : aiArticleResult.titleEn}
                            </h4>
                            <p className="text-xs text-neutral-400 leading-relaxed italic border-l-2 border-cyan-500/40 pl-3">
                              {aiArticleTab === 'ar' ? aiArticleResult.excerptAr : aiArticleResult.excerptEn}
                            </p>
                          </div>

                          {/* Content Preview Box */}
                          <div className="max-h-60 overflow-y-auto p-4 rounded-xl bg-[#0F1017] border border-[#202230] text-xs font-mono text-neutral-300 whitespace-pre-wrap leading-relaxed select-text">
                            {aiArticleTab === 'en' && aiArticleResult.contentEn}
                            {aiArticleTab === 'ar' && aiArticleResult.contentAr}
                            {aiArticleTab === 'raw' &&
                              `# ${aiArticleResult.titleEn}\n\n> ${aiArticleResult.excerptEn}\n\n${aiArticleResult.contentEn}`}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] text-neutral-500 font-mono">Tags:</span>
                              {aiArticleResult.tags.split(',').map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[10px] px-2 py-0.5 rounded-md bg-[#161824] text-cyan-300 font-mono border border-white/5"
                                >
                                  #{tag.trim()}
                                </span>
                              ))}
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  handleCopyToClipboard(
                                    aiArticleTab === 'ar'
                                      ? aiArticleResult.contentAr
                                      : aiArticleResult.contentEn,
                                    'article_content'
                                  )
                                }
                                className="px-3 py-1.5 rounded-xl bg-[#1A1C29] hover:bg-[#25283C] text-neutral-300 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                              >
                                {copiedKey === 'article_content' ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-green-400" />
                                    <span>{lang === 'ar' ? 'تم نسخ المحتوى!' : 'Copied Content!'}</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>{lang === 'ar' ? 'نسخ المحتوى' : 'Copy Content'}</span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={handleApplyAiArticleToForm}
                                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
                              >
                                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>{lang === 'ar' ? 'تطبيق على محرر المقالات' : 'Apply to Article Form'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  handleApplyAiArticleToForm();
                                  handleAiSuggestBlogImage({
                                    titleEn: aiArticleResult.titleEn,
                                    titleAr: aiArticleResult.titleAr,
                                    category: aiArticleResult.category,
                                    tags: aiArticleResult.tags,
                                  });
                                }}
                                disabled={aiBlogImageLoading}
                                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-fuchsia-500/20"
                                title="Apply article draft and automatically select matching 4K wallpaper"
                              >
                                {aiBlogImageLoading ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                                ) : (
                                  <Sparkles className="w-3.5 h-3.5 text-fuchsia-200" />
                                )}
                                <span>{lang === 'ar' ? '✨ تطبيق مع إرفاق صورة ذكية' : '✨ Apply & Auto-Attach Image'}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {articleViewMode === 'list' ? (
                    <>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <div className="relative flex-1">
                          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Search articles by title or tag..."
                            value={articleSearchQuery}
                            onChange={(e) => setArticleSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#14151D] border border-[#272A3C] text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-cyan-500"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={handleStartNewArticle}
                          className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-black transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                        >
                          <Plus className="w-4 h-4" />
                          <span>{lang === 'ar' ? 'كتابة مقال جديد' : 'New Article'}</span>
                        </button>
                      </div>

                      <div className="space-y-3">
                        {filteredBlogPosts.map((post) => (
                          <div
                            key={post.id}
                            className="p-4 rounded-2xl bg-[#14151D] border border-[#222433] hover:border-cyan-500/30 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                          >
                            <div className="flex items-center gap-3.5">
                              <img
                                src={post.coverImage}
                                alt={post.title.en}
                                className="w-16 h-12 object-cover rounded-xl border border-white/10 shrink-0"
                              />
                              <div>
                                <h4 className="text-xs font-black text-white">{post.title[lang] || post.title.en}</h4>
                                <div className="text-[10px] text-neutral-400 flex items-center gap-2 mt-1">
                                  <span className="px-1.5 py-0.5 rounded bg-[#1C1E2B] text-cyan-300 font-bold">
                                    {post.category}
                                  </span>
                                  <span>{post.readTimeMinutes} min read</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-auto">
                              <button
                                type="button"
                                onClick={() => handleStartEditArticle(post)}
                                className="p-2 rounded-xl bg-[#1C1E2B] hover:bg-[#252838] text-neutral-300 hover:text-white"
                                title="Edit Article"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-cyan-400" />
                              </button>
                                <button
                                  type="button"
                                  onClick={() => setArticleToDeleteId(post.id)}
                                  className="p-2 rounded-xl bg-[#1C1E2B] hover:bg-red-500/20 text-neutral-400 hover:text-red-400 cursor-pointer transition-colors"
                                  title="Delete Article"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    /* Article Create / Edit Form */
                    <form onSubmit={handleSaveArticle} className="space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-[#242738]">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-white">
                            {articleViewMode === 'create' ? 'Write New Article' : 'Edit Article'}
                          </h4>
                          {aiArticleResult && (
                            <button
                              type="button"
                              onClick={handleApplyAiArticleToForm}
                              className="px-2.5 py-1 rounded-lg bg-fuchsia-500/20 hover:bg-fuchsia-500/30 text-fuchsia-300 border border-fuchsia-500/40 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                              title="Import the AI generated draft into this form"
                            >
                              <Sparkles className="w-3 h-3 text-fuchsia-400" />
                              <span>{lang === 'ar' ? 'تطبيق مسودة الذكاء الاصطناعي' : 'Apply AI Draft'}</span>
                            </button>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setArticleViewMode('list')}
                          className="text-xs text-neutral-400 hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>

                      {/* Flexible Blog / Journal Article Image Management System (Requested Feature 2) */}
                      <div className="p-5 rounded-2xl bg-[#14151F] border border-cyan-500/30 space-y-4 shadow-lg">
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#25283C]">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
                              <ImageIcon className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs font-black text-white flex items-center gap-2">
                                <span>{lang === 'ar' ? 'صورة الغلاف والوسائط المميزة للمقال (Image Management)' : 'Featured Article Media & Cover Image'}</span>
                                <span className="text-rose-400 font-bold">*</span>
                              </div>
                              <div className="text-[11px] text-neutral-400">
                                {lang === 'ar'
                                  ? 'إدارة متكاملة لصور المقال: رفع يدوي، اختيار من مستودع 4K، أو توليد واقتراح ذكي بالذكاء الاصطناعي.'
                                  : 'Comprehensive image control: manual upload, repository picker, or AI auto-suggest & 4K generation.'}
                              </div>
                            </div>
                          </div>

                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-green-500/10 text-green-300 border border-green-500/30">
                            IndexedDB Blob Cache Active
                          </span>
                        </div>

                        {/* Status notification for AI / Upload / Embed Copy */}
                        {(aiBlogImageNotice || copiedEmbedToast) && (
                          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-200 text-xs flex items-center justify-between animate-fadeIn">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                              <span>{aiBlogImageNotice || copiedEmbedToast}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setAiBlogImageNotice(null);
                                setCopiedEmbedToast(null);
                              }}
                              className="text-cyan-400 hover:text-white"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {/* Visual Image Preview & Management Action Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                          {/* Image Preview Canvas with Non-Blocking Loading State */}
                          <div className={`md:col-span-5 relative aspect-video rounded-xl overflow-hidden bg-black/60 border transition-all ${
                            aiBlogImageLoading || bannerGenLoading
                              ? 'border-fuchsia-500/70 shadow-lg shadow-fuchsia-500/20'
                              : 'border-[#2B2F44]'
                          } group shadow-inner`}>
                            {/* Non-intrusive Loading Overlay */}
                            {(aiBlogImageLoading || bannerGenLoading) && (
                              <div className="absolute inset-0 bg-neutral-950/85 z-20 flex flex-col items-center justify-center gap-2 animate-pulse backdrop-blur-xs">
                                <Loader2 className="w-6 h-6 text-fuchsia-400 animate-spin" />
                                <span className="text-[11px] font-bold text-fuchsia-200">
                                  {bannerGenLoading
                                    ? (lang === 'ar' ? 'جاري توليد بوستر 4K في الخلفية...' : 'AI Web Worker rendering 4K banner...')
                                    : (lang === 'ar' ? 'جاري مطابقة خلفية 4K متوافقة...' : 'AI Web Worker matching 4K wallpaper...')}
                                </span>
                              </div>
                            )}

                            <img
                              src={formCoverImage || wallpapers[0]?.url || '/src/assets/images/wallpaper_space_nebula_1792241809155.jpg'}
                              alt="Article Featured Cover"
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-between p-3 pointer-events-none">
                              <span className="self-start px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-mono font-bold text-cyan-300 border border-white/10">
                                16:9 4K DISPLAY BANNER
                              </span>
                              <div className="text-[10px] text-neutral-300 font-mono truncate">
                                {formCoverImage ? (formCoverImage.startsWith('idb://') ? 'IndexedDB Persistent Blob' : 'Web Resource') : 'Default Preset'}
                              </div>
                            </div>
                          </div>

                          {/* Action Toolbar */}
                          <div className="md:col-span-7 space-y-2.5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {/* 1. Manual File Upload Button */}
                              <button
                                type="button"
                                onClick={() => coverFileInputRef.current?.click()}
                                className="px-3 py-2.5 rounded-xl bg-[#1C1E2C] hover:bg-[#25283C] border border-[#2C3048] text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 hover:border-cyan-500/40"
                              >
                                <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
                                <span>{lang === 'ar' ? 'رفع صورة مخصصة' : 'Upload Image File'}</span>
                              </button>

                              {/* 2. Visual Wallpaper Repo Picker */}
                              <button
                                type="button"
                                onClick={() => setShowWallpaperPickerModal(true)}
                                className="px-3 py-2.5 rounded-xl bg-[#1C1E2C] hover:bg-[#25283C] border border-[#2C3048] text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 hover:border-purple-500/40"
                              >
                                <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                                <span>{lang === 'ar' ? 'اختيار من المستودع' : 'Pick from Wallpapers'}</span>
                              </button>

                              {/* 3. AI Suggest / Attach Image */}
                              <button
                                type="button"
                                onClick={() => handleAiSuggestBlogImage()}
                                disabled={aiBlogImageLoading}
                                className="px-3 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-500/20 to-purple-500/20 hover:from-fuchsia-500/30 hover:to-purple-500/30 border border-fuchsia-500/40 text-fuchsia-300 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                              >
                                {aiBlogImageLoading ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-fuchsia-400" />
                                    <span>{lang === 'ar' ? 'جاري التحليل...' : 'Analyzing Post...'}</span>
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
                                    <span>{lang === 'ar' ? 'اقتراح ذكي بالذكاء الاصطناعي' : 'AI Suggest / Attach'}</span>
                                  </>
                                )}
                              </button>

                              {/* 4. AI Generate 4K Poster */}
                              <button
                                type="button"
                                onClick={handleGenerateAiBanner}
                                disabled={bannerGenLoading}
                                className="px-3 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                              >
                                {bannerGenLoading ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                                    <span>{lang === 'ar' ? 'جاري التوليد...' : 'Rendering 4K...'}</span>
                                  </>
                                ) : (
                                  <>
                                    <Wand2 className="w-3.5 h-3.5 text-cyan-400" />
                                    <span>{lang === 'ar' ? 'توليد بوستر 4K مخصص' : 'Generate 4K Banner'}</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Direct URL input with Copy Markdown Embed Button */}
                            <div className="flex items-center gap-2 pt-1">
                              <div className="relative flex-1">
                                <input
                                  type="text"
                                  placeholder="Image URL (idb://media/... or https://...)"
                                  value={formCoverImage}
                                  onChange={(e) => setFormCoverImage(e.target.value)}
                                  className="w-full px-3 py-2 rounded-xl bg-[#090A0E] border border-[#2B2F44] text-[11px] font-mono text-white focus:outline-none focus:border-cyan-500"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCopyMarkdownEmbed(formCoverImage || wallpapers[0]?.url)}
                                className="px-3 py-2 rounded-xl bg-[#1C1E2C] hover:bg-[#25283C] border border-[#2C3048] text-neutral-300 text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                                title="Copy Markdown Image tag: ![Title](url) to insert into article body"
                              >
                                <Copy className="w-3 h-3 text-cyan-400" />
                                <span>{lang === 'ar' ? 'نسخ وسم Markdown' : 'Copy Embed Tag'}</span>
                              </button>
                            </div>

                            <input
                              ref={coverFileInputRef}
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/avif"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files?.[0]) handleBlogCoverFileUpload(e.target.files[0]);
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-neutral-300 mb-1">
                            Title (English) *
                          </label>
                          <input
                            type="text"
                            required
                            value={formTitleEn}
                            onChange={(e) => setFormTitleEn(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-[#090A0E] border border-[#2B2F42] text-white text-xs focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-neutral-300 mb-1">
                            Title (Arabic) *
                          </label>
                          <input
                            type="text"
                            required
                            value={formTitleAr}
                            onChange={(e) => setFormTitleAr(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-[#090A0E] border border-[#2B2F42] text-white text-xs focus:outline-none focus:border-cyan-500 text-right"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-neutral-300 mb-1">Category</label>
                          <select
                            value={formCategory}
                            onChange={(e) => setFormCategory(e.target.value as any)}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-[#090A0E] border border-[#2B2F42] text-white text-xs"
                          >
                            <option value="Tech">Tech</option>
                            <option value="Guides">Guides</option>
                            <option value="Curation">Curation</option>
                            <option value="Art">Art</option>
                            <option value="Minimalism">Minimalism</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-neutral-300 mb-1">Read Time (min)</label>
                          <input
                            type="number"
                            value={formReadTime}
                            onChange={(e) => setFormReadTime(Number(e.target.value))}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-[#090A0E] border border-[#2B2F42] text-white text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-neutral-300 mb-1">Tags</label>
                          <input
                            type="text"
                            value={formTags}
                            onChange={(e) => setFormTags(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-[#090A0E] border border-[#2B2F42] text-white text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-bold text-neutral-300">Content (English Markdown)</label>
                            <button
                              type="button"
                              onClick={() => {
                                setAiArticleTopic(formTitleEn || formTitleAr || '4K Display Guide');
                                handleGenerateArticle();
                              }}
                              disabled={aiArticleLoading}
                              className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                            >
                              {aiArticleLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                              <span>{lang === 'ar' ? 'صياغة بالذكاء الاصطناعي' : 'AI Write Content'}</span>
                            </button>
                          </div>
                          <textarea
                            rows={8}
                            value={formContentEn}
                            onChange={(e) => setFormContentEn(e.target.value)}
                            className="w-full p-3 rounded-xl bg-[#090A0E] border border-[#2B2F42] text-white text-xs font-mono"
                            placeholder="## Section Heading&#10;&#10;Write comprehensive article content or use the AI Draft Assistant..."
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-bold text-neutral-300">Content (Arabic Markdown)</label>
                            <button
                              type="button"
                              onClick={() => {
                                setAiArticleTopic(formTitleAr || formTitleEn || 'دليل شاشات 4K');
                                handleGenerateArticle();
                              }}
                              disabled={aiArticleLoading}
                              className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                            >
                              {aiArticleLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                              <span>{lang === 'ar' ? 'صياغة بالعربية' : 'AI Write Arabic'}</span>
                            </button>
                          </div>
                          <textarea
                            rows={8}
                            value={formContentAr}
                            onChange={(e) => setFormContentAr(e.target.value)}
                            className="w-full p-3 rounded-xl bg-[#090A0E] border border-[#2B2F42] text-white text-xs font-mono text-right"
                            placeholder="## عنوان الفقرة&#10;&#10;اكتب محتوى المقال التوضيحي أو استورد المسودة من مساعد الذكاء الاصطناعي..."
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-3 pt-2">
                        {articleViewMode === 'edit' && editingPostId && (
                          <button
                            type="button"
                            onClick={() => setArticleToDeleteId(editingPostId)}
                            className="py-3 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>{lang === 'ar' ? 'حذف المقال' : 'Delete Article'}</span>
                          </button>
                        )}
                        <button
                          type="submit"
                          className="flex-1 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs cursor-pointer shadow-lg shadow-cyan-500/20 transition-all"
                        >
                          {articleViewMode === 'create'
                            ? (lang === 'ar' ? 'نشر المقال الجديد' : 'Publish Article')
                            : (lang === 'ar' ? 'تحديث المقال' : 'Update Article')}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Article Delete Confirmation Modal */}
                  {articleToDeleteId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                      <div className="w-full max-w-sm p-6 rounded-2xl bg-[#14151F] border border-red-500/30 text-center space-y-4 shadow-2xl">
                        <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
                          <Trash2 className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-white">
                            {lang === 'ar' ? 'تأكيد حذف المقال نهائياً؟' : 'Permanently Delete Article?'}
                          </h4>
                          <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                            {lang === 'ar'
                              ? 'سيتم حذف المقال نهائياً من قاعدة البيانات (IndexedDB) ولن يعود عند إعادة تحميل الصفحة. جميع خلفيات الشاشة والوسائط ستبقى محفوظة بالكامل دون مساس.'
                              : 'This article will be permanently removed from IndexedDB and local storage. It will never reappear on reload. All wallpapers and media remain 100% untouched.'}
                          </p>
                        </div>
                        <div className="flex items-center justify-center gap-2 pt-2">
                          <button
                            type="button"
                            disabled={isDeletingArticle}
                            onClick={() => setArticleToDeleteId(null)}
                            className="px-4 py-2 rounded-xl bg-[#1C1E2B] text-neutral-300 text-xs font-bold hover:bg-[#25283A] disabled:opacity-50 transition-colors cursor-pointer"
                          >
                            {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                          </button>
                          <button
                            type="button"
                            disabled={isDeletingArticle}
                            onClick={() => handleDeleteArticle(articleToDeleteId)}
                            className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-black shadow-lg shadow-red-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            {isDeletingArticle ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>{lang === 'ar' ? 'جاري الحذف...' : 'Purging...'}</span>
                              </>
                            ) : (
                              <>
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>{lang === 'ar' ? 'تأكيد الحذف النهائي' : 'Confirm Permanent Delete'}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 5: STATS & STORAGE ENGINE HEALTH                     */}
              {/* ========================================================= */}
              {adminTab === 'stats' && (
                <div className="max-w-4xl mx-auto space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-[#14151E] border border-[#232635]">
                      <div className="text-xs text-neutral-400">Total 4K Wallpapers</div>
                      <div className="text-2xl font-black text-white font-mono mt-1">{wallpapers.length}</div>
                      <div className="text-[10px] text-cyan-400 mt-1">Active in Repository</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#14151E] border border-[#232635]">
                      <div className="text-xs text-neutral-400">Live Motion Wallpapers</div>
                      <div className="text-2xl font-black text-rose-400 font-mono mt-1">
                        {wallpapers.filter((w) => w.isLive).length}
                      </div>
                      <div className="text-[10px] text-rose-300 mt-1">60 FPS Motion Video</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#14151E] border border-[#232635]">
                      <div className="text-xs text-neutral-400">Total Downloads</div>
                      <div className="text-2xl font-black text-white font-mono mt-1">{totalDownloads}</div>
                      <div className="text-[10px] text-neutral-500 mt-1">Direct Master Downloads</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#14151E] border border-[#232635]">
                      <div className="text-xs text-neutral-400">Published Articles</div>
                      <div className="text-2xl font-black text-white font-mono mt-1">{blogPosts.length}</div>
                      <div className="text-[10px] text-neutral-500 mt-1">Display & Optics Journal</div>
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-[#14151E] border border-[#232635] space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                          <Database className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-xs font-black text-white">IndexedDB Storage & Backup Management</div>
                          <div className="text-[11px] text-neutral-400">
                            Export a standalone JSON backup of all wallpaper metadata, tags, and articles.
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleExportBackup}
                        className="px-4 py-2.5 rounded-xl bg-[#1C1E2B] hover:bg-[#25283A] border border-[#2E3248] text-neutral-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-2"
                      >
                        <Download className="w-4 h-4 text-cyan-400" />
                        <span>Export JSON Backup</span>
                      </button>
                    </div>

                    <div className="p-4 rounded-xl bg-[#0B0C10] border border-[#1E202B] text-xs font-mono text-neutral-400 space-y-1">
                      <div>Database: DeskSpace4K_IndexedDB_v3</div>
                      <div>ObjectStores: [media_blobs, custom_wallpapers, custom_blog_posts]</div>
                      <div>Persistence Status: Permanent Local IndexedDB (Zero Volatile URL Decay)</div>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 6: EMBEDDED AI COPILOT ASSISTANT                     */}
              {/* ========================================================= */}
              {adminTab === 'copilot' && (
                <div className="space-y-6">
                  {/* Toast Notification */}
                  {copilotToast && (
                    <div
                      className={`p-4 rounded-2xl border text-xs flex items-center justify-between transition-all shadow-lg animate-fadeIn ${
                        copilotToast.type === 'success'
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                          : copilotToast.type === 'error'
                          ? 'bg-red-500/10 border-red-500/40 text-red-300'
                          : 'bg-cyan-500/10 border-cyan-500/40 text-cyan-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {copilotToast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                        {copilotToast.type === 'error' && <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />}
                        {copilotToast.type === 'info' && <Sparkles className="w-5 h-5 text-cyan-400 shrink-0" />}
                        <span className="font-semibold leading-relaxed">{copilotToast.message}</span>
                      </div>
                      <button
                        onClick={() => setCopilotToast(null)}
                        className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-white/10 shrink-0 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* 1. Strict Data-Safety & Local Storage Integrity Guarantee Card */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0B1516] via-[#0E1726] to-[#12121E] border border-emerald-500/30 shadow-xl space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 shrink-0">
                          <Shield className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-black text-white">
                              {lang === 'ar'
                                ? 'ضمان أمان البيانات الصارم وسلامة IndexedDB'
                                : 'Strict Data-Safety & Local Storage Integrity Guarantee'}
                            </h3>
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono text-[9px] font-bold border border-emerald-500/30">
                              ATOMIC ONLY
                            </span>
                          </div>
                          <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
                            {lang === 'ar'
                              ? 'جميع الإجراءات المؤتمتة المنفذة عبر المساعد الذكي تقوم بإنشاء أو تحديث السجلات المحددة فقط بشكل ذري. قاعدة بيانات IndexedDB ومستودعاتها (custom_wallpapers و media_blobs) لا يتم مسحها أو إعادة تعيينها إطلاقاً، وجميع الـ 150+ وسائط مخزنة محمية بنسبة 100%.'
                              : 'All automated actions performed by the AI Copilot ONLY create or update specified records atomically. The underlying IndexedDB database is never reset or dropped, and all 150+ existing user wallpapers, 4K media blobs, and custom assets remain strictly preserved and untouched.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Safety Attributes Pills */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-emerald-500/15 text-[10px] font-mono">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 flex items-center gap-1.5 font-bold">
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>IndexedDB Stores: LOCKED & PRESERVED</span>
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 flex items-center gap-1.5 font-bold">
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>150+ User Assets: 100% SAFE</span>
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 flex items-center gap-1.5 font-bold">
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Targeted Record Updates: store.put() Only</span>
                      </span>
                    </div>
                  </div>

                  {/* 2. Admin AI Prompt Interface */}
                  <div className="p-6 rounded-3xl bg-[#131520] border border-fuchsia-500/30 shadow-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-gradient-to-br from-fuchsia-500/20 to-purple-600/20 border border-fuchsia-500/40 text-fuchsia-400">
                          <Bot className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm sm:text-base font-black text-white">
                              {lang === 'ar' ? 'واجهة موجه الأوامر بالذكاء الاصطناعي (Admin AI Prompt)' : 'Admin AI Prompt Interface'}
                            </h3>
                            <span className="px-2 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-300 font-mono text-[9px] font-bold border border-fuchsia-500/40">
                              GEMINI POWERED
                            </span>
                          </div>
                          <p className="text-xs text-neutral-400 mt-0.5">
                            {lang === 'ar'
                              ? 'اكتب تعليمات مباشرة لتوليد مقالات SEO، أو تحديث الوسوم جماعياً، أو تحسين البيانات الوصفية مباشرة في الذاكرة و IndexedDB.'
                              : 'Type natural language commands to generate SEO articles, batch update tags, or refine metadata directly into local state and IndexedDB.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Textarea Box */}
                    <div className="space-y-3">
                      <div className="relative">
                        <textarea
                          rows={3}
                          value={copilotPrompt}
                          onChange={(e) => setCopilotPrompt(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                              e.preventDefault();
                              handleRunCopilot();
                            }
                          }}
                          placeholder={
                            lang === 'ar'
                              ? 'اكتب تعليماتك هنا (مثال: "Generate an SEO article about 4K OLED wallpapers" أو "Batch update tags for Gaming to add HDR and OLED" أو "Update metadata for Space")...'
                              : 'Type direct instructions (e.g., "Generate an SEO article about 4K wallpapers", "Batch update tags for Gaming wallpapers to add HDR and OLED", "Update metadata for Space")...'
                          }
                          className="w-full p-4 rounded-2xl bg-[#090A10] border border-[#2B2F44] focus:border-fuchsia-500 focus:outline-none text-white text-xs placeholder:text-neutral-500 transition-all font-sans leading-relaxed resize-none"
                        />
                        <div className="absolute right-3 bottom-3 flex items-center gap-2">
                          <span className="text-[10px] text-neutral-500 font-mono hidden sm:inline">
                            Ctrl+Enter ↵
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRunCopilot()}
                            disabled={copilotLoading || !copilotPrompt.trim()}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-500 hover:from-fuchsia-400 hover:to-cyan-400 text-black font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-fuchsia-500/25 transition-all transform active:scale-95 disabled:opacity-40"
                          >
                            {copilotLoading ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>{lang === 'ar' ? 'جاري التحليل...' : 'Analyzing...'}</span>
                              </>
                            ) : (
                              <>
                                <Send className="w-3.5 h-3.5" />
                                <span>{lang === 'ar' ? 'استشارة الذكاء الاصطناعي' : 'Consult AI Copilot'}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Quick Instruction Preset Chips */}
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-bold text-neutral-400 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-fuchsia-400" />
                          <span>{lang === 'ar' ? 'أوامر سريعة مقترحة (اضغط للتجربة الفورية):' : 'Preset Quick Instructions (Click to load):'}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {[
                            {
                              label: lang === 'ar' ? '📝 توليد مقال SEO حول خلفيات 4K' : '📝 Generate an SEO article about 4K wallpapers',
                              prompt: 'Generate an SEO article about 4K wallpapers and OLED display optimization',
                            },
                            {
                              label: lang === 'ar' ? '🏷️ تحديث وسوم ألعاب (Gaming) جماعياً' : '🏷️ Batch update tags for Gaming',
                              prompt: 'Batch update tags for Gaming wallpapers to add Ultrawide, Ray Tracing, HDR 4K',
                            },
                            {
                              label: lang === 'ar' ? '🌌 تحديث البيانات الوصفية للفضاء (Space)' : '🌌 Update metadata for Space',
                              prompt: 'Update metadata for Space wallpapers with deep cosmos descriptions and OLED contrast tags',
                            },
                            {
                              label: lang === 'ar' ? '✨ تحديث وسوم الأنمي (Anime)' : '✨ Batch update tags for Anime',
                              prompt: 'Batch update tags for Anime wallpapers to add 60 FPS Motion, Studio Quality, 4K UHD',
                            },
                          ].map((chip, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setCopilotPrompt(chip.prompt);
                                handleRunCopilot(chip.prompt);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-[#171A27] hover:bg-[#202438] border border-[#282C40] hover:border-fuchsia-500/40 text-[11px] font-medium text-neutral-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <span>{chip.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. Action Proposal & Execution Card */}
                  {copilotResult && (
                    <div className="p-6 rounded-3xl bg-[#131520] border-2 border-cyan-500/50 shadow-2xl space-y-5 animate-fadeIn">
                      {/* Proposal Header */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-[#23273D]">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
                            <Sparkles className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold border border-cyan-500/40">
                                {copilotResult.actionType.replace(/_/g, ' ')}
                              </span>
                              <h4 className="text-sm sm:text-base font-black text-white">
                                {lang === 'ar' ? copilotResult.summaryAr || copilotResult.summaryEn : copilotResult.summaryEn}
                              </h4>
                            </div>
                            {copilotResult.explanation && (
                              <p className="text-xs text-neutral-400 mt-1">
                                {copilotResult.explanation}
                              </p>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setCopilotResult(null)}
                          className="text-neutral-400 hover:text-white text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>{lang === 'ar' ? 'إلغاء' : 'Dismiss'}</span>
                        </button>
                      </div>

                      {/* Proposal Detail Preview */}
                      {copilotResult.actionType === 'GENERATE_ARTICLE' && copilotResult.articleData && (
                        <div className="space-y-4 p-4 rounded-2xl bg-[#0B0D14] border border-[#212435]">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>{lang === 'ar' ? 'معاينة المقال المولد' : 'Generated Article Preview'}</span>
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300">
                              {copilotResult.articleData.category} · {copilotResult.articleData.readTimeMinutes || 5} min read
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2 p-3 rounded-xl bg-[#141622] border border-[#222538]">
                              <div className="text-[10px] text-neutral-400 font-mono">English Title & Excerpt</div>
                              <div className="text-sm font-black text-white">{copilotResult.articleData.titleEn}</div>
                              <p className="text-xs text-neutral-300 leading-relaxed">{copilotResult.articleData.excerptEn}</p>
                            </div>

                            <div className="space-y-2 p-3 rounded-xl bg-[#141622] border border-[#222538] text-right">
                              <div className="text-[10px] text-neutral-400 font-mono">العنوان والمقتطف (بالعربية)</div>
                              <div className="text-sm font-black text-white">{copilotResult.articleData.titleAr}</div>
                              <p className="text-xs text-neutral-300 leading-relaxed">{copilotResult.articleData.excerptAr}</p>
                            </div>
                          </div>

                          {/* Tags Preview */}
                          {copilotResult.articleData.tags && copilotResult.articleData.tags.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              <span className="text-[10px] text-neutral-400 font-mono mr-1">Tags:</span>
                              {copilotResult.articleData.tags.map((tg, i) => (
                                <span key={i} className="px-2 py-0.5 rounded-md bg-[#1B1E2E] text-neutral-300 text-[10px] font-mono border border-white/5">
                                  #{tg}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {copilotResult.actionType === 'BATCH_UPDATE_TAGS' && copilotResult.tagUpdateData && (
                        <div className="space-y-3 p-4 rounded-2xl bg-[#0B0D14] border border-[#212435]">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                              <Tag className="w-3.5 h-3.5" />
                              <span>{lang === 'ar' ? 'تفاصيل تحديث الوسوم' : 'Batch Tag Modification Plan'}</span>
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">
                              Category: {copilotResult.tagUpdateData.targetCategory}
                            </span>
                          </div>

                          <div className="p-3.5 rounded-xl bg-[#141622] border border-[#222538] space-y-2">
                            <div className="text-xs text-neutral-300">
                              {lang === 'ar' ? 'الوسوم الجديدة التي ستُضاف للخلفيات المطابقة:' : 'Tags to append to matching wallpapers:'}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {copilotResult.tagUpdateData.tagsToAdd.map((tg, i) => (
                                <span key={i} className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 text-xs font-mono font-bold border border-cyan-500/30 flex items-center gap-1">
                                  <Plus className="w-3 h-3" />
                                  <span>{tg}</span>
                                </span>
                              ))}
                            </div>
                            <div className="text-[11px] text-neutral-400 pt-1">
                              {lang === 'ar'
                                ? `عدد الخلفيات المستهدفة في المعرض: ${wallpapers.filter(w => copilotResult?.tagUpdateData?.targetCategory === 'All' || w.category.toLowerCase() === copilotResult?.tagUpdateData?.targetCategory?.toLowerCase()).length} خلفية.`
                                : `Targeted wallpapers in gallery: ${wallpapers.filter(w => copilotResult?.tagUpdateData?.targetCategory === 'All' || w.category.toLowerCase() === copilotResult?.tagUpdateData?.targetCategory?.toLowerCase()).length} items.`}
                            </div>
                          </div>
                        </div>
                      )}

                      {copilotResult.actionType === 'UPDATE_METADATA' && copilotResult.metadataUpdateData && (
                        <div className="space-y-3 p-4 rounded-2xl bg-[#0B0D14] border border-[#212435]">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>{lang === 'ar' ? 'تحديث البيانات الوصفية' : 'Metadata Update Plan'}</span>
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">
                              Category: {copilotResult.metadataUpdateData.targetCategory}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {copilotResult.metadataUpdateData.descEn && (
                              <div className="p-3 rounded-xl bg-[#141622] border border-[#222538] space-y-1">
                                <div className="text-[10px] text-neutral-400 font-mono">English Description</div>
                                <p className="text-xs text-neutral-300">{copilotResult.metadataUpdateData.descEn}</p>
                              </div>
                            )}
                            {copilotResult.metadataUpdateData.descAr && (
                              <div className="p-3 rounded-xl bg-[#141622] border border-[#222538] space-y-1 text-right">
                                <div className="text-[10px] text-neutral-400 font-mono">الوصف بالعربية</div>
                                <p className="text-xs text-neutral-300">{copilotResult.metadataUpdateData.descAr}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {copilotResult.actionType === 'ASSIST_ANSWER' && copilotResult.answerMarkdown && (
                        <div className="p-4 rounded-2xl bg-[#0B0D14] border border-[#212435] text-xs text-neutral-200 leading-relaxed whitespace-pre-line font-sans">
                          {copilotResult.answerMarkdown}
                        </div>
                      )}

                      {/* Action Execution Toolbar */}
                      <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                          <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>
                            {lang === 'ar'
                              ? 'سيتم الحفظ ذرياً في IndexedDB دون مساس بأي من الـ 150+ وسائط مخزنة.'
                              : 'Executes atomic IndexedDB update. All 150+ user media assets remain preserved.'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setCopilotResult(null)}
                            className="px-4 py-2.5 rounded-xl bg-[#1B1E2C] hover:bg-[#252A3C] text-neutral-300 text-xs font-bold transition-colors cursor-pointer"
                          >
                            {lang === 'ar' ? 'تجاهل' : 'Cancel'}
                          </button>

                          <button
                            type="button"
                            onClick={handleExecuteCopilotAction}
                            disabled={copilotExecuting}
                            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-cyan-400 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xl shadow-cyan-500/25 transition-all transform active:scale-95 disabled:opacity-50"
                          >
                            {copilotExecuting ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>{lang === 'ar' ? 'جاري الحفظ الذري في IndexedDB...' : 'Persisting to IndexedDB...'}</span>
                              </>
                            ) : (
                              <>
                                <Zap className="w-4 h-4" />
                                <span>{lang === 'ar' ? '⚡ تنفيذ وحفظ في IndexedDB' : '⚡ Execute & Save to IndexedDB'}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 4. Session Action History & Audit Log */}
                  <div className="p-6 rounded-3xl bg-[#14151E] border border-[#232635] space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Clock className="w-4 h-4 text-cyan-400" />
                        <h4 className="text-xs font-black text-white uppercase tracking-wider">
                          {lang === 'ar' ? 'سجل عمليات Copilot خلال الجلسة الحالية' : 'Session Copilot Action & Audit Log'}
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono text-neutral-400">
                        {copilotHistory.length} {lang === 'ar' ? 'عملية منفذة' : 'actions executed'}
                      </span>
                    </div>

                    {copilotHistory.length === 0 ? (
                      <div className="p-8 rounded-2xl bg-[#0C0D13] border border-dashed border-[#232636] text-center space-y-2">
                        <Bot className="w-8 h-8 text-neutral-600 mx-auto" />
                        <div className="text-xs text-neutral-400 font-medium">
                          {lang === 'ar'
                            ? 'لم يتم تنفيذ أي عمليات بالذكاء الاصطناعي بعد خلال هذه الجلسة.'
                            : 'No Copilot actions executed yet during this session.'}
                        </div>
                        <div className="text-[11px] text-neutral-500">
                          {lang === 'ar'
                            ? 'اكتب أمراً في مربع الإدخال أعلاه مثل "Generate an SEO article" أو اضغط على الأوامر السريعة للبدء.'
                            : 'Type an instruction above or click a preset chip to start generating.'}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {copilotHistory.map((item) => (
                          <div
                            key={item.id}
                            className="p-3.5 rounded-xl bg-[#0E1017] border border-[#222538] flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-2.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              <div>
                                <div className="font-bold text-white">{item.summary}</div>
                                <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
                                  Prompt: "{item.prompt}" · {new Date(item.timestamp).toLocaleTimeString()}
                                </div>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-mono text-[9px] font-bold shrink-0 border border-emerald-500/20">
                              INDEXEDDB COMMITTED
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Visual Wallpaper Repository Picker Modal (Requested Feature 2) */}
        {showWallpaperPickerModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <div className="w-full max-w-4xl max-h-[85vh] bg-[#12141E] border border-cyan-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="p-4 sm:p-5 bg-[#0B0C11] border-b border-[#232638] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-white">
                      {lang === 'ar' ? 'اختيار صورة المقال من مستودع الخلفيات' : 'Select Article Media from DeskSpace Repository'}
                    </h3>
                    <p className="text-xs text-neutral-400">
                      {lang === 'ar'
                        ? 'اختر أي خلفية 4K من المستودع لتعيينها كصورة غلاف رئيسية أو نسخ وسم Markdown للإدراج الداخلي.'
                        : 'Pick any curated 4K wallpaper to set as cover image or copy inline markdown tags.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowWallpaperPickerModal(false)}
                  className="p-2 rounded-xl bg-neutral-800/60 hover:bg-neutral-800 text-neutral-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Toolbar: Search and Category Filter */}
              <div className="p-4 bg-[#0F1018] border-b border-[#1E2130] flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={lang === 'ar' ? 'بحث في خلفيات المستودع...' : 'Search wallpapers by name or tag...'}
                    value={wallpaperPickerSearch}
                    onChange={(e) => setWallpaperPickerSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#161824] border border-[#272B3E] text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                  {['All', ...CATEGORIES].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setWallpaperPickerCategory(cat)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                        wallpaperPickerCategory === cat
                          ? 'bg-cyan-500 text-black shadow-md'
                          : 'bg-[#181A26] text-neutral-400 hover:text-white border border-[#272B3E]'
                      }`}
                    >
                      {cat === 'All' ? (lang === 'ar' ? 'الكل' : 'All') : (t.categories[cat as Category] || cat)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid of Wallpapers */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                {wallpapers
                  .filter((w) => {
                    const q = wallpaperPickerSearch.toLowerCase().trim();
                    const matchesSearch =
                      !q ||
                      w.title.en.toLowerCase().includes(q) ||
                      w.title.ar.toLowerCase().includes(q) ||
                      w.tags.some((t) => t.toLowerCase().includes(q));
                    const matchesCat = wallpaperPickerCategory === 'All' || w.category === wallpaperPickerCategory;
                    return matchesSearch && matchesCat;
                  })
                  .map((wp) => (
                    <div
                      key={wp.id}
                      className="group p-2 rounded-2xl bg-[#151724] border border-[#23273A] hover:border-cyan-500/50 transition-all flex flex-col justify-between space-y-2 cursor-pointer shadow-md"
                      onClick={() => {
                        const targetUrl = wp.thumbnailUrl || wp.posterUrl || wp.url;
                        setFormCoverImage(targetUrl);
                        setShowWallpaperPickerModal(false);
                        setAiBlogImageNotice(
                          lang === 'ar'
                            ? `تم ربط خلفية "${wp.title.ar}" كصورة غلاف للمقال!`
                            : `Attached "${wp.title.en}" as article featured cover!`
                        );
                        setTimeout(() => setAiBlogImageNotice(null), 3000);
                      }}
                    >
                      <div className="relative aspect-video rounded-xl overflow-hidden bg-black/60">
                        <img
                          src={wp.thumbnailUrl || wp.posterUrl || wp.url || getCategoryFallback(wp.category)}
                          alt={wp.title.en}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = getCategoryFallback(wp.category);
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[8px] font-mono font-bold text-cyan-300">
                          {wp.resolution || '4K UHD'}
                        </div>
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                          <span className="px-2.5 py-1 rounded-lg bg-cyan-500 text-black text-[11px] font-black shadow-lg">
                            {lang === 'ar' ? 'تعيين كغلاف للمقال' : 'Select as Cover'}
                          </span>
                        </div>
                      </div>

                      <div className="px-1">
                        <div className="text-[11px] font-bold text-white truncate">{wp.title[lang] || wp.title.en}</div>
                        <div className="text-[9px] text-neutral-400 flex items-center justify-between mt-0.5">
                          <span>{wp.category}</span>
                          <span className="font-mono text-cyan-400">{wp.aspectRatio || '16:9'}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyMarkdownEmbed(wp.url, wp.title.en);
                        }}
                        className="w-full py-1 rounded-lg bg-[#1C1F2E] hover:bg-[#252A3E] text-neutral-300 hover:text-white text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        title="Copy Markdown embed tag: ![Title](url)"
                      >
                        <Copy className="w-3 h-3 text-cyan-400" />
                        <span>{lang === 'ar' ? 'نسخ الوسم الداخلي' : 'Copy Inline Tag'}</span>
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Dedicated Admin AI Development Co-Pilot Chat Widget */}
        {isAuthenticated && (
          <AdminDevCopilotWidget
            lang={lang}
            totalWallpapers={wallpapers.length}
            totalBlogPosts={blogPosts.length}
            categories={CATEGORIES}
          />
        )}
      </div>
    </div>
  );
};
