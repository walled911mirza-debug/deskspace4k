import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'deskspace4k_recent_searches_v1';
const MAX_RECENT = 8;

export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Fallback
    }
    return ['Cyberpunk', 'Space Nebula', 'Live Motion', 'Minimalist OLED'];
  });

  // Keep LocalStorage in sync whenever recentSearches changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recentSearches));
    } catch (e) {
      console.warn('Failed to persist recent searches to storage', e);
    }
  }, [recentSearches]);

  const addSearch = useCallback((rawTerm: string) => {
    const term = rawTerm.trim();
    if (!term || term.length < 2) return;

    setRecentSearches((prev) => {
      // Deduplicate case-insensitively
      const filtered = prev.filter((item) => item.toLowerCase() !== term.toLowerCase());
      const updated = [term, ...filtered].slice(0, MAX_RECENT);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  const removeSearch = useCallback((termToRemove: string) => {
    setRecentSearches((prev) => {
      const updated = prev.filter(
        (item) => item.toLowerCase() !== termToRemove.toLowerCase()
      );
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  const clearAllSearches = useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return {
    recentSearches,
    addSearch,
    removeSearch,
    clearAllSearches,
  };
}
