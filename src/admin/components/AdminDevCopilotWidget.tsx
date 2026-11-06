import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  X,
  Minimize2,
  Maximize2,
  RotateCcw,
  Copy,
  Check,
  Code2,
  Lightbulb,
  Terminal,
  Zap,
  ChevronDown,
} from 'lucide-react';
import { adminAiClient } from '../ai/aiWorkerClient';
import { Language } from '../../types';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  source?: string;
}

interface AdminDevCopilotWidgetProps {
  lang: Language;
  totalWallpapers: number;
  totalBlogPosts: number;
  categories: string[];
}

const PRESET_PROMPTS = [
  { icon: '💡', text: 'Curate new 4K battlestation features' },
  { icon: '⚡', text: 'Optimize 60 FPS video decoding' },
  { icon: '🎨', text: 'Tailwind dark neon styling tips' },
  { icon: '📦', text: 'IndexedDB pagination & caching snippet' },
  { icon: '🏷️', text: 'High-CTR tags for 4K Anime wallpapers' },
];

export const AdminDevCopilotWidget: React.FC<AdminDevCopilotWidgetProps> = ({
  lang,
  totalWallpapers,
  totalBlogPosts,
  categories,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDocked, setIsDocked] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [messages, setMessages] = useState<Message[]>(() => {
    return [
      {
        id: 'welcome',
        role: 'model',
        text: `### 🤖 Welcome to DeskSpace4K Dev Copilot!\n\nI am your dedicated AI software development assistant. I can help you with:\n- **React & TypeScript:** Code snippets, custom hooks, and state management.\n- **Tailwind CSS:** Layout polish, dark neon battlestation themes, and responsive design.\n- **Performance:** 60 FPS video previews, hardware acceleration, and IndexedDB caching.\n- **Curation:** Automated metadata, tag generation, and blog ideas.\n\nType a request below or pick a quick topic to start!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'gemini-3.8-flash',
      },
    ];
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized]);

  const handleCopyCode = (codeText: string, blockId: string) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCodeId(blockId);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMsg: Message = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const historyPayload = messages.map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const contextPayload = {
        platform: 'DeskSpace4K',
        totalWallpapers,
        totalBlogPosts,
        categories,
        lang,
      };

      const result = await adminAiClient.chatCopilot({
        message: text,
        history: historyPayload,
        context: contextPayload,
      });

      const aiMsg: Message = {
        id: `msg_ai_${Date.now()}`,
        role: 'model',
        text: result?.reply || 'DeskSpace4K Dev Copilot: Request processed successfully.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: result?.source || 'gemini-3.8-flash',
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: `msg_err_${Date.now()}`,
        role: 'model',
        text: `### ⚠️ Copilot Notice\n\nCould not reach remote service. Here is an immediate local suggestion:\n\n*Review recent changes or verify network connectivity. All wallpaper metadata and IndexedDB operations continue to run smoothly in offline mode.*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'local_fallback',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `welcome_${Date.now()}`,
        role: 'model',
        text: `### 🔄 History Cleared\n\nReady for new queries. How can I assist your DeskSpace4K development right now?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'gemini-3.8-flash',
      },
    ]);
  };

  // Helper to render markdown content with syntax highlighting code blocks
  const renderMessageContent = (text: string, msgId: string) => {
    const codeBlockRegex = /```([a-zA-Z]*)\n([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    let blockIndex = 0;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <div key={`text_${lastIndex}`} className="whitespace-pre-wrap leading-relaxed">
            {renderInlineMarkdown(text.substring(lastIndex, match.index))}
          </div>
        );
      }

      const langCode = match[1] || 'code';
      const codeContent = match[2];
      const blockId = `${msgId}_code_${blockIndex++}`;

      parts.push(
        <div key={blockId} className="my-2.5 rounded-xl overflow-hidden border border-[#2D334A] bg-[#0C0D14]">
          <div className="flex items-center justify-between px-3 py-1.5 bg-[#141624] border-b border-[#25283B] text-[11px] font-mono text-cyan-400">
            <span className="flex items-center gap-1.5 font-bold uppercase">
              <Code2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>{langCode}</span>
            </span>
            <button
              type="button"
              onClick={() => handleCopyCode(codeContent, blockId)}
              className="flex items-center gap-1 text-[11px] text-neutral-300 hover:text-white transition-colors cursor-pointer"
            >
              {copiedCodeId === blockId ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-neutral-400" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-3 text-[11px] font-mono text-neutral-200 overflow-x-auto leading-relaxed selection:bg-cyan-500/30">
            <code>{codeContent}</code>
          </pre>
        </div>
      );

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(
        <div key={`text_${lastIndex}`} className="whitespace-pre-wrap leading-relaxed">
          {renderInlineMarkdown(text.substring(lastIndex))}
        </div>
      );
    }

    return parts;
  };

  const renderInlineMarkdown = (str: string) => {
    return str.split('\n').map((line, lIdx) => {
      if (line.startsWith('### ')) {
        return (
          <h4 key={lIdx} className="text-xs font-bold text-cyan-300 mt-2 mb-1 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>{line.replace('### ', '')}</span>
          </h4>
        );
      }
      if (line.startsWith('## ')) {
        return (
          <h3 key={lIdx} className="text-sm font-bold text-white mt-2.5 mb-1.5">
            {line.replace('## ', '')}
          </h3>
        );
      }
      if (line.startsWith('- ')) {
        return (
          <div key={lIdx} className="flex items-start gap-1.5 my-0.5 ml-1">
            <span className="text-cyan-400 font-bold">•</span>
            <span>{line.replace('- ', '')}</span>
          </div>
        );
      }
      return (
        <span key={lIdx}>
          {line}
          {lIdx < str.split('\n').length - 1 && <br />}
        </span>
      );
    });
  };

  return (
    <>
      {/* 1. Floating Launch Pill (When Closed) */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            type="button"
            onClick={() => {
              setIsOpen(true);
              setIsMinimized(false);
            }}
            className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-gradient-to-r from-[#17192A] via-[#1E1B38] to-[#17192A] border border-cyan-500/40 hover:border-cyan-400 text-white shadow-[0_0_25px_rgba(6,182,212,0.35)] hover:shadow-[0_0_35px_rgba(6,182,212,0.55)] transition-all transform hover:scale-105 active:scale-95 cursor-pointer group"
          >
            <div className="relative">
              <Bot className="w-5 h-5 text-cyan-400 group-hover:rotate-12 transition-transform" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-black tracking-wide text-white flex items-center gap-1.5">
                <span>Dev Copilot</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  AI
                </span>
              </span>
              <span className="text-[10px] text-neutral-400 font-mono">
                Gemini 3.8 Flash Assistant
              </span>
            </div>
          </button>
        </div>
      )}

      {/* 2. Floating / Docked Chat Window (When Open) */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 shadow-2xl flex flex-col ${
            isDocked
              ? 'top-0 right-0 bottom-0 w-96 md:w-[420px] rounded-l-3xl border-l border-y border-cyan-500/30 bg-[#0E1018]/95 backdrop-blur-2xl'
              : isMinimized
              ? 'bottom-6 right-6 w-80 rounded-2xl border border-cyan-500/40 bg-[#12141F] shadow-2xl'
              : 'bottom-6 right-6 w-[360px] sm:w-[420px] md:w-[460px] h-[580px] max-h-[85vh] rounded-3xl border border-cyan-500/40 bg-[#0E1018]/95 backdrop-blur-2xl'
          }`}
        >
          {/* Header Bar */}
          <div className="px-4 py-3 bg-[#131622] border-b border-[#23273D] flex items-center justify-between shrink-0 rounded-t-3xl">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center text-black shadow-md shadow-cyan-500/20">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>DeskSpace4K Dev Copilot</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </h3>
                <p className="text-[10px] text-cyan-400 font-mono">
                  Online · Gemini 3.8 Flash Engine
                </p>
              </div>
            </div>

            {/* Window Controls */}
            <div className="flex items-center gap-1 text-neutral-400">
              <button
                type="button"
                onClick={handleClearHistory}
                title="Reset conversation"
                className="p-1.5 rounded-lg hover:text-white hover:bg-[#1E2235] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setIsDocked(!isDocked)}
                title={isDocked ? 'Float window' : 'Dock to side'}
                className="p-1.5 rounded-lg hover:text-white hover:bg-[#1E2235] transition-colors cursor-pointer hidden md:inline-flex"
              >
                {isDocked ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? 'Expand' : 'Minimize'}
                className="p-1.5 rounded-lg hover:text-white hover:bg-[#1E2235] transition-colors cursor-pointer"
              >
                <ChevronDown
                  className={`w-4 h-4 transform transition-transform ${isMinimized ? 'rotate-180' : ''}`}
                />
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close Dev Copilot"
                className="p-1.5 rounded-lg hover:text-rose-400 hover:bg-[#1E2235] transition-colors cursor-pointer ml-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body & Messages (Hidden if minimized) */}
          {!isMinimized && (
            <>
              {/* Messages Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                {messages.map((m) => {
                  const isAi = m.role === 'model';
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isAi ? 'items-start' : 'items-end'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-neutral-500 font-mono">
                        <span>{isAi ? 'Dev Copilot' : 'Admin'}</span>
                        <span>•</span>
                        <span>{m.timestamp}</span>
                      </div>

                      <div
                        className={`max-w-[90%] p-3.5 rounded-2xl text-xs ${
                          isAi
                            ? 'bg-[#151826] border border-[#262B42] text-neutral-200 rounded-tl-sm'
                            : 'bg-cyan-600 text-black font-medium rounded-tr-sm shadow-md'
                        }`}
                      >
                        {isAi ? renderMessageContent(m.text, m.id) : <p>{m.text}</p>}
                      </div>
                    </div>
                  );
                })}

                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex items-center gap-2 p-3 rounded-2xl bg-[#151826] border border-cyan-500/30 text-cyan-300 text-xs w-fit animate-pulse">
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    <span>Dev Copilot is analyzing codebase context...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Preset Chips */}
              <div className="px-3 py-2 border-t border-[#1C2030] bg-[#0E1018] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {PRESET_PROMPTS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(p.text)}
                    disabled={isLoading}
                    className="shrink-0 px-2.5 py-1 rounded-lg bg-[#161825] hover:bg-[#202438] border border-[#2A2F48] hover:border-cyan-500/40 text-[11px] text-neutral-300 hover:text-white transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <span>{p.icon}</span>
                    <span>{p.text}</span>
                  </button>
                ))}
              </div>

              {/* Input Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="p-3 bg-[#131622] border-t border-[#23273D] flex items-center gap-2 rounded-b-3xl"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask for React code, Tailwind styling, or 4K features..."
                  disabled={isLoading}
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#0C0E16] border border-[#2B3047] focus:border-cyan-400 focus:outline-none text-xs text-white placeholder:text-neutral-500 disabled:opacity-50 transition-colors"
                />

                <button
                  type="submit"
                  disabled={isLoading || !inputMessage.trim()}
                  className="px-3.5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-cyan-500/20 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
};
