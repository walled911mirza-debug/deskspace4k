import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw, Home, Trash2 } from 'lucide-react';
import { resetAllStorageAndReload } from '../utils/storageManager';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  isSection?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('DeskSpace4K ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetStorage = () => {
    resetAllStorageAndReload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleRetrySection = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.isSection) {
        return (
          <div className="w-full my-8 p-6 rounded-3xl bg-[#14151E] border border-rose-500/30 text-center max-w-lg mx-auto space-y-4 shadow-xl">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">
                {this.props.fallbackTitle || 'Component Safety Mode'}
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                An isolated issue occurred in this section. The rest of the application is operating smoothly.
              </p>
            </div>
            <button
              type="button"
              onClick={this.handleRetrySection}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs cursor-pointer shadow-lg shadow-cyan-500/20 transition-all"
            >
              Retry Section
            </button>
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-[#0D0E12] text-white flex items-center justify-center p-6 selection:bg-cyan-500/30">
          <div className="max-w-md w-full bg-[#161822] border border-[#2B2F44] rounded-2xl p-6 shadow-2xl text-center space-y-5">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertOctagon className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-black tracking-tight text-white">
                تم استعادة التطبيق بنجاح
              </h1>
              <p className="text-xs text-neutral-400 leading-relaxed">
                حدث خطأ غير متوقع أثناء معالجة البيانات أو قراءة الذاكرة المؤقتة. تم تفعيل نظام الحماية لمنع توقف التطبيق.
              </p>
              <p className="text-[11px] text-neutral-500 font-mono">
                An unexpected error occurred. Protection mode has been activated to prevent white-screen crashes.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 rounded-xl bg-[#0F1016] border border-[#262A3C] text-[11px] font-mono text-rose-300 text-left overflow-x-auto max-h-24">
                {this.state.error.message}
              </div>
            )}

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>إعادة تحميل التطبيق (Reload App)</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetStorage}
                className="w-full py-2.5 px-4 rounded-xl bg-[#202436] hover:bg-[#2A3047] text-neutral-300 hover:text-white font-medium text-xs flex items-center justify-center gap-2 cursor-pointer border border-[#303750] transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>إصلاح الذاكرة ومسح التخزين المؤقت (Reset Storage)</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full py-2.5 px-4 rounded-xl bg-transparent hover:bg-white/5 text-neutral-400 hover:text-white font-medium text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Home className="w-3.5 h-3.5" />
                <span>العودة إلى الصفحة الرئيسية (Return Home)</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
