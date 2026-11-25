export type Category = 'Anime' | 'Gaming' | 'Nature' | 'Space' | 'Cars' | 'Minimalist' | 'Journal' | 'Mobile';

export type Language = 'en' | 'ar';

export type LegalModalType = 'about' | 'contact' | 'privacy' | 'terms' | 'dmca' | null;

export interface Wallpaper {
  id: string;
  slug?: string;
  title: {
    en: string;
    ar: string;
  };
  description?: {
    en: string;
    ar: string;
  } | string;
  category: Category;
  resolution: string;
  width: number;
  height: number;
  url: string;
  aspectRatio: string;
  downloads: number;
  favorites: number;
  fileSize: string;
  tags: string[];
  colorPalette: string[];
  createdAt: string;
  isLive?: boolean;
  videoUrl?: string;
  thumbnailUrl?: string;
  posterUrl?: string;
  fps?: number;
  formatType?: 'image' | 'video';
  deviceFormat?: 'desktop' | 'mobile';
  isMobile?: boolean;
}

export interface User {
  id: string;
  username: string;
  email: string;
  favorites: string[];
  downloadHistory: DownloadHistoryItem[];
  joinedAt: string;
}

export interface DownloadHistoryItem {
  id: string;
  wallpaperId: string;
  wallpaperTitle: string;
  wallpaperUrl: string;
  resolution: string;
  downloadedAt: string;
}

export interface ResolutionPreset {
  id: string;
  name: {
    en: string;
    ar: string;
  };
  width: number;
  height: number;
  aspectRatio: string;
  isCrop?: boolean;
}

export interface BlogComment {
  id: string;
  author: string;
  avatar?: string;
  content: string;
  createdAt: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: {
    en: string;
    ar: string;
  };
  excerpt: {
    en: string;
    ar: string;
  };
  content: {
    en: string;
    ar: string;
  };
  coverImage: string;
  category: 'Tech' | 'Guides' | 'Curation' | 'Art' | 'Minimalism';
  author: {
    name: string;
    role: {
      en: string;
      ar: string;
    };
    avatar?: string;
  };
  readTimeMinutes: number;
  tags: string[];
  publishedAt: string;
  likes: number;
  comments: BlogComment[];
  relatedWallpaperId?: string;
}
