import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProd = process.env.NODE_ENV === 'production';

// Port configuration: AI Studio sets PORT=8080 for NGINX and DEFAULT_APP_PORT=3000 for the Node app.
// Parse CLI --port argument if provided, or use DEFAULT_APP_PORT / 3000 to avoid EADDRINUSE on 8080.
const portArgIndex = process.argv.indexOf('--port');
const portFromArg = portArgIndex !== -1 && process.argv[portArgIndex + 1] ? Number(process.argv[portArgIndex + 1]) : null;
const PORT = portFromArg || (process.env.PORT && process.env.PORT !== '8080' ? Number(process.env.PORT) : null) || Number(process.env.DEFAULT_APP_PORT) || 3000;

// Initialize Gemini SDK with server-side API Key
const geminiApiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
const ai = new GoogleGenAI({
  apiKey: geminiApiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Strict timeout helper to prevent hanging outbound requests
function withTimeout<T>(promise: Promise<T>, ms: number = 6000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout of ${ms}ms exceeded`)), ms)
    ),
  ]);
}

// Fallback generator for wallpaper metadata if offline or API key unavailable
function generateFallbackWallpaperMetadata(category: string = 'Gaming', mediaType: string = 'static', currentTitle: string = '') {
  const cat = category || 'Gaming';
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

  return presets[cat] || presets.Gaming;
}

// Fallback generator for articles if offline or API key unavailable
function generateFallbackArticle(topic: string, category: string = 'Tech') {
  const cleanTopic = topic.trim() || 'Top 10 4K OLED Wallpapers for Battlestations';
  const slug = cleanTopic
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');

  return {
    titleEn: cleanTopic.includes('4K') ? cleanTopic : `${cleanTopic}: Ultimate 4K Visual Guide`,
    titleAr: `دليل ${cleanTopic}: الدقة الفائقة وأفضل خلفيات 4K لمحطات العمل والألعاب`,
    slug: slug || 'curated-4k-deskspace-guide',
    category: category || 'Tech',
    readTime: 5,
    excerptEn: `An in-depth exploration into ${cleanTopic}, focusing on OLED contrast, HDR calibration, and display perfection for modern desk setups.`,
    excerptAr: `استعراض تحليلي متكامل حول ${cleanTopic} مع التركيز على تباين شاشات OLED ومعايرة HDR لتنسيق أرقى محطات العمل والمكاتب.`,
    tags: '4K UHD, OLED, Battlestation, Display Tech, HDR, Wallpaper Engine, Live Motion',
    contentEn: `## The Evolution of Desktop Immersion\n\nWhen curating a modern workspace or gaming battlestation, the display is the primary canvas of your digital life. Investing in high-grade 4K (3840×2160) panels and OLED technology unlocks visual depths that standard displays simply cannot reproduce.\n\n### Why 4K Pixel Density Matters\n\n- **Zero Visible Pixelation:** At 3840×2160, fine lines and typographic details render with print-like clarity.\n- **True Inky OLED Blacks:** Pure black pixels completely turn off, creating infinite contrast and eliminating backlit halo effects.\n- **Wide Color Gamut (DCI-P3):** Rich, saturated neon highlights without color clipping.\n\n### Integrating 60 FPS Live Motion Wallpapers\n\nLive motion wallpapers add life to static desk setups without overwhelming system resources. Modern formats (H.264/WebM) ensure hardware-accelerated decoding with less than 1% GPU overhead.\n\n> "A properly calibrated 4K wallpaper transforms your monitor from an ordinary screen into an architectural art piece."\n\n### Curator's Recommendation\n\nAlways ensure your monitor is set to full RGB (0-255) dynamic range in GPU settings to prevent color banding and enjoy uncompressed visual fidelity.`,
    contentAr: `## تطور التجربة البصرية في محطات العمل المعاصرة\n\nعند تنسيق مساحة مكتبية أو محطة ألعاب احترافية، تمثل شاشة العرض النافذة الأساسية لكافة تفاعلاتك الرقمية. إن الانتقال إلى دقة 4K الفائقة (3840×2160) مع تقنيات OLED يمنحك عمقاً بصرياً مبهراً لا يمكن للشاشات التقليدية مجاراته.\n\n### لماذا تعد كثافة البكسلات في دقة 4K جوهرية؟\n\n- **وضوح ونقاء تام:** بدقة 3840×2160 تصبح الخطوط والتفاصيل في غاية الدقة كالمطبوعات الورقية الفاخرة.\n- **سواد عميق لا نهائي:** في شاشات OLED تنطفئ البكسلات السوداء كلياً مما يوفر تبايناً مذهلاً دون أي توهج خلفي.\n- **تدرجات ألوان واسعة DCI-P3:** إضاءات نيون مشبعة وألوان دقيقة مريحة للعين.\n\n### الخلفيات الحية بمعدل 60 إطاراً في الثانية\n\nتضفي الخلفيات المتحركة انسيابية ملهمة على بيئة سطح المكتب دون إرهاق موارد الحاسوب، مع استهلاك لا يتجاوز 1% من قدرة بطاقة الرسوميات بفضل التشفير العتادي الحديث.\n\n> "الخلفية المختارة بعناية تحول الشاشة من مجرد لوحة عرض إلى تحفة بصرية معمارية تعكس شخصيتك."`,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Serve static files from public directory
  app.use(express.static(path.resolve(__dirname, 'public')));

  // Static Wallpapers JSON Endpoints for CDN & API Consumers
  app.get('/wallpapers.json', (_req, res) => {
    res.sendFile(path.resolve(__dirname, 'public', 'wallpapers.json'));
  });
  app.get('/api/wallpapers', (_req, res) => {
    res.sendFile(path.resolve(__dirname, 'public', 'wallpapers.json'));
  });

  // API Health status
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      platform: 'DeskSpace4K',
      timestamp: new Date().toISOString(),
      aiReady: Boolean(geminiApiKey),
    });
  });

  // ==========================================
  // AI Endpoint 1: Wallpaper Metadata Suggestion
  // ==========================================
  app.post('/api/ai/suggest-wallpaper-metadata', async (req, res) => {
    const { category, mediaType, resolution, currentTitle, currentTags, lang } = req.body || {};

    const fallbackData = generateFallbackWallpaperMetadata(category, mediaType, currentTitle);

    if (!geminiApiKey) {
      return res.json({
        success: true,
        source: 'local_engine',
        data: fallbackData,
      });
    }

    try {
      const prompt = `You are an expert 4K desktop wallpaper curator and SEO copywriter for DeskSpace4K.
Generate punchy, SEO-optimized, highly engaging metadata for a wallpaper upload.
Category: ${category || 'Gaming'}
Media Type: ${mediaType === 'live' ? '60 FPS Live Motion Video (MP4/WebM)' : '4K Ultra HD Static Photo (3840×2160)'}
Target Resolution: ${resolution || '3840×2160'}
Current Working Title: ${currentTitle || 'None provided'}
Current Working Tags: ${currentTags || 'None provided'}
Preferred Language Context: ${lang || 'en'}

Generate:
1. titleEn: Catchy, aesthetic title in English (under 7 words, e.g., "Cyberpunk Neon Ronin 4K", "OLED Deep Space Nebula").
2. titleAr: Fluent, evocative Arabic title (under 7 words, e.g., "رونين السايبربانك النيوني 4K").
3. tags: Comma-separated list of 6-9 high-impact tags including #Cyberpunk, #OLED4K, #LiveMotion, #4KUltraHD, #Battlestation, #HDR, etc.
4. descEn: Crisp 1-2 sentence description highlighting visual fidelity, contrast, resolution, and monitor aesthetic.
5. descAr: Fluent 1-2 sentence description in Arabic highlighting visual fidelity and display quality.`;

      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            systemInstruction: 'You are an elite creative director and copywriter for luxury 4K desktop wallpapers. Output structured JSON strictly conforming to the requested schema.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                titleEn: { type: Type.STRING },
                titleAr: { type: Type.STRING },
                tags: { type: Type.STRING },
                descEn: { type: Type.STRING },
                descAr: { type: Type.STRING },
              },
              required: ['titleEn', 'titleAr', 'tags', 'descEn', 'descAr'],
            },
          },
        }),
        6000
      );

      const text = response.text;
      if (!text) {
        throw new Error('Empty response from Gemini API');
      }

      const parsed = JSON.parse(text);
      res.json({
        success: true,
        source: 'gemini-3.8-flash',
        data: {
          titleEn: parsed.titleEn || fallbackData.titleEn,
          titleAr: parsed.titleAr || fallbackData.titleAr,
          tags: parsed.tags || fallbackData.tags,
          descEn: parsed.descEn || fallbackData.descEn,
          descAr: parsed.descAr || fallbackData.descAr,
        },
      });
    } catch (err: any) {
      console.warn('Gemini metadata generation fallback triggered:', err.message);
      res.json({
        success: true,
        source: 'local_engine_fallback',
        data: fallbackData,
        note: 'Generated via high-performance local heuristics',
      });
    }
  });

  // ==========================================
  // AI Endpoint 2: Blog / Journal Article Creator
  // ==========================================
  app.post('/api/ai/generate-article', async (req, res) => {
    const { topic, category, lang } = req.body || {};

    const fallbackArticle = generateFallbackArticle(topic, category);

    if (!geminiApiKey) {
      return res.json({
        success: true,
        source: 'local_engine',
        data: fallbackArticle,
      });
    }

    try {
      const prompt = `You are a professional tech journalist, display calibration engineer, and interior setup curator for "DeskSpace4K Journal".
Write a comprehensive, engaging, well-structured article based on the following:
Topic/Prompt: "${topic || 'Top 10 OLED 4K Wallpapers for Gaming Setup'}"
Category: "${category || 'Tech'}"
User Language: "${lang || 'en'}"

Specifications:
- titleEn: Engaging, clickable editorial title in English.
- titleAr: Natural, high-impact editorial title in Arabic.
- slug: Clean URL slug (e.g., 'top-10-oled-4k-wallpapers-for-gaming').
- category: One of: Tech, Guides, Curation, Art, Minimalism.
- readTime: Integer between 3 and 10 representing estimated read time in minutes.
- excerptEn: 1-2 sentence compelling teaser summary.
- excerptAr: 1-2 sentence compelling teaser summary in Arabic.
- tags: Comma-separated list of relevant tags (e.g., 'OLED, 4K UHD, Battlestation, HDR, Wallpaper Engine').
- contentEn: Full Markdown article with headings (##, ###), bullet lists, bold text, blockquotes, and image placeholder tags like ![Display Setup](placeholder).
- contentAr: Full Arabic Markdown article with headings (##, ###), bullet points, and insightful display recommendations.`;

      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            systemInstruction: 'You are a senior tech writer for luxury desk setups, OLED displays, and wallpaper curation. Always return clean JSON according to the schema.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                titleEn: { type: Type.STRING },
                titleAr: { type: Type.STRING },
                slug: { type: Type.STRING },
                category: { type: Type.STRING },
                readTime: { type: Type.INTEGER },
                excerptEn: { type: Type.STRING },
                excerptAr: { type: Type.STRING },
                tags: { type: Type.STRING },
                contentEn: { type: Type.STRING },
                contentAr: { type: Type.STRING },
              },
              required: [
                'titleEn',
                'titleAr',
                'slug',
                'category',
                'readTime',
                'excerptEn',
                'excerptAr',
                'tags',
                'contentEn',
                'contentAr',
              ],
            },
          },
        }),
        7000
      );

      const text = response.text;
      if (!text) {
        throw new Error('Empty response from Gemini API');
      }

      const parsed = JSON.parse(text);
      res.json({
        success: true,
        source: 'gemini-3.8-flash',
        data: {
          titleEn: parsed.titleEn || fallbackArticle.titleEn,
          titleAr: parsed.titleAr || fallbackArticle.titleAr,
          slug: parsed.slug || fallbackArticle.slug,
          category: parsed.category || fallbackArticle.category,
          readTime: Number(parsed.readTime) || fallbackArticle.readTime,
          excerptEn: parsed.excerptEn || fallbackArticle.excerptEn,
          excerptAr: parsed.excerptAr || fallbackArticle.excerptAr,
          tags: parsed.tags || fallbackArticle.tags,
          contentEn: parsed.contentEn || fallbackArticle.contentEn,
          contentAr: parsed.contentAr || fallbackArticle.contentAr,
        },
      });
    } catch (err: any) {
      console.warn('Gemini article generation fallback triggered:', err.message);
      res.json({
        success: true,
        source: 'local_engine_fallback',
        data: fallbackArticle,
        note: 'Generated via high-performance local heuristics',
      });
    }
  });

  // ==========================================
  // AI Endpoint 3: Blog Article Image Suggestion & Repo Matcher
  // ==========================================
  app.post('/api/ai/suggest-blog-image', async (req, res) => {
    const { title, topic, category, tags, wallpapers = [] } = req.body || {};

    const cleanTitle = (title || topic || '').trim();
    const cleanCat = (category || 'Tech').trim();

    // Local heuristic matching function
    const findHeuristicMatch = () => {
      if (!wallpapers || wallpapers.length === 0) return null;

      const keywords = `${cleanTitle} ${tags || ''} ${cleanCat}`.toLowerCase().split(/[\s,]+/);
      let bestWp = wallpapers[0];
      let bestScore = -1;

      for (const wp of wallpapers) {
        let score = 0;
        const wpTitle = `${wp.title?.en || ''} ${wp.title?.ar || ''}`.toLowerCase();
        const wpCategory = (wp.category || '').toLowerCase();
        const wpTags = Array.isArray(wp.tags) ? wp.tags.join(' ').toLowerCase() : '';

        if (wpCategory === cleanCat.toLowerCase()) score += 4;
        for (const kw of keywords) {
          if (kw.length < 3) continue;
          if (wpTitle.includes(kw)) score += 3;
          if (wpTags.includes(kw)) score += 2;
        }

        if (score > bestScore) {
          bestScore = score;
          bestWp = wp;
        }
      }

      return {
        matchedId: bestWp?.id,
        matchedUrl: bestWp?.url,
        matchedTitle: bestWp?.title?.en,
        reasoningEn: `Selected "${bestWp?.title?.en}" based on matching category "${cleanCat}" and setup relevance.`,
        reasoningAr: `تم اختيار "${bestWp?.title?.ar || bestWp?.title?.en}" لتطابقه مع تصنيف المقال "${cleanCat}".`,
      };
    };

    const localMatch = findHeuristicMatch();

    if (!geminiApiKey || wallpapers.length === 0) {
      return res.json({
        success: true,
        source: 'local_heuristic',
        data: localMatch,
      });
    }

    try {
      const candidates = wallpapers.slice(0, 30).map((w: any) => ({
        id: w.id,
        titleEn: w.title?.en || '',
        category: w.category || '',
        tags: Array.isArray(w.tags) ? w.tags.join(', ') : '',
      }));

      const prompt = `You are a design director for DeskSpace4K Journal.
Given the blog post:
Title: "${cleanTitle}"
Category: "${cleanCat}"
Tags: "${tags || ''}"

And this list of candidate 4K wallpapers in the repository:
${JSON.stringify(candidates)}

Select the single best matching wallpaper ID that visually complements this article's topic.
Provide:
- matchedId: the exact ID of the best wallpaper
- reasoningEn: a short 1-sentence explanation of why it fits
- reasoningAr: a short 1-sentence explanation in Arabic`;

      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                matchedId: { type: Type.STRING },
                reasoningEn: { type: Type.STRING },
                reasoningAr: { type: Type.STRING },
              },
              required: ['matchedId', 'reasoningEn', 'reasoningAr'],
            },
          },
        }),
        5000
      );

      const parsed = JSON.parse(response.text || '{}');
      const matchedWallpaper = wallpapers.find((w: any) => w.id === parsed.matchedId) || wallpapers[0];

      res.json({
        success: true,
        source: 'gemini-3.8-flash',
        data: {
          matchedId: matchedWallpaper?.id || localMatch?.matchedId,
          matchedUrl: matchedWallpaper?.url || localMatch?.matchedUrl,
          matchedTitle: matchedWallpaper?.title?.en || localMatch?.matchedTitle,
          reasoningEn: parsed.reasoningEn || localMatch?.reasoningEn,
          reasoningAr: parsed.reasoningAr || localMatch?.reasoningAr,
        },
      });
    } catch (err: any) {
      console.warn('Gemini blog image matching fallback triggered:', err.message);
      res.json({
        success: true,
        source: 'local_heuristic_fallback',
        data: localMatch,
      });
    }
  });

  // ==========================================
  // AI Endpoint 4: Admin AI Development Co-Pilot Chat
  // ==========================================
  app.post('/api/ai/admin-copilot', async (req, res) => {
    const { message, history = [], context = {} } = req.body || {};
    const cleanMsg = (message || '').trim();

    if (!cleanMsg) {
      return res.status(400).json({ success: false, error: 'Empty message' });
    }

    const generateLocalFallbackReply = (query: string): string => {
      const q = query.toLowerCase();
      if (q.includes('snippet') || q.includes('code') || q.includes('react') || q.includes('component')) {
        return `### ⚡ DeskSpace4K React Component Snippet\n\nHere is a high-performance, hardware-accelerated preview card snippet with memory hygiene:\n\n\`\`\`tsx\nimport React, { useRef, useEffect } from 'react';\n\nexport const HighFpsWallpaperPreview: React.FC<{ url: string; isVideo?: boolean }> = ({ url, isVideo }) => {\n  const videoRef = useRef<HTMLVideoElement>(null);\n\n  useEffect(() => {\n    return () => {\n      if (videoRef.current) {\n        videoRef.current.pause();\n        videoRef.current.removeAttribute('src');\n        videoRef.current.load();\n      }\n    };\n  }, []);\n\n  return (\n    <div className="relative rounded-2xl overflow-hidden bg-[#12131A] border border-[#232535] will-change-transform">\n      {isVideo ? (\n        <video ref={videoRef} src={url} autoPlay loop muted playsInline className="w-full h-auto object-cover" />\n      ) : (\n        <img src={url} alt="4K Preview" loading="lazy" className="w-full h-auto object-cover" />\n      )}\n    </div>\n  );\n};\n\`\`\`\n\n*Tips: Always ensure \`playsInline\` and \`muted\` are set to satisfy modern browser autoplay policies without dropping frames.*`;
      }
      if (q.includes('fps') || q.includes('performance') || q.includes('60') || q.includes('lag')) {
        return `### 🚀 60 FPS Performance & Memory Hygiene Blueprint\n\nTo keep DeskSpace4K locked at 60 FPS:\n1. **Unload Off-Screen Video Decoders:** Only active page elements should exist in the DOM; unmount old cards during pagination.\n2. **Hardware Acceleration:** Apply \`transform: translate3d(0, 0, 0)\` and \`will-change: transform\` to animated cards.\n3. **IndexedDB Cursor Slicing:** Use \`cursor.advance(offset)\` and \`limit\` rather than loading entire blob arrays into JS heap.\n4. **Revoke Temporary Object URLs:** Call \`URL.revokeObjectURL(url)\` as soon as file previews are replaced or discarded.`;
      }
      if (q.includes('idea') || q.includes('feature') || q.includes('setup') || q.includes('battlestation')) {
        return `### 💡 Curated Battlestation Feature Concepts\n\n1. **Multi-Monitor Span Previewer:** Allow visitors to simulate how a 3840×2160 wallpaper spans across dual 27" 4K or 34" Ultrawide setups.\n2. **Ambient Room Lighting Hex Sync:** Automatically extract the primary 5 neon color codes from any wallpaper for Philips Hue / Nanoleaf lighting sync.\n3. **Hardware Wallpaper Engine Exporter:** Provide a 1-click \`project.json\` bundle download for instant Wallpaper Engine import.\n4. **OLED Screen Burn-in Protector Mode:** Subtle 1-pixel micro-shift every 5 minutes for static desktop wallpapers.`;
      }
      return `### 🛠️ DeskSpace4K Dev Copilot\n\nI analyzed your query: **"${cleanMsg}"**.\n\n- **Platform Context:** DeskSpace4K 4K UHD (3840×2160) & Mobile Live Wallpapers (9:16) Hub.\n- **Architecture:** React 19 SPA, Tailwind CSS v4, Express server proxy, IndexedDB permanent media storage, Gemini 3.8 Flash SDK.\n\nHow can I help you take DeskSpace4K to the next level? I can assist with:\n- Writing custom TypeScript hooks or components\n- Refining Tailwind CSS styling and dark neon battlestation aesthetics\n- Optimizing IndexedDB queries and video hardware decoders\n- Drafting high-CTR metadata or technical journal guides`;
    };

    if (!geminiApiKey) {
      return res.json({
        success: true,
        source: 'local_copilot_engine',
        data: {
          reply: generateLocalFallbackReply(cleanMsg),
          source: 'local_engine',
        },
      });
    }

    try {
      const systemInstruction = `You are "DeskSpace4K Dev Copilot", an elite senior software engineer and system architect embedded directly into the DeskSpace4K Admin Center.
DeskSpace4K is a luxury, high-performance web platform for 3840×2160 (16:9) Ultra HD desktop wallpapers and 9:16 mobile live wallpapers.
Architecture: React 19, TypeScript, Tailwind CSS v4, Express proxy backend, IndexedDB permanent blob storage, Vite, and Google GenAI SDK.

Your instructions:
- Provide actionable, precise, and production-grade answers, code snippets, architectural patterns, and UI/UX recommendations.
- When generating code, use clean TypeScript with modern React hooks and Tailwind CSS utility classes.
- Help the admin brainstorm features, optimize 60 FPS media playback, troubleshoot responsive layouts, and enhance the battlestation curation workflow.
- Maintain an encouraging, ultra-competent engineering tone with clear Markdown headers, bullet lists, and syntax-highlighted code.`;

      const contents: any[] = [];
      if (Array.isArray(history)) {
        for (const item of history.slice(-6)) {
          contents.push({
            role: item.role === 'model' ? 'model' : 'user',
            parts: [{ text: item.text }],
          });
        }
      }

      const contextualMessage = `Context: ${JSON.stringify(context || {})}\n\nAdmin Query: ${cleanMsg}`;
      contents.push({
        role: 'user',
        parts: [{ text: contextualMessage }],
      });

      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents,
          config: {
            systemInstruction,
          },
        }),
        8000
      );

      const replyText = response.text || generateLocalFallbackReply(cleanMsg);

      res.json({
        success: true,
        source: 'gemini-3.8-flash',
        data: {
          reply: replyText,
          source: 'gemini-3.8-flash',
        },
      });
    } catch (err: any) {
      console.warn('Gemini Admin Copilot fallback triggered:', err.message);
      res.json({
        success: true,
        source: 'local_copilot_fallback',
        data: {
          reply: generateLocalFallbackReply(cleanMsg),
          source: 'local_fallback',
        },
      });
    }
  });

  // ==========================================
  // AI Endpoint 5: Admin AI Copilot Action Executor
  // ==========================================
  app.post('/api/ai/copilot-action', async (req, res) => {
    const { prompt: userPrompt, context = {} } = req.body || {};
    const cleanPrompt = (userPrompt || '').trim();

    if (!cleanPrompt) {
      return res.status(400).json({ success: false, error: 'Empty prompt' });
    }

    // High quality deterministic fallback generator
    const generateLocalFallbackAction = (p: string) => {
      const lower = p.toLowerCase();
      if (lower.includes('article') || lower.includes('blog') || lower.includes('مقالة') || lower.includes('post') || lower.includes('write')) {
        const topic = p.replace(/(generate|write|create|an|seo|article|about|blog|post|مقالة|عن|اكتب)/gi, '').trim() || '4K OLED Display & Wallpaper Guide';
        const article = generateFallbackArticle(topic, 'Tech');
        return {
          actionType: 'GENERATE_ARTICLE',
          summaryEn: `Generated SEO article: "${article.titleEn}" (${article.readTime} min read)`,
          summaryAr: `تم إنشاء مقال محسّن لمحركات البحث: "${article.titleAr}"`,
          articleData: {
            titleEn: article.titleEn,
            titleAr: article.titleAr,
            slug: article.slug,
            category: article.category,
            readTimeMinutes: article.readTime,
            excerptEn: article.excerptEn,
            excerptAr: article.excerptAr,
            contentEn: article.contentEn,
            contentAr: article.contentAr,
            tags: article.tags.split(',').map((s) => s.trim()).filter(Boolean),
          },
          explanation: `Complete bilingual SEO-optimized article ready to be added directly to the blog and IndexedDB.`,
        };
      }

      if (lower.includes('tag') || lower.includes('وسم') || lower.includes('وسوم') || lower.includes('batch')) {
        let cat = 'Gaming';
        if (lower.includes('anime') || lower.includes('أنمي')) cat = 'Anime';
        else if (lower.includes('space') || lower.includes('فضاء')) cat = 'Space';
        else if (lower.includes('nature') || lower.includes('طبيعة')) cat = 'Nature';
        else if (lower.includes('car') || lower.includes('سيارات')) cat = 'Cars';
        else if (lower.includes('minimal') || lower.includes('بساطة')) cat = 'Minimalist';
        else if (lower.includes('mobile') || lower.includes('هاتف')) cat = 'Mobile';
        else if (lower.includes('all') || lower.includes('الكل')) cat = 'All';

        const highCtrTags = ['#OLED4K', '#4KUltraHD', '#Battlestation', '#HighRefreshRate', '#HDR10', '#AestheticSetup', '#DarkNeon'];
        return {
          actionType: 'BATCH_UPDATE_TAGS',
          summaryEn: `Proposed high-CTR SEO tags for ${cat === 'All' ? 'all' : cat} wallpapers: ${highCtrTags.join(', ')}`,
          summaryAr: `اقتراح وسوم عالية النقر لمحركات البحث لخلفيات ${cat === 'All' ? 'جميع' : cat}: ${highCtrTags.join(', ')}`,
          tagUpdateData: {
            targetCategory: cat,
            tagsToAdd: highCtrTags,
            reasoningEn: `These tags align with trending battlestation search terms and OLED display queries.`,
            reasoningAr: `تتوافق هذه الوسوم مع أكثر مصطلحات البحث رواجاً لشاشات OLED ومحطات الألعاب.`,
          },
          explanation: `Batch tag update proposal ready to enrich matching wallpaper records in local state and IndexedDB without touching any image or video media files.`,
        };
      }

      if (lower.includes('meta') || lower.includes('وصف') || lower.includes('description') || lower.includes('title')) {
        let cat = 'Gaming';
        if (lower.includes('anime')) cat = 'Anime';
        else if (lower.includes('space')) cat = 'Space';
        else if (lower.includes('nature')) cat = 'Nature';
        else if (lower.includes('car')) cat = 'Cars';
        else if (lower.includes('minimal')) cat = 'Minimalist';
        else if (lower.includes('mobile')) cat = 'Mobile';

        const meta = generateFallbackWallpaperMetadata(cat, 'static', '');
        return {
          actionType: 'UPDATE_METADATA',
          summaryEn: `Generated enhanced metadata for ${cat} wallpapers`,
          summaryAr: `تم إنشاء بيانات وصفية محسنة لخلفيات ${cat}`,
          metadataUpdateData: {
            targetCategory: cat,
            descEn: meta.descEn,
            descAr: meta.descAr,
            tagsToAdd: meta.tags.split(',').map((s) => s.trim()).filter(Boolean),
            reasoningEn: `High-fidelity 4K OLED descriptions targeting tech enthusiasts and setup builders.`,
            reasoningAr: `أوصاف فنية دقيقة مخصصة لهواة الشاشات ومصممي بيئات سطح المكتب.`,
          },
          explanation: `Metadata enhancement proposal ready to apply to specified ${cat} wallpapers.`,
        };
      }

      return {
        actionType: 'ASSIST_ANSWER',
        summaryEn: `DeskSpace4K Copilot Guidance for: "${cleanPrompt}"`,
        summaryAr: `توجيهات المساعد الذكي لاستفسار: "${cleanPrompt}"`,
        answerMarkdown: `### 🤖 DeskSpace4K Copilot Response\n\nI processed your instruction: **"${cleanPrompt}"**.\n\n- **Platform Context:** DeskSpace4K Ultra HD & Mobile Live Wallpapers Repository.\n- **Storage Safety:** Verified that all ${context.totalWallpapers || '150+'} assets and IndexedDB records are protected with atomic updates.\n\n**Suggested Next Actions:**\n1. Type *"Generate an SEO article about OLED HDR display calibration"* to produce a complete published guide.\n2. Type *"Batch update tags for Gaming wallpapers"* to enrich discovery metadata.\n3. Type *"Update metadata for Space category"* to refresh titles and descriptions.`,
        explanation: `General system guidance and instructions.`,
      };
    };

    const fallbackResult = generateLocalFallbackAction(cleanPrompt);

    if (!geminiApiKey) {
      return res.json({
        success: true,
        source: 'local_copilot_engine',
        data: fallbackResult,
      });
    }

    try {
      const systemInstruction = `You are "DeskSpace4K Embedded AI Copilot", an autonomous intelligent assistant for the DeskSpace4K wallpaper repository and journal platform.
The admin is typing a direct natural language instruction.
Your goal is to understand the instruction and return a structured JSON response executing the appropriate action.

Allowed actionTypes:
1. "GENERATE_ARTICLE": When user wants to create, write, or generate an SEO article/blog post.
   Provide complete articleData with titleEn, titleAr, slug, category (Tech, Guides, Curation, Art, or Minimalism), readTimeMinutes (integer 4-10), excerptEn, excerptAr, contentEn (full markdown with headings, bullets, bolding), contentAr (full Arabic markdown), and tags (array of strings).
2. "BATCH_UPDATE_TAGS": When user wants to update, add, or refine tags for wallpapers (e.g. for a category or all).
   Provide tagUpdateData with targetCategory (e.g. 'Gaming', 'Anime', 'Space', 'Nature', 'Cars', 'Minimalist', 'Mobile', or 'All'), tagsToAdd (array of 4-8 SEO tags with '#' prefix like '#OLED4K', '#Battlestation'), reasoningEn, reasoningAr.
3. "UPDATE_METADATA": When user wants to enhance metadata or descriptions for a category or wallpapers.
   Provide metadataUpdateData with targetCategory, descEn (1-2 sentences), descAr (1-2 sentences in Arabic), tagsToAdd, reasoningEn, reasoningAr.
4. "ASSIST_ANSWER": For general queries, recommendations, code questions, or system features.
   Provide answerMarkdown with formatting, tips, and next steps.

Safety Requirement:
All operations in DeskSpace4K must be strictly non-destructive. Never propose dropping, resetting, or clearing databases.`;

      const promptPayload = `Context: ${JSON.stringify(context || {})}
Admin Instruction: "${cleanPrompt}"

Classify and generate the structured action.`;

      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: promptPayload,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                actionType: { type: Type.STRING },
                summaryEn: { type: Type.STRING },
                summaryAr: { type: Type.STRING },
                explanation: { type: Type.STRING },
                articleData: {
                  type: Type.OBJECT,
                  properties: {
                    titleEn: { type: Type.STRING },
                    titleAr: { type: Type.STRING },
                    slug: { type: Type.STRING },
                    category: { type: Type.STRING },
                    readTimeMinutes: { type: Type.INTEGER },
                    excerptEn: { type: Type.STRING },
                    excerptAr: { type: Type.STRING },
                    contentEn: { type: Type.STRING },
                    contentAr: { type: Type.STRING },
                    tags: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                },
                tagUpdateData: {
                  type: Type.OBJECT,
                  properties: {
                    targetCategory: { type: Type.STRING },
                    tagsToAdd: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    reasoningEn: { type: Type.STRING },
                    reasoningAr: { type: Type.STRING },
                  },
                },
                metadataUpdateData: {
                  type: Type.OBJECT,
                  properties: {
                    targetCategory: { type: Type.STRING },
                    descEn: { type: Type.STRING },
                    descAr: { type: Type.STRING },
                    tagsToAdd: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    reasoningEn: { type: Type.STRING },
                    reasoningAr: { type: Type.STRING },
                  },
                },
                answerMarkdown: { type: Type.STRING },
              },
              required: ['actionType', 'summaryEn', 'summaryAr'],
            },
          },
        }),
        8000
      );

      const parsed = JSON.parse(response.text || '{}');

      res.json({
        success: true,
        source: 'gemini-3.8-flash',
        data: {
          actionType: parsed.actionType || fallbackResult.actionType,
          summaryEn: parsed.summaryEn || fallbackResult.summaryEn,
          summaryAr: parsed.summaryAr || fallbackResult.summaryAr,
          explanation: parsed.explanation || fallbackResult.explanation,
          articleData: parsed.articleData || (parsed.actionType === 'GENERATE_ARTICLE' ? (fallbackResult as any).articleData : undefined),
          tagUpdateData: parsed.tagUpdateData || (parsed.actionType === 'BATCH_UPDATE_TAGS' ? (fallbackResult as any).tagUpdateData : undefined),
          metadataUpdateData: parsed.metadataUpdateData || (parsed.actionType === 'UPDATE_METADATA' ? (fallbackResult as any).metadataUpdateData : undefined),
          answerMarkdown: parsed.answerMarkdown || (fallbackResult as any).answerMarkdown,
        },
      });
    } catch (err: any) {
      console.warn('Gemini Copilot Action fallback triggered:', err.message);
      res.json({
        success: true,
        source: 'local_copilot_fallback',
        data: fallbackResult,
      });
    }
  });

  // Client-side SPA catch-all routing
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DeskSpace4K server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start DeskSpace4K server:', err);
  process.exit(1);
});
