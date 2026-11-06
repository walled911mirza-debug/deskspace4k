import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Clock,
  Heart,
  MessageSquare,
  Share2,
  ArrowRight,
  ArrowLeft,
  X,
  Send,
  Sparkles,
  Download,
  Tag,
  CheckCircle2,
  User as UserIcon,
  PenTool,
} from 'lucide-react';
import { BlogPost, Language, Wallpaper, User } from '../types';
import { translations } from '../translations';
import { DeskSpaceLogo } from './DeskSpaceLogo';
import { DEFAULT_FALLBACK_IMAGE } from '../utils/mediaUtils';
import { AdSenseUnit } from './AdSenseUnit';

interface BlogSectionProps {
  posts: BlogPost[];
  lang: Language;
  onOpenDownloadModal: (wallpaper: Wallpaper) => void;
  wallpapers: Wallpaper[];
  currentUser: User | null;
  onOpenAuthModal: () => void;
  onBackToWallpapers?: () => void;
}

export const BlogSection: React.FC<BlogSectionProps> = ({
  posts,
  lang,
  onOpenDownloadModal,
  wallpapers,
  currentUser,
  onOpenAuthModal,
  onBackToWallpapers,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeArticle, setActiveArticle] = useState<BlogPost | null>(null);
  const [localPosts, setLocalPosts] = useState<BlogPost[]>(posts);
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [authorNameInput, setAuthorNameInput] = useState<string>('');
  const [commentSuccess, setCommentSuccess] = useState<boolean>(false);
  const [clappedArticles, setClappedArticles] = useState<string[]>([]);

  // Keep localPosts in sync with parent posts (e.g. when updated via Secret Admin)
  useEffect(() => {
    setLocalPosts(posts);
    if (activeArticle) {
      const refreshed = posts.find((p) => p.id === activeArticle.id);
      if (refreshed) {
        setActiveArticle(refreshed);
      } else {
        setActiveArticle(null);
      }
    }
  }, [posts]);

  const t = translations[lang];

  const uniqueCategories = Array.from(new Set(localPosts.map((p) => p.category)));
  const categories = ['All', ...uniqueCategories];

  const filteredPosts = localPosts.filter((post) => {
    if (selectedCategory === 'All') return true;
    return post.category === selectedCategory;
  });

  const featuredPost = localPosts[0];

  const handleClap = (postId: string) => {
    if (clappedArticles.includes(postId)) return;
    setClappedArticles((prev) => [...prev, postId]);
    setLocalPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, likes: p.likes + 1 } : p))
    );
    if (activeArticle && activeArticle.id === postId) {
      setActiveArticle({ ...activeArticle, likes: activeArticle.likes + 1 });
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeArticle || !newCommentText.trim()) return;

    const author =
      currentUser?.username ||
      authorNameInput.trim() ||
      (lang === 'ar' ? 'عاشق للشاشات' : 'Display Enthusiast');

    const newComment = {
      id: `comment_${Date.now()}`,
      author,
      content: newCommentText.trim(),
      createdAt: new Date().toISOString(),
    };

    const updatedComments = [newComment, ...activeArticle.comments];
    const updatedPost = { ...activeArticle, comments: updatedComments };

    setActiveArticle(updatedPost);
    setLocalPosts((prev) =>
      prev.map((p) => (p.id === activeArticle.id ? updatedPost : p))
    );

    setNewCommentText('');
    setCommentSuccess(true);
    setTimeout(() => setCommentSuccess(false), 3000);
  };

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Top back bar */}
      {onBackToWallpapers && (
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={onBackToWallpapers}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#171922] hover:bg-[#1E212E] border border-[#272B3C] text-xs font-semibold text-neutral-300 hover:text-white transition-colors cursor-pointer"
          >
            {lang === 'ar' ? <ArrowRight className="w-4 h-4 text-cyan-400" /> : <ArrowLeft className="w-4 h-4 text-cyan-400" />}
            <span>{t.blogBackToWallpapers}</span>
          </button>

          <span className="text-xs text-neutral-500 font-mono">
            {posts.length} {lang === 'ar' ? 'مقالات منسقة' : 'Curated Articles'}
          </span>
        </div>
      )}

      {/* Blog Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#20222B]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#181A24] border border-[#272B3C] text-xs text-cyan-400 font-semibold mb-3">
            <BookOpen className="w-3.5 h-3.5" />
            <span>{t.blogTitle}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            {t.blogTagline}
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-2xl mt-2 leading-relaxed">
            {t.blogSubtitle}
          </p>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20'
                  : 'bg-[#181920] text-neutral-400 hover:text-white hover:bg-[#20222C] border border-[#252835]'
              }`}
            >
              {cat === 'All'
                ? t.blogAllTopics
                : cat === 'Tech'
                ? (lang === 'ar' ? 'تقنية وشاشات ⚡' : 'Tech & Displays ⚡')
                : (lang === 'ar' ? 'أدلة وإرشادات 📖' : 'Guides & Setup 📖')}
            </button>
          ))}
        </div>
      </div>

      {/* Featured Hero Article (if All is selected) */}
      {selectedCategory === 'All' && featuredPost && (
        <div
          onClick={() => setActiveArticle(featuredPost)}
          className="my-8 group relative rounded-3xl bg-[#16171E] border border-[#272A3C] hover:border-cyan-500/50 shadow-2xl overflow-hidden cursor-pointer transition-all duration-300 grid grid-cols-1 lg:grid-cols-12"
        >
          <div className="lg:col-span-7 relative aspect-video lg:aspect-auto overflow-hidden bg-black/40">
            <img
              src={featuredPost.coverImage}
              alt={featuredPost.title[lang] || featuredPost.title.en}
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).src = DEFAULT_FALLBACK_IMAGE;
              }}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent lg:hidden" />
          </div>

          <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold uppercase tracking-wider text-[10px]">
                  Featured · {featuredPost.category}
                </span>
                <span className="text-neutral-500">·</span>
                <span className="text-neutral-400 flex items-center gap-1 font-mono text-[11px]">
                  <Clock className="w-3.5 h-3.5" />
                  {featuredPost.readTimeMinutes} {t.blogReadTime}
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-white group-hover:text-cyan-300 transition-colors leading-snug">
                {featuredPost.title[lang] || featuredPost.title.en}
              </h3>

              <p className="text-xs sm:text-sm text-neutral-400 line-clamp-3 leading-relaxed">
                {featuredPost.excerpt[lang] || featuredPost.excerpt.en}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-[#242738] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl overflow-hidden border border-cyan-500/40 bg-[#0E101A] flex items-center justify-center p-0.5 shrink-0 shadow-sm shadow-cyan-500/10">
                  <DeskSpaceLogo size={28} showText={false} />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{featuredPost.author.name}</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono">
                      {lang === 'ar' ? 'معتمد' : 'Editorial'}
                    </span>
                  </div>
                  <div className="text-[10px] text-neutral-400">
                    {featuredPost.author.role[lang] || featuredPost.author.role.en}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs font-bold text-cyan-400 group-hover:translate-x-1 transition-transform">
                <span>{t.blogReadMore}</span>
                {lang === 'ar' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Article Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {filteredPosts.map((post) => (
          <article
            key={post.id}
            onClick={() => setActiveArticle(post)}
            className="group relative rounded-2xl bg-[#16171E] border border-[#252838] hover:border-cyan-500/40 shadow-xl overflow-hidden cursor-pointer transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="relative aspect-video w-full overflow-hidden bg-black/40">
                <img
                  src={post.coverImage}
                  alt={post.title[lang] || post.title.en}
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = DEFAULT_FALLBACK_IMAGE;
                  }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3">
                  <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-md bg-black/75 backdrop-blur-md text-cyan-400 border border-cyan-500/30 uppercase tracking-wider">
                    {post.category}
                  </span>
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-center gap-2 text-[11px] text-neutral-400 mb-2">
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-cyan-400" />
                    {post.readTimeMinutes} {t.blogReadTime}
                  </span>
                  <span>·</span>
                  <span>{new Date(post.publishedAt).toLocaleDateString()}</span>
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-2 leading-snug">
                  {post.title[lang] || post.title.en}
                </h3>

                <p className="text-xs text-neutral-400 mt-2 line-clamp-2 leading-relaxed">
                  {post.excerpt[lang] || post.excerpt.en}
                </p>
              </div>
            </div>

            <div className="p-5 pt-0">
              <div className="pt-3 border-t border-[#232635] flex items-center justify-between text-xs text-neutral-400">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg overflow-hidden border border-cyan-500/30 bg-[#0E101A] flex items-center justify-center p-0.5 shrink-0">
                    <DeskSpaceLogo size={20} showText={false} />
                  </div>
                  <span className="text-[11px] font-medium text-neutral-300 truncate max-w-[120px]">
                    {post.author.name}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1 hover:text-rose-400 transition-colors">
                    <Heart className="w-3.5 h-3.5" />
                    <span className="font-mono">{post.likes}</span>
                  </span>
                  <span className="flex items-center gap-1 hover:text-cyan-400 transition-colors">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span className="font-mono">{post.comments.length}</span>
                  </span>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Non-Intrusive Sponsored Placement Break in Blog Feed */}
      <AdSenseUnit slot="article-break" lang={lang} />

      {/* FULL ARTICLE READER MODAL */}
      {activeArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md overflow-y-auto">
          <div
            className="relative w-full max-w-4xl max-h-[92vh] my-auto bg-[#14151B] border border-[#272A3C] rounded-3xl shadow-2xl overflow-y-auto text-neutral-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Close Button */}
            <button
              onClick={() => setActiveArticle(null)}
              className="absolute top-4 right-4 z-30 p-2.5 rounded-full bg-black/75 hover:bg-black border border-white/20 text-white transition-colors cursor-pointer"
              aria-label={t.close}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Article Hero Cover */}
            <div className="relative aspect-[21/9] w-full overflow-hidden bg-black/60">
              <img
                src={activeArticle.coverImage}
                alt={activeArticle.title[lang] || activeArticle.title.en}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = DEFAULT_FALLBACK_IMAGE;
                }}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#14151B] via-[#14151B]/40 to-transparent" />
            </div>

            {/* Article Content Area */}
            <div className="p-6 sm:p-10 -mt-16 relative z-10 space-y-6">
              {/* Category & Read Time */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-lg text-xs font-bold bg-cyan-500 text-black shadow-md shadow-cyan-500/20">
                  {activeArticle.category}
                </span>
                <span className="px-3 py-1 rounded-lg text-xs bg-[#1E202B] text-neutral-300 border border-[#2B2E40] font-mono flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  {activeArticle.readTimeMinutes} {t.blogReadTime}
                </span>
                <span className="text-xs text-neutral-400">
                  {new Date(activeArticle.publishedAt).toLocaleDateString()}
                </span>
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                {activeArticle.title[lang] || activeArticle.title.en}
              </h1>

              {/* Author Card */}
              <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#1A1C24] border border-[#282B3B]">
                <div className="w-12 h-12 rounded-2xl overflow-hidden border border-cyan-500/40 bg-[#0E101A] flex items-center justify-center p-1 shrink-0 shadow-md shadow-cyan-500/10">
                  <DeskSpaceLogo size={42} showText={false} />
                </div>
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{activeArticle.author.name}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                      {lang === 'ar' ? 'فريق التحرير الرسمي' : 'Official Editorial Team'}
                    </span>
                  </div>
                  <div className="text-xs text-neutral-400 mt-0.5">
                    {activeArticle.author.role[lang] || activeArticle.author.role.en}
                  </div>
                </div>
              </div>

              {/* Formatted Article Body */}
              <div className="prose prose-invert max-w-none text-sm sm:text-base leading-relaxed text-neutral-300 space-y-5 pt-4 border-t border-[#242738]">
                {(activeArticle.content[lang] || activeArticle.content.en)
                  .split('\n\n')
                  .map((paragraph, idx) => {
                    const renderInline = (str: string) => {
                      const parts = str.split(/(\*\*.*?\*\*|`.*?`)/g);
                      return parts.map((part, pIdx) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                          return (
                            <strong key={pIdx} className="text-white font-bold">
                              {part.slice(2, -2)}
                            </strong>
                          );
                        }
                        if (part.startsWith('`') && part.endsWith('`')) {
                          return (
                            <code key={pIdx} className="px-1.5 py-0.5 rounded bg-[#1C1E28] text-cyan-400 font-mono text-xs">
                              {part.slice(1, -1)}
                            </code>
                          );
                        }
                        return part;
                      });
                    };

                    if (paragraph.startsWith('### ')) {
                      return (
                        <h3 key={idx} className="text-lg sm:text-xl font-bold text-white pt-4 flex items-center gap-2">
                          <span className="w-1.5 h-4 rounded-full bg-cyan-400 inline-block" />
                          <span>{paragraph.replace('### ', '')}</span>
                        </h3>
                      );
                    }

                    if (paragraph.trim().startsWith('|')) {
                      const lines = paragraph.trim().split('\n').filter((l) => l.trim().length > 0);
                      if (lines.length >= 2) {
                        const parseRow = (line: string) =>
                          line
                            .split('|')
                            .map((c) => c.trim())
                            .filter((_, colIdx, arr) => colIdx > 0 && colIdx < arr.length - 1);
                        const headers = parseRow(lines[0]);
                        const bodyRows = lines.slice(2).map(parseRow);
                        return (
                          <div key={idx} className="my-6 overflow-x-auto rounded-xl border border-[#272B3C] bg-[#0E0F14]">
                            <table className="w-full text-left text-xs sm:text-sm">
                              <thead className="bg-[#181A24] border-b border-[#272B3C] text-cyan-400 font-bold">
                                <tr>
                                  {headers.map((h, hIdx) => (
                                    <th key={hIdx} className="px-4 py-3 font-semibold">{renderInline(h)}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#1F2230]">
                                {bodyRows.map((row, rIdx) => (
                                  <tr key={rIdx} className="hover:bg-[#161822] transition-colors">
                                    {row.map((cell, cIdx) => (
                                      <td key={cIdx} className="px-4 py-3 text-neutral-300">{renderInline(cell)}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      }
                    }

                    if (paragraph.startsWith('- ')) {
                      return (
                        <ul key={idx} className="list-disc list-inside space-y-1.5 text-neutral-300 text-sm">
                          {paragraph.split('\n').map((item, itemIdx) => (
                            <li key={itemIdx} className="leading-relaxed">
                              {renderInline(item.replace(/^[-\*]\s+/, ''))}
                            </li>
                          ))}
                        </ul>
                      );
                    }

                    if (/^\d+\.\s+/.test(paragraph)) {
                      return (
                        <ol key={idx} className="list-decimal list-inside space-y-1.5 text-neutral-300 text-sm">
                          {paragraph.split('\n').map((item, itemIdx) => (
                            <li key={itemIdx} className="leading-relaxed">
                              {renderInline(item.replace(/^\d+\.\s+/, ''))}
                            </li>
                          ))}
                        </ol>
                      );
                    }

                    return (
                      <p key={idx} className="leading-relaxed">
                        {renderInline(paragraph)}
                      </p>
                    );
                  })}
              </div>

              {/* SEO Tags */}
              <div className="flex flex-wrap items-center gap-2 pt-2 pb-2">
                <span className="text-xs text-neutral-400 flex items-center gap-1 font-mono">
                  <Tag className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{lang === 'ar' ? 'الوسوم (SEO Tags):' : 'SEO Tags:'}</span>
                </span>
                {activeArticle.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-lg bg-[#181922] border border-[#262838] text-[11px] font-mono text-neutral-300 hover:border-cyan-500/40 hover:text-cyan-300 transition-colors"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              {/* Related Wallpaper Spotlight */}
              {activeArticle.relatedWallpaperId && (
                (() => {
                  const relatedWp = wallpapers.find((w) => w.id === activeArticle.relatedWallpaperId);
                  if (!relatedWp) return null;
                  return (
                    <div className="mt-8 p-5 rounded-2xl bg-gradient-to-r from-[#171922] via-[#1E202C] to-[#171922] border border-[#2B2E42] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
                      <div className="flex items-center gap-4">
                        <img
                          src={relatedWp.url}
                          alt={relatedWp.title.en}
                          className="w-24 h-16 object-cover rounded-xl border border-cyan-500/30 shrink-0"
                        />
                        <div>
                          <div className="text-xs font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{t.blogRelatedWallpaper}</span>
                          </div>
                          <h4 className="text-sm font-bold text-white mt-0.5">
                            {relatedWp.title[lang] || relatedWp.title.en}
                          </h4>
                          <span className="text-[11px] font-mono text-neutral-400">
                            {relatedWp.resolution} UHD
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setActiveArticle(null);
                          onOpenDownloadModal(relatedWp);
                        }}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-black font-bold text-xs shadow-md shadow-cyan-500/20 flex items-center gap-2 shrink-0 cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>{t.blogGetWallpaper}</span>
                      </button>
                    </div>
                  );
                })()
              )}

              {/* Natural In-Article Reading Break: Non-Intrusive AdSlot */}
              <AdSenseUnit slot="article-break" lang={lang} />

              {/* Article Clap / Engagement Bar */}
              <div className="flex items-center justify-between py-4 border-y border-[#242738]">
                <button
                  type="button"
                  onClick={() => handleClap(activeArticle.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    clappedArticles.includes(activeArticle.id)
                      ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 scale-105'
                      : 'bg-[#1C1E28] hover:bg-[#252836] border border-[#2B2E40] text-neutral-300 hover:text-white'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${clappedArticles.includes(activeArticle.id) ? 'fill-current' : ''}`} />
                  <span>{t.blogClaps} ({activeArticle.likes})</span>
                </button>

                <div className="flex items-center gap-2 text-xs text-neutral-400">
                  <MessageSquare className="w-4 h-4 text-cyan-400" />
                  <span>{activeArticle.comments.length} {t.blogComments}</span>
                </div>
              </div>

              {/* Comments Section */}
              <div className="space-y-6 pt-2">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-cyan-400" />
                  <span>{t.blogComments} ({activeArticle.comments.length})</span>
                </h3>

                {commentSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Comment published successfully!</span>
                  </div>
                )}

                {/* Add Comment Form */}
                <form onSubmit={handleAddComment} className="p-4 rounded-2xl bg-[#1A1C24] border border-[#272A3B] space-y-3">
                  <div className="text-xs font-semibold text-neutral-300">
                    {t.blogAddComment}
                  </div>

                  {!currentUser && (
                    <input
                      type="text"
                      value={authorNameInput}
                      onChange={(e) => setAuthorNameInput(e.target.value)}
                      placeholder={lang === 'ar' ? 'اسمك الكريم (اختياري)' : 'Your Name (Optional)'}
                      className="w-full px-3 py-2 rounded-xl bg-[#121318] border border-[#2A2D3D] text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-cyan-500"
                    />
                  )}

                  <textarea
                    rows={3}
                    required
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder={t.blogCommentPlaceholder}
                    className="w-full px-3 py-2 rounded-xl bg-[#121318] border border-[#2A2D3D] text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-cyan-500"
                  />

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-neutral-500">
                      Markdown supported · Be courteous
                    </span>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{t.blogPostCommentBtn}</span>
                    </button>
                  </div>
                </form>

                {/* Comments List */}
                <div className="space-y-3">
                  {activeArticle.comments.map((c) => (
                    <div key={c.id} className="p-4 rounded-xl bg-[#171820] border border-[#242736] space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <UserIcon className="w-3.5 h-3.5 text-cyan-400" />
                          {c.author}
                        </span>
                        <span className="text-[10px] text-neutral-500 font-mono">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-300 leading-relaxed">
                        {c.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
