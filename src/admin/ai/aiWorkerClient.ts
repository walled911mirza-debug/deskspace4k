/**
 * Admin AI Worker Client
 * 
 * Manages the dedicated Web Worker for DeskSpace4K Admin AI operations.
 * Keeps all computational overhead, string manipulation, and async networking
 * off the main thread to ensure absolute 60 FPS smoothness.
 */

import { WorkerRequest, WorkerResponse } from '../workers/aiCopilot.worker';

export interface CopilotActionResult {
  actionType: 'GENERATE_ARTICLE' | 'BATCH_UPDATE_TAGS' | 'UPDATE_METADATA' | 'ASSIST_ANSWER';
  summaryEn: string;
  summaryAr: string;
  explanation?: string;
  articleData?: {
    titleEn: string;
    titleAr: string;
    slug: string;
    category: string;
    readTimeMinutes: number;
    excerptEn: string;
    excerptAr: string;
    contentEn: string;
    contentAr: string;
    tags: string[];
    suggestedCoverImage?: string;
  };
  tagUpdateData?: {
    targetCategory: string;
    tagsToAdd: string[];
    reasoningEn?: string;
    reasoningAr?: string;
  };
  metadataUpdateData?: {
    targetCategory: string;
    descEn?: string;
    descAr?: string;
    tagsToAdd?: string[];
    reasoningEn?: string;
    reasoningAr?: string;
  };
  answerMarkdown?: string;
}

class AdminAiWorkerClient {
  private worker: Worker | null = null;
  private pendingCallbacks = new Map<string, { resolve: (val: any) => void; reject: (err: any) => void; timeoutId: any }>();
  private isInitialized = false;

  private initWorker() {
    if (this.isInitialized && this.worker) return;

    if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker(
          new URL('../workers/aiCopilot.worker.ts', import.meta.url),
          { type: 'module' }
        );

        this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
          const { id, success, data, error } = event.data;
          const pending = this.pendingCallbacks.get(id);
          if (pending) {
            clearTimeout(pending.timeoutId);
            this.pendingCallbacks.delete(id);
            if (success) {
              pending.resolve(data);
            } else {
              pending.reject(new Error(error || 'Worker operation failed'));
            }
          }
        };

        this.worker.onerror = (err) => {
          console.warn('Admin AI Web Worker warning:', err);
        };

        this.isInitialized = true;
      } catch (e) {
        console.warn('Could not initialize Admin AI Web Worker; will use non-blocking microtasks:', e);
        this.worker = null;
      }
    }
  }

  private sendRequest<T>(type: WorkerRequest['type'], payload: any, timeoutMs = 12000): Promise<T> {
    this.initWorker();
    const id = `ai_req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingCallbacks.delete(id);
        reject(new Error(`Worker request timed out (${timeoutMs}ms)`));
      }, timeoutMs);

      this.pendingCallbacks.set(id, { resolve, reject, timeoutId });

      if (this.worker) {
        this.worker.postMessage({ id, type, payload });
      } else {
        // Direct non-blocking asynchronous fallback if Web Worker is not supported
        setTimeout(async () => {
          try {
            if (type === 'SUGGEST_METADATA') {
              const res = await fetch('/api/ai/suggest-wallpaper-metadata', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              });
              const json = await res.json();
              clearTimeout(timeoutId);
              this.pendingCallbacks.delete(id);
              resolve(json.data as T);
            } else if (type === 'GENERATE_ARTICLE') {
              const res = await fetch('/api/ai/generate-article', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              });
              const json = await res.json();
              clearTimeout(timeoutId);
              this.pendingCallbacks.delete(id);
              resolve(json.data as T);
            } else if (type === 'SUGGEST_BLOG_IMAGE') {
              const res = await fetch('/api/ai/suggest-blog-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              });
              const json = await res.json();
              clearTimeout(timeoutId);
              this.pendingCallbacks.delete(id);
              resolve(json.data as T);
            } else if (type === 'CHAT_COPILOT') {
              const res = await fetch('/api/ai/admin-copilot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              });
              const json = await res.json();
              clearTimeout(timeoutId);
              this.pendingCallbacks.delete(id);
              resolve(json.data as T);
            }
          } catch (err) {
            clearTimeout(timeoutId);
            this.pendingCallbacks.delete(id);
            reject(err);
          }
        }, 0);
      }
    });
  }

  /**
   * Request wallpaper metadata suggestion off-thread
   */
  public async suggestWallpaperMetadata(params: {
    category: string;
    mediaType: 'live' | 'static';
    resolution?: string;
    currentTitle?: string;
    currentTags?: string;
    lang?: string;
  }) {
    return this.sendRequest<{
      titleEn: string;
      titleAr: string;
      tags: string;
      descEn: string;
      descAr: string;
      source?: string;
    }>('SUGGEST_METADATA', params);
  }

  /**
   * Request article draft off-thread
   */
  public async generateArticleDraft(params: {
    topic: string;
    category: string;
    lang?: string;
  }) {
    return this.sendRequest<{
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
    }>('GENERATE_ARTICLE', params);
  }

  /**
   * Request blog image recommendation off-thread
   */
  public async suggestBlogImage(params: {
    title: string;
    category: string;
    tags?: string;
    candidates: any[];
  }) {
    return this.sendRequest<{
      matchedId?: string;
      matchedUrl?: string;
      matchedTitle?: string;
      reasoningEn?: string;
      reasoningAr?: string;
    }>('SUGGEST_BLOG_IMAGE', params);
  }

  /**
   * Dedicated Admin AI Development Co-Pilot Chat
   */
  public async chatCopilot(params: {
    message: string;
    history?: { role: 'user' | 'model'; text: string }[];
    context?: any;
  }) {
    return this.sendRequest<{
      reply: string;
      source: string;
    }>('CHAT_COPILOT', params);
  }

  /**
   * Execute natural language admin instruction via Copilot Action Endpoint
   */
  public async executeCopilotAction(params: {
    prompt: string;
    context?: any;
  }): Promise<CopilotActionResult> {
    try {
      const res = await fetch('/api/ai/copilot-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const json = await res.json();
      if (!json.success || !json.data) {
        throw new Error(json.error || 'Copilot action failed');
      }
      return json.data as CopilotActionResult;
    } catch (err) {
      console.warn('Direct copilot action network error:', err);
      throw err;
    }
  }

  /**
   * Terminate worker and clear callbacks when admin session ends
   */
  public terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingCallbacks.forEach(({ timeoutId }) => clearTimeout(timeoutId));
    this.pendingCallbacks.clear();
    this.isInitialized = false;
  }
}

export const adminAiClient = new AdminAiWorkerClient();
