import React, { useState } from 'react';
import {
  X,
  Heart,
  History,
  Download,
  Trash2,
  Calendar,
  Sparkles,
  LogOut,
  ExternalLink
} from 'lucide-react';
import { User, Wallpaper, Language } from '../types';
import { translations } from '../translations';
import { getCategoryFallback, DEFAULT_FALLBACK_IMAGE } from '../utils/mediaUtils';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  wallpapers: Wallpaper[];
  lang: Language;
  onOpenDownloadModal: (wallpaper: Wallpaper) => void;
  onRemoveFavorite: (id: string) => void;
  onSignOut: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  wallpapers,
  lang,
  onOpenDownloadModal,
  onRemoveFavorite,
  onSignOut,
}) => {
  const [activeTab, setActiveTab] = useState<'favorites' | 'history'>('favorites');

  if (!isOpen) return null;

  const t = translations[lang];

  // Resolve favorites to actual wallpaper items
  const favoriteWallpapers = wallpapers.filter((w) => user.favorites.includes(w.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
      <div
        className="relative w-full max-w-4xl max-h-[88vh] bg-[#15161A] border border-[#262835] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-neutral-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with User Info */}
        <div className="p-5 sm:p-6 bg-[#111216] border-b border-[#242633] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-purple-600 p-0.5 shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full rounded-[14px] bg-[#13141A] flex items-center justify-center text-white font-bold text-xl uppercase">
                {user.username.slice(0, 2)}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  {user.username}
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  Member
                </span>
              </div>
              <p className="text-xs text-neutral-400">{user.email}</p>
              <div className="flex items-center gap-2 text-[11px] text-neutral-500 mt-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {t.memberSince}: {new Date(user.joinedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onSignOut();
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1F212A] hover:bg-rose-950/40 border border-[#2B2E3D] hover:border-rose-500/40 text-neutral-400 hover:text-rose-400 text-xs font-medium transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>{t.navSignOut}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[#1F212A] border border-[#2B2E3D] text-neutral-400 hover:text-white transition-colors"
              aria-label={t.close}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Strip */}
        <div className="flex items-center px-6 border-b border-[#242633] bg-[#131418]">
          <button
            onClick={() => setActiveTab('favorites')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'favorites'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Heart className="w-4 h-4" />
            <span>{t.tabFavorites}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-[#20222C] text-[10px] text-neutral-300">
              {favoriteWallpapers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'history'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span>{t.tabHistory}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-[#20222C] text-[10px] text-neutral-300">
              {user.downloadHistory.length}
            </span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-[#16171B]">
          {activeTab === 'favorites' ? (
            favoriteWallpapers.length === 0 ? (
              <div className="py-16 text-center text-neutral-500">
                <Heart className="w-12 h-12 mx-auto mb-3 stroke-[1.2] text-neutral-600" />
                <p className="text-sm font-medium">{t.noFavoritesYet}</p>
                <p className="text-xs text-neutral-600 mt-1">
                  Click the heart icon on any wallpaper card to save it here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {favoriteWallpapers.map((wp) => (
                  <div
                    key={wp.id}
                    className="group relative rounded-xl bg-[#1C1E26] border border-[#2B2F40] overflow-hidden flex flex-col justify-between shadow-md"
                  >
                    <div className="relative aspect-video overflow-hidden bg-black/40">
                      <img
                        src={wp.thumbnailUrl || wp.posterUrl || wp.url || getCategoryFallback(wp.category)}
                        alt={wp.title[lang] || wp.title.en}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = getCategoryFallback(wp.category);
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <button
                        onClick={() => onRemoveFavorite(wp.id)}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-rose-900/80 text-rose-400 hover:text-rose-200 transition-colors"
                        title={t.removeFromFavorites}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="p-3">
                      <h4 className="text-xs font-semibold text-white truncate">
                        {wp.title[lang] || wp.title.en}
                      </h4>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#252837] text-[11px] text-neutral-400">
                        <span className="font-mono text-cyan-400">{wp.resolution}</span>
                        <button
                          onClick={() => {
                            onClose();
                            onOpenDownloadModal(wp);
                          }}
                          className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-medium"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{t.download4K}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : user.downloadHistory.length === 0 ? (
            <div className="py-16 text-center text-neutral-500">
              <History className="w-12 h-12 mx-auto mb-3 stroke-[1.2] text-neutral-600" />
              <p className="text-sm font-medium">{t.noHistoryYet}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {user.downloadHistory.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#1C1E26] border border-[#2A2E3E] gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={item.wallpaperUrl || DEFAULT_FALLBACK_IMAGE}
                      alt={item.wallpaperTitle}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_FALLBACK_IMAGE;
                      }}
                      className="w-16 h-10 object-cover rounded-lg shrink-0 border border-neutral-700/50"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">
                        {item.wallpaperTitle}
                      </div>
                      <div className="text-[11px] text-neutral-400 flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-cyan-400">{item.resolution}</span>
                        <span>·</span>
                        <span>
                          {t.downloadedOn}{' '}
                          {new Date(item.downloadedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      const matched = wallpapers.find((w) => w.id === item.wallpaperId);
                      if (matched) {
                        onClose();
                        onOpenDownloadModal(matched);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-medium shrink-0 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{t.reDownload}</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
