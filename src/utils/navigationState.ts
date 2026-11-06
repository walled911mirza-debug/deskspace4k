import { Category } from '../types';

export interface GalleryBrowsingContext {
  pathname: string;
  search: string;
  category: Category | 'All' | 'Live' | 'MobileLive' | 'Blog';
  searchQuery: string;
  sortBy: 'latest' | 'popular' | 'favorites';
  page: number;
  itemsPerPage: number;
  scrollY: number;
  timestamp: number;
}

const STORAGE_KEY = 'deskspace4k_gallery_nav_context_v2';

/**
 * Persists the user's active browsing context (path, filters, search, page, scroll position)
 * before navigating away to a wallpaper detail view.
 */
export function saveGalleryNavigationState(context: GalleryBrowsingContext): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(context));
  } catch (err) {
    console.warn('Failed to save gallery navigation state to sessionStorage:', err);
  }
}

/**
 * Retrieves the persisted browsing context when returning to the gallery.
 */
export function getGalleryNavigationState(): GalleryBrowsingContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed as GalleryBrowsingContext;
  } catch {
    return null;
  }
}

/**
 * Clears the persisted browsing context (e.g. upon deliberate category reset).
 */
export function clearGalleryNavigationState(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Seamlessly restores the previous scroll position using multi-pass requestAnimationFrame,
 * DOM layout height verification, and fallback timers so the browser never defaults to (0, 0).
 */
export function restoreGalleryScroll(targetY: number): void {
  if (typeof window === 'undefined' || isNaN(targetY) || targetY <= 0) return;

  // Set history scrollRestoration to manual to prevent browser conflicts
  try {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  } catch {
    // ignore
  }

  const performScroll = () => {
    window.scrollTo({ top: targetY, behavior: 'instant' });
  };

  // Immediate attempt
  performScroll();

  // Multi-stage verification to account for card rendering and layout settlement
  requestAnimationFrame(() => {
    performScroll();

    const delays = [30, 80, 160, 280, 450, 700];
    delays.forEach((delay) => {
      setTimeout(() => {
        const currentScroll = window.scrollY || document.documentElement.scrollTop || 0;
        const maxScroll = Math.max(
          0,
          document.documentElement.scrollHeight - window.innerHeight
        );
        // Only retry if we haven't reached target or if DOM expanded
        if (Math.abs(currentScroll - targetY) > 5 && maxScroll >= targetY * 0.7) {
          performScroll();
        }
      }, delay);
    });
  });
}
