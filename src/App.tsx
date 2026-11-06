import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Filter,
  Sparkles,
  ArrowUpDown,
  Search,
  SlidersHorizontal,
  Flame,
  Clock,
  Heart,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  Smartphone,
  ChevronDown,
} from 'lucide-react';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { WallpaperCard } from './components/WallpaperCard';
import { WallpaperDetailsPage } from './components/WallpaperDetailsPage';
import { DownloadModal } from './components/DownloadModal';
import { Pagination } from './components/Pagination';
import { AuthModal } from './components/AuthModal';
import { UserProfileModal } from './components/UserProfileModal';
import { LegalModals } from './components/LegalModals';
// Lazy load SecretAdminModal to guarantee ZERO bundle overhead for public visitors
const SecretAdminModal = React.lazy(() =>
  import('./components/SecretAdminModal').then((m) => ({ default: m.SecretAdminModal }))
);
import { Footer } from './components/Footer';
import { BlogSection } from './components/BlogSection';
import { MobileLiveSection } from './components/MobileLiveSection';
import { Wallpaper, Category, Language, User, BlogPost, LegalModalType } from './types';
import { translations } from './translations';
import { INITIAL_WALLPAPERS } from './data/initialWallpapers';
import { INITIAL_BLOG_POSTS } from './data/initialBlogPosts';
import { ErrorBoundary } from './components/ErrorBoundary';
import {
  STORAGE_KEYS,
  safeLoadWallpapers,
  safeSaveWallpapers,
  safeLoadBlogPosts,
  safeSaveBlogPosts,
  loadCustomWallpapersFromIndexedDB,
  loadCustomBlogPostsFromIndexedDB,
  deleteCustomWallpaperFromIndexedDB,
  clearAllCustomWallpapersInIndexedDB,
  permanentlyDeleteWallpaperFromIndexedDB,
  clearAllDeletedWallpaperIds,
  getDeletedWallpaperIds,
  getDeletedBlogPostIds,
  permanentlyDeleteBlogPostFromIndexedDB,
  matchesIdOrSlug,
} from './utils/storageManager';
import {
  saveGalleryNavigationState,
  getGalleryNavigationState,
  restoreGalleryScroll,
} from './utils/navigationState';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  // 1. Core State
  const [lang, setLang] = useState<Language>(() => {
    try {
      return (localStorage.getItem(STORAGE_KEYS.LANG) as Language) || 'en';
    } catch {
      return 'en';
    }
  });

  const [wallpapers, setWallpapers] = useState<Wallpaper[]>(() => {
    return safeLoadWallpapers();
  });

  const [blogPosts, setBlogPosts] = useState<BlogPost[]>(() => {
    return safeLoadBlogPosts();
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USER);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [guestFavorites, setGuestFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.GUEST_FAVORITES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 2. Hydrate custom wallpapers and blog posts from IndexedDB (Data Safety Protocol)
  const isWallpapersHydratedRef = React.useRef(false);
  const isBlogHydratedRef = React.useRef(false);

  useEffect(() => {
    let isMounted = true;

    // Hydrate Custom Wallpapers
    loadCustomWallpapersFromIndexedDB().then((customItems) => {
      if (!isMounted) return;
      isWallpapersHydratedRef.current = true;
      const deletedIds = getDeletedWallpaperIds();

      setWallpapers((prev) => {
        const prevClean = prev.filter((w) => !deletedIds.has(w.id));
        if (!customItems || customItems.length === 0) return prevClean;

        const filteredCustom = customItems.filter((w) => !deletedIds.has(w.id));
        const customMap = new Map(filteredCustom.map((item) => [item.id, item]));
        let hasChanges = prevClean.length !== prev.length;

        const updated = prevClean.map((item) => {
          const fromDb = customMap.get(item.id);
          if (fromDb) {
            if (
              fromDb.url !== item.url ||
              fromDb.posterUrl !== item.posterUrl ||
              fromDb.videoUrl !== item.videoUrl
            ) {
              hasChanges = true;
            }
            return {
              ...item,
              ...fromDb,
              url: fromDb.url || item.url,
              posterUrl: fromDb.posterUrl || item.posterUrl,
              videoUrl: fromDb.videoUrl || item.videoUrl,
            };
          }
          return item;
        });

        const existingIds = new Set(prevClean.map((w) => w.id));
        const missingFromPrev = filteredCustom.filter((w) => !existingIds.has(w.id));
        if (missingFromPrev.length > 0) hasChanges = true;

        if (!hasChanges) return prevClean;
        return [...missingFromPrev, ...updated];
      });
    });

    // Hydrate Custom Blog Posts (Data Safety Protocol)
    loadCustomBlogPostsFromIndexedDB().then((customPosts) => {
      if (!isMounted) return;
      isBlogHydratedRef.current = true;
      const deletedIds = getDeletedBlogPostIds();

      setBlogPosts((prev) => {
        const prevClean = prev.filter((p) => !deletedIds.has(p.id));
        if (!customPosts || customPosts.length === 0) return prevClean;

        const filteredCustom = customPosts.filter((p) => !deletedIds.has(p.id));
        const customMap = new Map(filteredCustom.map((item) => [item.id, item]));
        let hasChanges = prevClean.length !== prev.length;

        const updated = prevClean.map((item) => {
          const fromDb = customMap.get(item.id);
          if (fromDb) {
            hasChanges = true;
            return {
              ...item,
              ...fromDb,
            };
          }
          return item;
        });

        const existingIds = new Set(prevClean.map((p) => p.id));
        const missingFromPrev = filteredCustom.filter((p) => !existingIds.has(p.id));
        if (missingFromPrev.length > 0) hasChanges = true;

        if (!hasChanges) return prevClean;
        return [...missingFromPrev, ...updated];
      });
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Helper to strictly identify Mobile 9:16 Wallpapers
  const isMobileWallpaper = (w: Wallpaper): boolean => {
    return Boolean(
      w.deviceFormat === 'mobile' ||
      w.aspectRatio === '9:16' ||
      w.isMobile === true ||
      w.category === 'Mobile' ||
      (w.width && w.height && w.height > w.width) ||
      w.tags?.some((t) => {
        const lower = t.toLowerCase();
        return (
          lower.includes('mobile live') ||
          lower.includes('9:16') ||
          lower === 'vertical' ||
          lower === 'mobile' ||
          lower === 'smartphone'
        );
      })
    );
  };

  // 3. Navigation & Filtering State
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All' | 'Live' | 'MobileLive' | 'Blog'>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      if (path.startsWith('/blog')) return 'Blog';
      if (path.startsWith('/mobile') || path.startsWith('/mobile-live')) return 'MobileLive';
      const saved = getGalleryNavigationState();
      if (saved && saved.category && (path === '' || path === '/')) {
        return saved.category;
      }
    }
    return 'All';
  });
  const [searchQuery, setSearchQuery] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const saved = getGalleryNavigationState();
      if (saved && saved.searchQuery && (path === '' || path === '/')) {
        return saved.searchQuery;
      }
    }
    return '';
  });
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'favorites'>(() => {
    if (typeof window !== 'undefined') {
      const saved = getGalleryNavigationState();
      if (saved && saved.sortBy) {
        return saved.sortBy;
      }
    }
    return 'popular';
  });

  // Direct check for /secret-admin path or hash on initial load
  const isDirectSecretAdmin = () => {
    if (typeof window === 'undefined') return false;
    const rawPath = (window.location.pathname || '').toLowerCase();
    const cleanPath = rawPath.replace(/\/+$/, '');
    const hash = (window.location.hash || '').toLowerCase();
    return (
      cleanPath === '/secret-admin' ||
      cleanPath.endsWith('/secret-admin') ||
      hash === '#secret-admin' ||
      hash === '#/secret-admin' ||
      hash.includes('secret-admin')
    );
  };

  // 4. Modals State
  const [downloadModalWallpaper, setDownloadModalWallpaper] = useState<Wallpaper | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(isDirectSecretAdmin);
  const [legalModalType, setLegalModalType] = useState<LegalModalType>(null);

  // 5. Active Wallpaper Details Detection from Route /wallpaper/:id
  const wallpaperMatch = location.pathname.match(/^\/wallpaper\/([^/?#]+)/i);
  const activeWallpaperId = wallpaperMatch ? decodeURIComponent(wallpaperMatch[1]) : null;
  const activeWallpaper = useMemo(() => {
    if (!activeWallpaperId) return null;
    return wallpapers.find((w) => matchesIdOrSlug(w, activeWallpaperId)) || null;
  }, [activeWallpaperId, wallpapers]);

  // Sync Language, Direction, and Dynamic SEO Meta Tags for Googlebot
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LANG, lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

    let pageTitle = '';
    let pageDesc = '';

    if (activeWallpaper) {
      const wpTitle = activeWallpaper.title[lang] || activeWallpaper.title.en;
      pageTitle = `${wpTitle} - 4K Ultra HD Wallpaper · DeskSpace4K`;
      pageDesc =
        lang === 'ar'
          ? `حمل خلفية ${wpTitle} بدقة 4K فائقة الوضوح (3840×2160) مجاناً لشاشتك على DeskSpace4K.`
          : `Download ${wpTitle} in 4K Ultra HD resolution (3840×2160) for PC, Mac, and mobile on DeskSpace4K.`;
    } else if (selectedCategory === 'Blog' || location.pathname === '/blog') {
      pageTitle =
        lang === 'ar'
          ? 'المدونة التقنية · هندسة شاشات 4K و OLED · DeskSpace4K'
          : 'DeskSpace Journal · 4K & OLED Display Optics · DeskSpace4K';
      pageDesc =
        lang === 'ar'
          ? 'مقالات وأدلة تقنية متقدمة حول شاشات 4K و OLED، الترددات العالية، وضبط الألوان.'
          : 'Deep dive articles on 4K display optics, OLED infinite contrast, HDR color calibration, and live wallpaper performance.';
    } else if (selectedCategory === 'MobileLive') {
      pageTitle =
        lang === 'ar'
          ? 'خلفيات هاتف حية 4K رأسية (9:16) · DeskSpace4K'
          : 'Mobile Live Wallpapers 4K Vertical (9:16) · DeskSpace4K';
      pageDesc =
        lang === 'ar'
          ? 'حمل أفضل خلفيات الهواتف الذكية الحية الرأسية بدقة 4K و FHD (9:16) بمعدل 60 إطاراً في الثانية مجاناً على DeskSpace4K.'
          : 'Download ultra-smooth 60 FPS 9:16 portrait 4K & FHD Mobile Live Wallpapers for iPhone and Android on DeskSpace4K.';
    } else {
      const baseTitle =
        lang === 'ar'
          ? 'DeskSpace4K - خلفيات 4K مجانية وخلفيات حية متحركة'
          : 'DeskSpace4K - Free 4K Wallpapers & Live Wallpapers';
      const categoryText = selectedCategory === 'All' ? '' : ` · ${selectedCategory}`;
      pageTitle = `${baseTitle}${categoryText}`;
      pageDesc =
        lang === 'ar'
          ? 'حمل مجاناً خلفيات سطح المكتب بدقة 4K وخلفيات Ultra HD وخلفيات متحركة حية للكمبيوتر والهاتف على DeskSpace4K.'
          : 'Download free 4K desktop wallpapers, Ultra HD backgrounds, and live motion wallpapers for PC and mobile on DeskSpace4K.';
    }

    document.title = pageTitle;

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', pageDesc);

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', pageTitle);

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', pageDesc);
  }, [lang, selectedCategory, activeWallpaper, location.pathname]);

  // Sync Wallpapers safely to Storage (Guarded against pre-hydration overwriting to protect user data)
  useEffect(() => {
    if (!isWallpapersHydratedRef.current) return;
    safeSaveWallpapers(wallpapers);
  }, [wallpapers]);

  // Sync User to LocalStorage
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(STORAGE_KEYS.USER);
      }
    } catch (e) {
      console.warn('Storage quota exceeded while syncing user', e);
    }
  }, [currentUser]);

  // Sync Guest Favorites
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.GUEST_FAVORITES, JSON.stringify(guestFavorites));
    } catch (e) {
      console.warn('Storage quota exceeded while syncing guest favorites', e);
    }
  }, [guestFavorites]);

  // Sync Blog Posts safely to Storage (Guarded against pre-hydration overwriting)
  useEffect(() => {
    if (!isBlogHydratedRef.current) return;
    safeSaveBlogPosts(blogPosts);
  }, [blogPosts]);

  // 6. Client-side Routing & Secret Admin Access Mechanism
  useEffect(() => {
    const rawPath = (location.pathname || window.location.pathname || '').toLowerCase();
    const cleanPath = rawPath.replace(/\/+$/, '');
    const hash = (location.hash || window.location.hash || '').toLowerCase();

    // Check if user is navigating directly to secret-admin route or hash
    const isSecretRoute =
      cleanPath === '/secret-admin' ||
      cleanPath.endsWith('/secret-admin') ||
      hash === '#secret-admin' ||
      hash === '#/secret-admin' ||
      hash.includes('secret-admin');

    if (isSecretRoute) {
      setIsAdminModalOpen((prev) => (prev ? prev : true));
    }

    // Sync /blog and /mobile paths with selectedCategory
    if (cleanPath === '/blog') {
      setSelectedCategory((prev) => (prev === 'Blog' ? prev : 'Blog'));
    } else if (cleanPath === '/mobile' || cleanPath === '/mobile-live') {
      setSelectedCategory((prev) => (prev === 'MobileLive' ? prev : 'MobileLive'));
    }
  }, [location.pathname, location.hash]);

  // Fallback Catch-all Route: Redirect unknown routes cleanly to / to prevent blank or 404 screens
  useEffect(() => {
    const raw = (location.pathname || '').toLowerCase().replace(/\/+$/, '');
    if (
      raw !== '' &&
      raw !== '/' &&
      raw !== '/blog' &&
      raw !== '/mobile' &&
      raw !== '/mobile-live' &&
      raw !== '/secret-admin' &&
      !raw.startsWith('/wallpaper/')
    ) {
      navigate('/', { replace: true });
    }
  }, [location.pathname, navigate]);

  // Fallback popstate and hashchange listeners for native browser back/forward buttons
  useEffect(() => {
    const handleNativeRouteSync = () => {
      const rawPath = window.location.pathname.toLowerCase();
      const cleanPath = rawPath.replace(/\/+$/, '');
      const hash = window.location.hash.toLowerCase();

      if (
        cleanPath === '/secret-admin' ||
        cleanPath.endsWith('/secret-admin') ||
        hash === '#secret-admin' ||
        hash === '#/secret-admin' ||
        hash.includes('secret-admin')
      ) {
        setIsAdminModalOpen((prev) => (prev ? prev : true));
      } else if (cleanPath === '/blog') {
        setSelectedCategory('Blog');
      } else if (cleanPath === '/mobile' || cleanPath === '/mobile-live') {
        setSelectedCategory('MobileLive');
      } else if (cleanPath === '' || cleanPath === '/') {
        setSelectedCategory((prev) => (prev === 'MobileLive' || prev === 'Blog' ? 'All' : prev));
      }
    };

    window.addEventListener('hashchange', handleNativeRouteSync);
    window.addEventListener('popstate', handleNativeRouteSync);
    return () => {
      window.removeEventListener('hashchange', handleNativeRouteSync);
      window.removeEventListener('popstate', handleNativeRouteSync);
    };
  }, []);

  const handleCloseAdmin = () => {
    setIsAdminModalOpen(false);
    const currentPath = (location.pathname || window.location.pathname || '').toLowerCase();
    const currentHash = (location.hash || window.location.hash || '').toLowerCase();

    if (currentPath.includes('secret-admin')) {
      navigate('/', { replace: true });
    } else if (currentHash.includes('secret-admin')) {
      window.history.replaceState(null, '', location.pathname || '/');
    }
  };

  const handleSelectCategory = (cat: Category | 'All' | 'Live' | 'MobileLive' | 'Blog') => {
    setSelectedCategory(cat);
    if (cat === 'Blog') {
      if (location.pathname !== '/blog') {
        navigate('/blog');
      }
    } else if (cat === 'MobileLive') {
      if (location.pathname !== '/mobile') {
        navigate('/mobile');
      }
    } else {
      if (location.pathname !== '/') {
        navigate('/');
      }
    }
  };

  // Toggle Language
  const toggleLanguage = () => {
    setLang((prev) => (prev === 'en' ? 'ar' : 'en'));
  };

  // Active Favorites Set
  const activeFavorites = useMemo(() => {
    return currentUser ? currentUser.favorites : guestFavorites;
  }, [currentUser, guestFavorites]);

  // Toggle Favorite
  const handleToggleFavorite = (wallpaperId: string) => {
    if (currentUser) {
      const exists = currentUser.favorites.includes(wallpaperId);
      const newFavs = exists
        ? currentUser.favorites.filter((id) => id !== wallpaperId)
        : [...currentUser.favorites, wallpaperId];

      setCurrentUser({
        ...currentUser,
        favorites: newFavs,
      });

      setWallpapers((prev) =>
        prev.map((w) =>
          w.id === wallpaperId ? { ...w, favorites: Math.max(0, w.favorites + (exists ? -1 : 1)) } : w
        )
      );
    } else {
      const exists = guestFavorites.includes(wallpaperId);
      const newFavs = exists
        ? guestFavorites.filter((id) => id !== wallpaperId)
        : [...guestFavorites, wallpaperId];

      setGuestFavorites(newFavs);

      setWallpapers((prev) =>
        prev.map((w) =>
          w.id === wallpaperId ? { ...w, favorites: Math.max(0, w.favorites + (exists ? -1 : 1)) } : w
        )
      );
    }
  };

  // Record Download
  const handleRecordDownload = (wallpaper: Wallpaper, resolutionStr: string) => {
    setWallpapers((prev) =>
      prev.map((w) => (w.id === wallpaper.id ? { ...w, downloads: w.downloads + 1 } : w))
    );

    if (currentUser) {
      const historyItem = {
        id: `dl_${Date.now()}`,
        wallpaperId: wallpaper.id,
        wallpaperTitle: wallpaper.title[lang] || wallpaper.title.en,
        wallpaperUrl: wallpaper.url,
        resolution: resolutionStr,
        downloadedAt: new Date().toISOString(),
      };

      setCurrentUser({
        ...currentUser,
        downloadHistory: [historyItem, ...currentUser.downloadHistory],
      });
    }
  };

  // Strict record validation: Filter out corrupted records or records missing essential media/titles from public feed
  const isValidPublicWallpaper = (w: Wallpaper): boolean => {
    if (!w || typeof w !== 'object' || !w.id) return false;
    const hasTitle = Boolean(
      (w.title?.en && w.title.en.trim() !== '') ||
      (w.title?.ar && w.title.ar.trim() !== '')
    );
    const hasMedia = Boolean(
      (w.url && w.url.trim() !== '' && w.url !== 'undefined' && w.url !== 'null') ||
      (w.thumbnailUrl && w.thumbnailUrl.trim() !== '' && w.thumbnailUrl !== 'undefined') ||
      (w.posterUrl && w.posterUrl.trim() !== '' && w.posterUrl !== 'undefined') ||
      (w.videoUrl && w.videoUrl.trim() !== '' && w.videoUrl !== 'undefined')
    );
    return hasTitle && hasMedia;
  };

  // Split collections: STRICTLY desktop 16:9 vs mobile 9:16 (corrupted/empty records filtered out)
  const desktopWallpapers = useMemo(() => {
    return wallpapers.filter((w) => isValidPublicWallpaper(w) && !isMobileWallpaper(w));
  }, [wallpapers]);

  const mobileWallpapers = useMemo(() => {
    return wallpapers.filter((w) => isValidPublicWallpaper(w) && isMobileWallpaper(w));
  }, [wallpapers]);

  // Filter & Sort Desktop Wallpapers (Main Public Feed - ALL Mobile 9:16 Wallpapers 100% Excluded)
  const filteredDesktopWallpapers = useMemo(() => {
    let result = [...desktopWallpapers];

    if (selectedCategory === 'Live') {
      result = result.filter((w) => w.isLive === true);
    } else if (selectedCategory !== 'All' && selectedCategory !== 'Blog' && selectedCategory !== 'MobileLive') {
      result = result.filter((w) => w.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((w) => {
        const titleEn = w.title.en.toLowerCase();
        const titleAr = w.title.ar.toLowerCase();
        const cat = w.category.toLowerCase();
        const tags = w.tags.join(' ').toLowerCase();
        return titleEn.includes(q) || titleAr.includes(q) || cat.includes(q) || tags.includes(q);
      });
    }

    result.sort((a, b) => {
      if (sortBy === 'popular') return b.downloads - a.downloads;
      if (sortBy === 'favorites') return b.favorites - a.favorites;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [desktopWallpapers, selectedCategory, searchQuery, sortBy]);

  // High performance traditional pagination synchronized with URL query parameters
  const [currentPage, setCurrentPage] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('page');
      if (p) {
        const n = parseInt(p, 10);
        return isNaN(n) || n < 1 ? 1 : n;
      }
      const saved = getGalleryNavigationState();
      if (saved && typeof saved.page === 'number' && saved.page >= 1) {
        return saved.page;
      }
    }
    return 1;
  });

  const [itemsPerPage, setItemsPerPage] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const l = new URLSearchParams(window.location.search).get('limit');
      if (l) {
        const n = parseInt(l, 10);
        return [12, 24, 36, 48].includes(n) ? n : 24;
      }
      const saved = getGalleryNavigationState();
      if (saved && [12, 24, 36, 48].includes(saved.itemsPerPage)) {
        return saved.itemsPerPage;
      }
    }
    return 24;
  });

  const galleryTopRef = React.useRef<HTMLDivElement>(null);
  const isRestoringNavigationRef = React.useRef<boolean>(false);
  const hasNavigatedInAppRef = React.useRef<boolean>(false);
  const previousPathnameRef = React.useRef<string>(location.pathname);

  // Sync state when URL query params change (e.g. browser Back / Forward buttons)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const p = parseInt(params.get('page') || '1', 10);
    const safePage = isNaN(p) || p < 1 ? 1 : p;
    const l = parseInt(params.get('limit') || '24', 10);
    const safeLimit = [12, 24, 36, 48].includes(l) ? l : 24;

    setCurrentPage((prev) => (prev !== safePage ? safePage : prev));
    setItemsPerPage((prev) => (prev !== safeLimit ? safeLimit : prev));
  }, [location.search]);

  // Reset to page 1 whenever category, search query, or sort order changes (guarded during back navigation restoration)
  useEffect(() => {
    if (isRestoringNavigationRef.current) {
      setTimeout(() => {
        isRestoringNavigationRef.current = false;
      }, 350);
      return;
    }
    setCurrentPage(1);
    const params = new URLSearchParams(location.search);
    if (params.has('page')) {
      params.delete('page');
      const newQuery = params.toString();
      navigate(`${location.pathname}${newQuery ? `?${newQuery}` : ''}${location.hash}`, {
        replace: true,
      });
    }
  }, [selectedCategory, searchQuery, sortBy]);

  // Seamless scroll position restoration and state recovery when returning from detail view
  useEffect(() => {
    const prevPath = previousPathnameRef.current;
    const currentPath = location.pathname;
    previousPathnameRef.current = currentPath;

    if (prevPath.startsWith('/wallpaper/') && !currentPath.startsWith('/wallpaper/')) {
      const saved = getGalleryNavigationState();
      if (saved) {
        isRestoringNavigationRef.current = true;
        if (saved.category && saved.category !== selectedCategory) {
          setSelectedCategory(saved.category);
        }
        if (typeof saved.searchQuery === 'string' && saved.searchQuery !== searchQuery) {
          setSearchQuery(saved.searchQuery);
        }
        if (saved.sortBy && saved.sortBy !== sortBy) {
          setSortBy(saved.sortBy);
        }
        if (typeof saved.page === 'number' && saved.page !== currentPage) {
          setCurrentPage(saved.page);
        }
        if (typeof saved.itemsPerPage === 'number' && saved.itemsPerPage !== itemsPerPage) {
          setItemsPerPage(saved.itemsPerPage);
        }
        if (typeof saved.scrollY === 'number' && saved.scrollY > 0) {
          restoreGalleryScroll(saved.scrollY);
        }
      }
    }
  }, [location.pathname, selectedCategory, searchQuery, sortBy, currentPage, itemsPerPage]);

  // Handlers for navigating to wallpaper details and returning to gallery
  const handleOpenWallpaperDetails = useCallback(
    (wp: Wallpaper) => {
      hasNavigatedInAppRef.current = true;
      if (!location.pathname.startsWith('/wallpaper/')) {
        saveGalleryNavigationState({
          pathname: location.pathname,
          search: location.search,
          category: selectedCategory,
          searchQuery,
          sortBy,
          page: currentPage,
          itemsPerPage,
          scrollY: window.scrollY || document.documentElement.scrollTop || 0,
          timestamp: Date.now(),
        });
      }
      navigate(`/wallpaper/${encodeURIComponent(wp.id)}`);
    },
    [location.pathname, location.search, selectedCategory, searchQuery, sortBy, currentPage, itemsPerPage, navigate]
  );

  const handleBackToGallery = useCallback(() => {
    const saved = getGalleryNavigationState();
    if (hasNavigatedInAppRef.current || (typeof window !== 'undefined' && window.history.length > 2)) {
      navigate(-1);
    } else if (saved && saved.pathname) {
      navigate(`${saved.pathname}${saved.search || ''}`);
    } else if (activeWallpaper && isMobileWallpaper(activeWallpaper)) {
      navigate('/mobile');
    } else {
      navigate('/');
    }
  }, [navigate, activeWallpaper]);

  // Compute total pages and boundary guard
  const totalPages = Math.max(1, Math.ceil(filteredDesktopWallpapers.length / itemsPerPage));

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Page change handler with URL sync and browser history
  const handlePageChange = useCallback(
    (newPage: number) => {
      setCurrentPage(newPage);
      const params = new URLSearchParams(location.search);
      if (newPage > 1) {
        params.set('page', String(newPage));
      } else {
        params.delete('page');
      }
      if (itemsPerPage !== 24) {
        params.set('limit', String(itemsPerPage));
      } else {
        params.delete('limit');
      }
      const newQuery = params.toString();
      navigate(`${location.pathname}${newQuery ? `?${newQuery}` : ''}${location.hash}`, {
        replace: false,
      });
    },
    [location.pathname, location.search, location.hash, itemsPerPage, navigate]
  );

  // Items per page change handler with URL sync
  const handleItemsPerPageChange = useCallback(
    (newLimit: number) => {
      setItemsPerPage(newLimit);
      setCurrentPage(1);
      const params = new URLSearchParams(location.search);
      params.delete('page');
      if (newLimit !== 24) {
        params.set('limit', String(newLimit));
      } else {
        params.delete('limit');
      }
      const newQuery = params.toString();
      navigate(`${location.pathname}${newQuery ? `?${newQuery}` : ''}${location.hash}`, {
        replace: false,
      });
    },
    [location.pathname, location.search, location.hash, navigate]
  );

  // Strict DOM recycling: Only the active page's items are passed to the DOM,
  // completely unmounting off-screen DOM nodes and releasing video decoder resources
  const displayedDesktopWallpapers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredDesktopWallpapers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredDesktopWallpapers, currentPage, itemsPerPage]);

  // Admin bulk and management actions
  const handleAddWallpapers = useCallback((newItems: Wallpaper[]) => {
    setWallpapers((prev) => [...newItems, ...prev]);
  }, []);

  const handleUpdateWallpaper = useCallback((updated: Wallpaper) => {
    setWallpapers((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
  }, []);

  const handleDeleteWallpaper = useCallback(async (id: string) => {
    // 1. Immediately synchronize React state so UI updates instantly
    setWallpapers((prev) => prev.filter((w) => w.id !== id));

    // Also clean up favorites and download history if this wallpaper was present
    setCurrentUser((prevUser) => {
      if (!prevUser) return prevUser;
      const hasFav = prevUser.favorites.includes(id);
      const hasHist = prevUser.downloadHistory.some((d) => d.wallpaperId === id);
      if (!hasFav && !hasHist) return prevUser;
      return {
        ...prevUser,
        favorites: prevUser.favorites.filter((fid) => fid !== id),
        downloadHistory: prevUser.downloadHistory.filter((d) => d.wallpaperId !== id),
      };
    });

    setGuestFavorites((prev) => prev.filter((fid) => fid !== id));

    // 2. Commit permanent deletion to IndexedDB and mark in deleted store
    return permanentlyDeleteWallpaperFromIndexedDB(id);
  }, []);

  const handleResetDefaults = useCallback(() => {
    clearAllDeletedWallpaperIds();
    setWallpapers(INITIAL_WALLPAPERS);
    try {
      localStorage.removeItem(STORAGE_KEYS.WALLPAPERS);
    } catch {
      // ignore
    }
    clearAllCustomWallpapersInIndexedDB().catch(() => {});
  }, []);

  // Admin blog management actions
  const handleAddBlogPost = useCallback((newPost: BlogPost) => {
    setBlogPosts((prev) => [newPost, ...prev]);
  }, []);

  const handleUpdateBlogPost = useCallback((updatedPost: BlogPost) => {
    setBlogPosts((prev) => prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)));
  }, []);

  const handleDeleteBlogPost = useCallback(async (id: string) => {
    // 1. Immediately synchronize React state so UI updates instantly
    setBlogPosts((prev) => prev.filter((p) => p.id !== id));

    // 2. Commit permanent deletion to IndexedDB and mark in deleted articles store / localStorage
    return permanentlyDeleteBlogPostFromIndexedDB(id);
  }, []);

  const t = translations[lang];

  return (
    <div className="min-h-screen bg-[#101010] text-[#E2E8F0] flex flex-col selection:bg-cyan-500/25 selection:text-cyan-300">
      {/* 1. Public Header (Strictly NO admin links) */}
      <Header
        currentCategory={selectedCategory}
        onSelectCategory={handleSelectCategory}
        lang={lang}
        onToggleLanguage={toggleLanguage}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        currentUser={currentUser}
        favoritesCount={activeFavorites.length}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenProfileModal={() => {
          if (currentUser) setIsProfileModalOpen(true);
          else setIsAuthModalOpen(true);
        }}
        onOpenFavorites={() => {
          if (currentUser) {
            setIsProfileModalOpen(true);
          } else if (guestFavorites.length > 0) {
            setSearchQuery('');
            setSelectedCategory('All');
            navigate('/');
          } else {
            setIsAuthModalOpen(true);
          }
        }}
        onOpenLegalModal={(type) => setLegalModalType(type)}
      />

      {/* 2. Main View Switcher: Dedicated 4K Details Page vs Blog vs Wallpaper Gallery */}
      {activeWallpaperId ? (
        <main className="flex-1">
          <ErrorBoundary isSection fallbackTitle={lang === 'ar' ? 'صفحة تفاصيل الخلفية' : 'Wallpaper Details Studio'}>
            <WallpaperDetailsPage
              key={activeWallpaperId}
              wallpaper={activeWallpaper}
              allWallpapers={wallpapers}
              lang={lang}
              isFavorited={activeWallpaper ? activeFavorites.includes(activeWallpaper.id) : false}
              onToggleFavorite={handleToggleFavorite}
              onRecordDownload={handleRecordDownload}
              onBackToGallery={handleBackToGallery}
              onSelectWallpaper={handleOpenWallpaperDetails}
              onSelectTag={(tag) => {
                setSearchQuery(tag);
                setSelectedCategory('All');
                setCurrentPage(1);
                navigate('/');
              }}
              onSelectCategory={(cat) => {
                setSelectedCategory(cat);
                setCurrentPage(1);
                if (cat === 'Mobile' || (cat as string) === 'MobileLive') {
                  navigate('/mobile');
                } else {
                  navigate('/');
                }
              }}
            />
          </ErrorBoundary>
        </main>
      ) : selectedCategory === 'Blog' || location.pathname === '/blog' ? (
        <main className="flex-1">
          <ErrorBoundary isSection fallbackTitle={lang === 'ar' ? 'مدونة ديسك سبيس' : 'DeskSpace Journal'}>
            <BlogSection
              posts={blogPosts}
              lang={lang}
              onOpenDownloadModal={(wp) => handleOpenWallpaperDetails(wp)}
              wallpapers={desktopWallpapers}
              currentUser={currentUser}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
              onBackToWallpapers={() => {
                setSelectedCategory('All');
                navigate('/');
              }}
            />
          </ErrorBoundary>
        </main>
      ) : selectedCategory === 'MobileLive' || location.pathname === '/mobile' || location.pathname === '/mobile-live' ? (
        <main className="flex-1">
          <ErrorBoundary isSection fallbackTitle={lang === 'ar' ? 'قسم خلفيات الهاتف الحية' : 'Mobile Live Wallpapers'}>
            <MobileLiveSection
              wallpapers={mobileWallpapers}
              lang={lang}
              activeFavorites={activeFavorites}
              onToggleFavorite={handleToggleFavorite}
              onOpenDownloadModal={(wp) => setDownloadModalWallpaper(wp)}
              onOpenDetails={(wp) => handleOpenWallpaperDetails(wp)}
              onBackToDesktop={() => {
                setSelectedCategory('All');
                navigate('/');
              }}
            />
          </ErrorBoundary>
        </main>
      ) : (
        <>
          {/* Hero Section */}
          <HeroSection
            lang={lang}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSelectTag={(tag) => setSearchQuery(tag)}
            onSelectCategory={(cat) => {
              setSelectedCategory(cat);
              if (location.pathname !== '/') navigate('/');
            }}
            onOpenBlog={() => {
              setSelectedCategory('Blog');
              navigate('/blog');
            }}
          />

          {/* Main Desktop Wallpaper Gallery (STRICTLY 16:9 - ALL Mobile Wallpapers Excluded) */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div id="wallpaper-gallery-top" ref={galleryTopRef} className="scroll-mt-28" />
            {/* Controls Toolbar: Active category label, result count, and sort pills */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-[#20222B]">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>
                    {selectedCategory === 'All'
                      ? t.navAll
                      : selectedCategory === 'Live'
                      ? t.navLive
                      : t.categories[selectedCategory as Category] || selectedCategory}
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#181920] border border-[#272935] text-cyan-400 font-mono font-semibold">
                    {filteredDesktopWallpapers.length}
                  </span>
                </h2>
                <p className="text-xs text-neutral-400 mt-1">
                  {filteredDesktopWallpapers.length} {t.wallpapersFound}
                  {searchQuery && (
                    <span>
                      {' '}
                      matching &ldquo;<span className="text-cyan-400">{searchQuery}</span>&rdquo;
                    </span>
                  )}
                </p>
              </div>

              {/* Sort Segments */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-neutral-400 hidden sm:inline">
                  {t.sortBy}:
                </span>
                <div className="flex items-center p-1 bg-[#17181F] rounded-xl border border-[#262835] text-xs">
                  <button
                    type="button"
                    onClick={() => setSortBy('popular')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                      sortBy === 'popular'
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>{t.sortPopular}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSortBy('latest')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                      sortBy === 'latest'
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>{t.sortLatest}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSortBy('favorites')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                      sortBy === 'favorites'
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Heart className="w-3.5 h-3.5" />
                    <span>{t.sortFavorites}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Desktop Wallpaper Grid */}
            {filteredDesktopWallpapers.length === 0 ? (
              <div className="py-20 text-center rounded-2xl bg-[#14151B] border border-[#232532] p-8 max-w-md mx-auto">
                <Search className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-white mb-1">
                  {t.noWallpapersFound}
                </h3>
                <p className="text-xs text-neutral-400 mb-4">
                  Try adjusting your search terms or clearing the current category filters.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-md transition-colors cursor-pointer"
                >
                  {t.clearFilters}
                </button>
              </div>
            ) : (
              <>
                <ErrorBoundary isSection fallbackTitle={lang === 'ar' ? 'معرض خلفيات سطح المكتب' : 'Desktop 4K Wallpaper Gallery'}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
                    {displayedDesktopWallpapers.map((wallpaper) => (
                      <WallpaperCard
                        key={wallpaper.id}
                        wallpaper={wallpaper}
                        lang={lang}
                        isFavorited={activeFavorites.includes(wallpaper.id)}
                        onToggleFavorite={handleToggleFavorite}
                        onOpenDownloadModal={(wp) => setDownloadModalWallpaper(wp)}
                        onOpenDetails={handleOpenWallpaperDetails}
                      />
                    ))}
                  </div>
                </ErrorBoundary>

                {/* Traditional High-Performance Pagination Bar */}
                {filteredDesktopWallpapers.length > 0 && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={filteredDesktopWallpapers.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={handlePageChange}
                    onItemsPerPageChange={handleItemsPerPageChange}
                    lang={lang}
                    variant="cyan"
                    scrollTargetRef={galleryTopRef}
                  />
                )}
              </>
            )}

            {/* Seamless Journal Spotlight at bottom of gallery */}
            <div className="mt-16 pt-8 border-t border-[#1F212C]">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold mb-2">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{t.blogTitle}</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    {lang === 'ar' ? 'مقالات وأدلة تقنية لتنسيق شاشتك' : 'Guides & Optics for Your Battlestation'}
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1 max-w-xl">
                    {lang === 'ar'
                      ? 'اقرأ تحليلات مفصلة حول كيفية تحقيق أقصى استفادة من شاشات 4K و OLED، وضبط الألوان، وتحسين الخلفيات المتحركة.'
                      : 'In-depth articles covering 4K subpixels, OLED infinite contrast, and hardware decoding for 60 FPS live wallpapers.'}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setSelectedCategory('Blog');
                    navigate('/blog');
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#181922] hover:bg-[#202230] border border-[#2B2E40] text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors shrink-0 cursor-pointer"
                >
                  <span>{lang === 'ar' ? 'استكشف المدونة بالكامل' : 'Explore All Articles'}</span>
                  {lang === 'ar' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {blogPosts.slice(0, 3).map((post) => (
                  <div
                    key={post.id}
                    onClick={() => {
                      setSelectedCategory('Blog');
                      navigate('/blog');
                    }}
                    className="group p-4 rounded-2xl bg-[#14151C] hover:bg-[#181922] border border-[#232534] hover:border-cyan-500/40 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="aspect-video w-full rounded-xl overflow-hidden mb-3 bg-black/40">
                        <img
                          src={post.coverImage}
                          alt={post.title[lang] || post.title.en}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#1C1E2A] text-cyan-400 border border-cyan-500/20 uppercase tracking-wider">
                        {post.category}
                      </span>
                      <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors mt-2 line-clamp-2 leading-snug">
                        {post.title[lang] || post.title.en}
                      </h4>
                      <p className="text-xs text-neutral-400 mt-1.5 line-clamp-2">
                        {post.excerpt[lang] || post.excerpt.en}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#1E202B] flex items-center justify-between text-[11px] text-neutral-400">
                      <span>{post.readTimeMinutes || 6} min read</span>
                      <span className="text-cyan-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                        {lang === 'ar' ? 'قراءة المقال ←' : 'Read Article →'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </>
      )}

      {/* 3. Global Footer */}
      <Footer
        lang={lang}
        onOpenLegalModal={(type) => setLegalModalType(type)}
        onOpenBlog={() => {
          setSelectedCategory('Blog');
          navigate('/blog');
        }}
      />

      {/* 4. Modals */}
      <DownloadModal
        isOpen={Boolean(downloadModalWallpaper)}
        onClose={() => setDownloadModalWallpaper(null)}
        wallpaper={downloadModalWallpaper}
        lang={lang}
        isFavorited={
          downloadModalWallpaper ? activeFavorites.includes(downloadModalWallpaper.id) : false
        }
        onToggleFavorite={handleToggleFavorite}
        onRecordDownload={handleRecordDownload}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        lang={lang}
        onLoginSuccess={(user) => setCurrentUser(user)}
      />

      {currentUser && (
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          lang={lang}
          user={currentUser}
          wallpapers={wallpapers}
          onSignOut={() => setCurrentUser(null)}
          onRemoveFavorite={handleToggleFavorite}
          onOpenDownloadModal={(wp) => setDownloadModalWallpaper(wp)}
        />
      )}

      {/* Protected Secret Admin Modal with Desktop Password verification (Code-Split for 0% Visitor Bundle Overhead) */}
      {isAdminModalOpen && (
        <React.Suspense fallback={null}>
          <SecretAdminModal
            isOpen={isAdminModalOpen}
            onClose={handleCloseAdmin}
            lang={lang}
            wallpapers={wallpapers}
            onAddWallpapers={handleAddWallpapers}
            onUpdateWallpaper={handleUpdateWallpaper}
            onDeleteWallpaper={handleDeleteWallpaper}
            onResetDefaults={handleResetDefaults}
            totalDownloads={wallpapers.reduce((sum, w) => sum + w.downloads, 0)}
            totalUsers={currentUser ? 1 : 0}
            blogPosts={blogPosts}
            onAddBlogPost={handleAddBlogPost}
            onUpdateBlogPost={handleUpdateBlogPost}
            onDeleteBlogPost={handleDeleteBlogPost}
          />
        </React.Suspense>
      )}

      <LegalModals
        type={legalModalType}
        onClose={() => setLegalModalType(null)}
        lang={lang}
      />
    </div>
  );
}
