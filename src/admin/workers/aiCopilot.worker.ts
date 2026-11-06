/**
 * DeskSpace4K Admin AI Co-Pilot Dedicated Web Worker
 * 
 * Offloads all AI API network requests, JSON parsing, tag sanitation,
 * and text processing off the main browser UI thread to ensure
 * buttery 60 FPS responsiveness in the Admin Center.
 */

// Worker message interfaces
export interface WorkerRequest {
  id: string;
  type: 'SUGGEST_METADATA' | 'GENERATE_ARTICLE' | 'SUGGEST_BLOG_IMAGE' | 'CHAT_COPILOT' | 'PING';
  payload: any;
}

export interface WorkerResponse {
  id: string;
  type: string;
  success: boolean;
  data?: any;
  error?: string;
}

// Fallback heuristic for metadata generation
function localFallbackMetadata(category: string = 'Gaming', mediaType: string = 'static', currentTitle: string = '') {
  const isLive = mediaType === 'live' || mediaType === 'video';
  const presets: Record<string, { titleEn: string; titleAr: string; tags: string; descEn: string; descAr: string }> = {
    Gaming: {
      titleEn: currentTitle ? `${currentTitle} 4K` : (isLive ? 'Cyberpunk Horizon Battlestation 60FPS' : 'Cyberpunk Neon Cyberdeck 4K UHD'),
      titleAr: isLive ? 'محطة السايبربانك النيونية 60 إطاراً بدقة 4K' : 'منصة السايبربانك النيونية فائقة الدقة 4K',
      tags: 'Gaming, Cyberpunk, 4K Ultra HD, OLED Black, HDR, 60 FPS, Battlestation, Neon Glow',
      descEn: 'Ultra HD 4K wallpaper precision-engineered with high-contrast neon lighting and pitch blacks optimized for high-refresh gaming displays.',
      descAr: 'خلفية فائقة الدقة 4K تم تصميمها بدقة وإضاءات نيون متباينة وظلال عميقة مهيأة لشاشات الألعاب ومعدلات التحديث العالية.',
    },
    Anime: {
      titleEn: currentTitle ? `${currentTitle} 4K` : (isLive ? 'Ethereal Cherry Blossom Rain Live 4K' : 'Neo Kyoto Cyber Anime 4K UHD'),
      titleAr: isLive ? 'تساقط أزهار الكرز الأثيرية الحية 4K' : 'نيو كيوتو سايبر أنمي فائقة الدقة 4K',
      tags: 'Anime, 4K Ultra HD, Ethereal, Japanese Aesthetics, OLED HDR, Vibrant Colors, Desktop',
      descEn: 'Stunning 4K anime wallpaper rendered with cinematic atmospheric lighting and rich color palettes.',
      descAr: 'خلفية أنمي مذهلة بدقة 4K بجماليات سينمائية وتدرجات لونية غنية مستوحاة من الثقافة اليابانية المعاصرة.',
    },
    Space: {
      titleEn: currentTitle ? `${currentTitle} 4K` : (isLive ? 'Cosmic Nebulae Orbit Live 60FPS' : 'Interstellar Supernova Deep Space 4K'),
      titleAr: isLive ? 'مدار السدم الكونية الحي بدقة 4K' : 'سوبرنوفا الفضاء السحيق فائق الدقة 4K',
      tags: 'Space, Deep Space, Nebula, Galaxy, 4K Ultra HD, True OLED Black, Astronomy, Cosmic',
      descEn: 'Breathtaking 3840×2160 deep cosmos landscape harnessing infinite contrast and vibrant stellar dust.',
      descAr: 'مشهد كوني مذهل بدقة 3840×2160 يستعرض أعماق الفضاء بسواد كلي وتوهج سديمي أخاذ.',
    },
    Nature: {
      titleEn: currentTitle ? `${currentTitle} 4K` : (isLive ? 'Alpine Mist Morning Serenity 60FPS' : 'Nordic Fjord Crystal Waters 4K UHD'),
      titleAr: isLive ? 'ضباب جبال الألب الصباحي الحي بدقة 4K' : 'مضيق الشمال المائي فائق الدقة 4K',
      tags: 'Nature, Landscape, 4K Ultra HD, Serenity, Mountains, HDR, Ultra Realistic, Clean',
      descEn: 'Pristine 4K nature vista capturing raw natural beauty, crystal-clear water reflections, and calming tones.',
      descAr: 'مشهد طبيعي نقي بدقة 4K يجسد هدوء الطبيعة وانعكاسات المياه الصافية مع تدرجات لونية مريحة للعين.',
    },
    Cars: {
      titleEn: currentTitle ? `${currentTitle} 4K` : (isLive ? 'Midnight Hypercar Night Drive 60FPS' : 'Carbon Supercar Studio 4K UHD'),
      titleAr: isLive ? 'قيادة الهايبركار الليلية الحية 60 إطاراً' : 'استوديو السيارة الخارقة فائق الدقة 4K',
      tags: 'Cars, Automotive, Hypercar, 4K Ultra HD, Carbon Fiber, Dark Mode, Sleek, Precision',
      descEn: 'Sculpted automotive artistry in pristine 4K resolution, highlighting aerodynamism and aggressive carbon fiber curves.',
      descAr: 'تحفة ميكانيكية فائقة السرعة بدقة 4K تبرز الخطوط الديناميكية الهوائية وألياف الكربون المصقولة بدقة.',
    },
    Minimalist: {
      titleEn: currentTitle ? `${currentTitle} 4K` : (isLive ? 'Subtle Kinetic Gradients Live 4K' : 'Pure Obsidian Geometric Minimal 4K'),
      titleAr: isLive ? 'تدرجات حركية ناعمة حية 4K' : 'أشكال هندسية ناعمة فائقة الدقة 4K',
      tags: 'Minimalist, OLED Black, Clean, Geometry, 4K Ultra HD, Distraction Free, Modern Desk',
      descEn: 'Ultra-clean distraction-free wallpaper with zero clutter, mathematically balanced geometry, and 100% black pixels.',
      descAr: 'خلفية نظيفة وبسيطة خالية من التشتيت مع توازن هندسي مثالي وتوافق كامل مع شاشات الأوليد.',
    },
  };
  return presets[category] || presets.Gaming;
}

// Minimal timeout fetch helper inside worker
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { id, type, payload } = e.data;

  if (type === 'PING') {
    self.postMessage({ id, type, success: true, data: { status: 'alive' } });
    return;
  }

  if (type === 'SUGGEST_METADATA') {
    try {
      const { category, mediaType, resolution, currentTitle, currentTags, lang } = payload || {};
      
      // Minimal payload transmission to server
      const response = await fetchWithTimeout('/api/ai/suggest-wallpaper-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          mediaType,
          resolution,
          currentTitle: (currentTitle || '').trim().slice(0, 80),
          currentTags: (currentTags || '').trim().slice(0, 120),
          lang: lang || 'en',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const json = await response.json();
      const metaData = json.data || localFallbackMetadata(category, mediaType, currentTitle);

      // Clean and sanitize off-thread
      const sanitized = {
        titleEn: (metaData.titleEn || metaData.en || '').trim(),
        titleAr: (metaData.titleAr || metaData.ar || '').trim(),
        tags: (metaData.tags || '')
          .split(/[,#]/)
          .map((t: string) => t.trim())
          .filter(Boolean)
          .join(', '),
        descEn: (metaData.descEn || '').trim(),
        descAr: (metaData.descAr || '').trim(),
        source: json.source || 'ai_worker_processed',
      };

      self.postMessage({ id, type, success: true, data: sanitized });
    } catch (err: any) {
      // Local heuristic fallback processed off-thread
      const fallback = localFallbackMetadata(payload?.category, payload?.mediaType, payload?.currentTitle);
      self.postMessage({
        id,
        type,
        success: true,
        data: { ...fallback, source: 'worker_local_heuristic' },
      });
    }
    return;
  }

  if (type === 'GENERATE_ARTICLE') {
    try {
      const { topic, category, lang } = payload || {};
      const cleanTopic = (topic || '').trim().slice(0, 140);

      const response = await fetchWithTimeout('/api/ai/generate-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: cleanTopic,
          category: category || 'Tech',
          lang: lang || 'en',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const json = await response.json();
      const article = json.data;

      // Word count & read-time calculations off-thread
      if (article && article.contentEn) {
        const words = article.contentEn.split(/\s+/).length;
        if (!article.readTime) {
          article.readTime = Math.max(3, Math.ceil(words / 200));
        }
      }

      self.postMessage({ id, type, success: true, data: article });
    } catch (err: any) {
      self.postMessage({
        id,
        type,
        success: false,
        error: err.message || 'Worker article generation error',
      });
    }
    return;
  }

  if (type === 'SUGGEST_BLOG_IMAGE') {
    try {
      const { title, category, tags, candidates = [] } = payload || {};

      // Send minimal candidate payload (max 15 items, only id/category/short title)
      const lightweightCandidates = candidates.slice(0, 15).map((c: any) => ({
        id: c.id,
        category: c.category,
        titleEn: c.titleEn || c.title?.en || '',
        tags: c.tags,
      }));

      const response = await fetchWithTimeout('/api/ai/suggest-blog-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: (title || '').trim().slice(0, 100),
          category: category || 'Tech',
          tags: (tags || '').trim().slice(0, 100),
          wallpapers: lightweightCandidates,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const json = await response.json();
      self.postMessage({ id, type, success: true, data: json.data });
    } catch (err: any) {
      self.postMessage({
        id,
        type,
        success: false,
        error: err.message || 'Worker image suggestion error',
      });
    }
    return;
  }

  if (type === 'CHAT_COPILOT') {
    try {
      const { message, history, context } = payload || {};
      const response = await fetchWithTimeout('/api/ai/admin-copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: (message || '').trim().slice(0, 1000),
          history: Array.isArray(history) ? history.slice(-6) : [],
          context: context || {},
        }),
      }, 10000);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const json = await response.json();
      self.postMessage({ id, type, success: true, data: json.data });
    } catch (err: any) {
      self.postMessage({
        id,
        type,
        success: false,
        error: err.message || 'Worker copilot chat error',
      });
    }
    return;
  }

  self.postMessage({ id, type, success: false, error: 'Unknown worker action' });
};
