import React, { useState } from 'react';
import { X, User, Mail, Lock, Sparkles, CheckCircle2 } from 'lucide-react';
import { Language, User as UserType } from '../types';
import { translations } from '../translations';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onLoginSuccess: (user: UserType) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  lang,
  onLoginSuccess,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const t = translations[lang];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const safeUsername = username.trim() || (email.split('@')[0] || 'WallpaperFan');
    const safeEmail = email.trim() || `${safeUsername.toLowerCase()}@deskspace4k.com`;

    const userObj: UserType = {
      id: `usr_${Date.now()}`,
      username: safeUsername,
      email: safeEmail,
      favorites: [],
      downloadHistory: [],
      joinedAt: new Date().toISOString(),
    };

    setMessage(mode === 'signin' ? t.authSuccessLogin : t.authSuccessRegister);

    setTimeout(() => {
      onLoginSuccess(userObj);
      setMessage(null);
      onClose();
    }, 600);
  };

  const handleDemoLogin = () => {
    const demoUser: UserType = {
      id: 'demo_user_4k',
      username: 'DeskEnthusiast',
      email: 'alex@deskspace4k.com',
      favorites: ['wp-space-nebula', 'wp-gaming-cyberpunk'],
      downloadHistory: [
        {
          id: 'dl_demo_1',
          wallpaperId: 'wp-space-nebula',
          wallpaperTitle: 'Cosmic Stellar Nebula & Deep Galaxies',
          wallpaperUrl: '/src/assets/images/wallpaper_space_nebula_1792241809155.jpg',
          resolution: '3840×2160',
          downloadedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        },
      ],
      joinedAt: '2026-01-15T09:00:00Z',
    };

    setMessage(t.authSuccessLogin);
    setTimeout(() => {
      onLoginSuccess(demoUser);
      setMessage(null);
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div
        className="relative w-full max-w-md bg-[#16171B] border border-[#272935] rounded-2xl shadow-2xl overflow-hidden p-6 text-neutral-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-neutral-400 hover:text-white bg-[#1E2028] hover:bg-[#282B37] transition-colors"
          aria-label={t.close}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            {mode === 'signin' ? t.authTitleSignIn : t.authTitleSignUp}
          </h2>
          <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto">
            {mode === 'signin' ? t.authSubSignIn : t.authSubSignUp}
          </p>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 p-1 mb-5 bg-[#101114] rounded-xl border border-[#232530]">
          <button
            type="button"
            onClick={() => setMode('signin')}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'signin'
                ? 'bg-[#222430] text-cyan-400 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            {t.loginAction}
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'signup'
                ? 'bg-[#222430] text-cyan-400 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            {t.registerAction}
          </button>
        </div>

        {message && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                {t.username}
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-neutral-500" />
                <input
                  type="text"
                  required
                  placeholder="e.g. NeoDesk4K"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#101114] border border-[#262835] text-white text-xs placeholder:text-neutral-600 focus:outline-none focus:border-cyan-500/80 transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              {t.email}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-neutral-500" />
              <input
                type="email"
                required
                placeholder="you@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#101114] border border-[#262835] text-white text-xs placeholder:text-neutral-600 focus:outline-none focus:border-cyan-500/80 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              {t.password}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-neutral-500" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#101114] border border-[#262835] text-white text-xs placeholder:text-neutral-600 focus:outline-none focus:border-cyan-500/80 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 mt-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs tracking-wide shadow-lg shadow-cyan-500/20 transition-all active:scale-[0.98] cursor-pointer"
          >
            {mode === 'signin' ? t.loginAction : t.registerAction}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-[#232532] flex flex-col gap-2">
          <button
            type="button"
            onClick={handleDemoLogin}
            className="w-full py-2.5 px-4 rounded-xl bg-[#1D202A] hover:bg-[#252836] border border-[#2B2F40] text-cyan-400 hover:text-cyan-300 font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t.demoLogin}</span>
          </button>

          <p className="text-center text-[11px] text-neutral-500">
            {mode === 'signin' ? t.dontHaveAccount : t.alreadyHaveAccount}{' '}
            <button
              type="button"
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
              className="text-cyan-400 hover:underline font-medium"
            >
              {mode === 'signin' ? t.registerAction : t.loginAction}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
