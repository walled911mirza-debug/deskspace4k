import { getMediaFromIndexedDB } from './storageManager';

export interface DownloadOptions {
  imageUrl: string;
  filename: string;
  targetWidth: number;
  targetHeight: number;
  quality?: number;
}

/**
 * Strips all compound, duplicate, or corrupted extensions (e.g., .mp4.jpg, .webm.jpg, .mp4.mp4)
 * and safely ensures the target extension is properly applied.
 */
export function sanitizeFilename(name: string, targetExt?: string): string {
  if (!name) {
    const fallback = 'DeskSpace4K_Download';
    return targetExt ? `${fallback}.${targetExt.toLowerCase()}` : fallback;
  }

  // Strip all known media extensions from the end iteratively to eliminate compound extensions
  let clean = name.replace(/(\.(mp4|webm|mov|mkv|avi|m4v|jpg|jpeg|png|webp|gif|svg))+$/gi, '');

  // Strip illegal filesystem characters while preserving alphanumeric, Arabic letters, hyphens and underscores
  clean = clean.replace(/[^a-zA-Z0-9_\-\u0600-\u06FF\s]/g, '_').trim();
  clean = clean.replace(/_+/g, '_').replace(/^_+|_+$/g, '');

  if (!clean) {
    clean = 'DeskSpace4K_Wallpaper';
  }

  if (targetExt) {
    const ext = targetExt.replace(/^\.+/, '').toLowerCase();
    return `${clean}.${ext}`;
  }

  return clean;
}

/**
 * Detects the real file extension from a media URL or MIME type
 */
export function detectMediaExtension(url: string, defaultExt: string = 'mp4'): string {
  if (!url) return defaultExt;

  const lower = url.toLowerCase();
  if (lower.startsWith('data:video/webm') || lower.includes('.webm')) return 'webm';
  if (lower.startsWith('data:video/mp4') || lower.includes('.mp4')) return 'mp4';
  if (lower.startsWith('data:video/quicktime') || lower.includes('.mov')) return 'mov';
  if (lower.startsWith('data:image/png') || lower.includes('.png')) return 'png';
  if (lower.startsWith('data:image/webp') || lower.includes('.webp')) return 'webp';
  if (lower.startsWith('data:image/jpeg') || lower.startsWith('data:image/jpg') || lower.includes('.jpg') || lower.includes('.jpeg')) {
    return 'jpg';
  }

  return defaultExt;
}

/**
 * Converts a base64 Data URL to a native binary Blob
 */
function dataUrlToBlob(dataUrl: string): Blob {
  try {
    const parts = dataUrl.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const binary = atob(parts[1]);
    const len = binary.length;
    const buffer = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      buffer[i] = binary.charCodeAt(i);
    }
    return new Blob([buffer], { type: mime });
  } catch (err) {
    console.warn('Failed to parse data URL into Blob, using fallback Blob:', err);
    return new Blob([], { type: 'application/octet-stream' });
  }
}

/**
 * Direct download for video files and raw media assets.
 * Fetches the real binary data as a Blob whenever possible to ensure the operating system
 * receives the exact format (.mp4 or .webm) without browser navigation or extension alteration.
 */
export async function downloadDirectMediaFile(
  mediaUrl: string,
  baseFilename: string,
  preferredExt?: string,
  onProgress?: (status: string) => void
): Promise<void> {
  onProgress?.('downloading');

  let activeUrl = mediaUrl;

  // Case 0: Persistent IndexedDB Scheme (idb://media/:id)
  if (activeUrl.startsWith('idb://media/')) {
    const id = activeUrl.replace('idb://media/', '');
    try {
      const media = await getMediaFromIndexedDB(id);
      if (media?.blob) {
        const ext = preferredExt || (media.blob.type.includes('webm') ? 'webm' : media.blob.type.includes('mp4') ? 'mp4' : 'jpg');
        const finalFilename = sanitizeFilename(baseFilename, ext);
        const blobUrl = URL.createObjectURL(media.blob);
        triggerAnchorDownload(blobUrl, finalFilename);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
        onProgress?.('complete');
        return;
      }
      if (media?.base64) {
        activeUrl = media.base64;
      }
    } catch (e) {
      console.warn('Failed to retrieve blob from IndexedDB for direct download:', e);
    }
  }

  const determinedExt = preferredExt || detectMediaExtension(activeUrl, 'mp4');
  const targetFilename = sanitizeFilename(baseFilename, determinedExt);

  // Case 1: Data URL (Base64) - Convert directly to Blob for high-performance direct download
  if (activeUrl.startsWith('data:')) {
    try {
      const blob = dataUrlToBlob(activeUrl);
      const blobUrl = URL.createObjectURL(blob);
      triggerAnchorDownload(blobUrl, targetFilename);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
      onProgress?.('complete');
      return;
    } catch {
      fallbackDirectDownload(activeUrl, targetFilename);
      onProgress?.('complete');
      return;
    }
  }

  // Case 2: Object URL (blob:) - Already a binary blob in memory
  if (activeUrl.startsWith('blob:')) {
    triggerAnchorDownload(activeUrl, targetFilename);
    onProgress?.('complete');
    return;
  }

  // Case 3: Remote Network URL (HTTP/HTTPS) or relative path
  try {
    const response = await fetch(mediaUrl, { mode: 'cors' });
    if (!response.ok) {
      throw new Error(`Fetch failed with status ${response.status}`);
    }

    // Inspect content-type to ensure the final extension perfectly matches server response
    const contentType = response.headers.get('content-type') || '';
    let finalExt = determinedExt;
    if (contentType.includes('video/webm')) finalExt = 'webm';
    else if (contentType.includes('video/mp4')) finalExt = 'mp4';
    else if (contentType.includes('image/png')) finalExt = 'png';
    else if (contentType.includes('image/jpeg')) finalExt = 'jpg';

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const finalFilename = sanitizeFilename(baseFilename, finalExt);

    triggerAnchorDownload(blobUrl, finalFilename);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
    onProgress?.('complete');
  } catch (err) {
    // If CORS or network restricts direct blob fetch, invoke direct anchor download
    console.warn('Direct media blob fetch restricted, using browser download anchor fallback:', err);
    fallbackDirectDownload(mediaUrl, targetFilename);
    onProgress?.('complete');
  }
}

/**
 * Triggers native browser download anchor click
 */
function triggerAnchorDownload(url: string, filename: string) {
  const link = document.createElement('a');
  link.style.display = 'none';
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    if (document.body.contains(link)) {
      document.body.removeChild(link);
    }
  }, 1000);
}

/**
 * Direct anchor fallback for external resources
 */
export function fallbackDirectDownload(url: string, filename: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    if (document.body.contains(link)) {
      document.body.removeChild(link);
    }
  }, 1000);
}

/**
 * Downloads the wallpaper scaled and cropped to the exact specified resolution
 * using an off-screen HTML5 Canvas. Triggers direct browser download with no redirects.
 */
export async function downloadWallpaperWithResolution(
  options: DownloadOptions,
  onProgress?: (status: string) => void
): Promise<void> {
  let { imageUrl } = options;
  const { filename, targetWidth, targetHeight, quality = 0.95 } = options;

  // Resolve persistent IndexedDB media if required
  if (imageUrl.startsWith('idb://media/')) {
    const id = imageUrl.replace('idb://media/', '');
    try {
      const media = await getMediaFromIndexedDB(id);
      if (media?.blob) {
        if (media.blob.type.startsWith('video/')) {
          return downloadDirectMediaFile(imageUrl, filename, 'mp4', onProgress);
        }
        imageUrl = URL.createObjectURL(media.blob);
      } else if (media?.base64) {
        imageUrl = media.base64;
      }
    } catch (e) {
      console.warn('Failed to resolve IndexedDB image for resolution download:', e);
    }
  }

  // If the resource is actually a video, route it directly to video download
  const lowerUrl = (imageUrl || '').toLowerCase();
  const isVid =
    lowerUrl.startsWith('data:video/') ||
    /\.(mp4|webm|mov|mkv|avi)($|\?)/i.test(lowerUrl);

  if (isVid) {
    return downloadDirectMediaFile(imageUrl, filename, detectMediaExtension(imageUrl, 'mp4'), onProgress);
  }

  const safeFilename = sanitizeFilename(filename, 'jpg');
  onProgress?.('loading');

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        onProgress?.('processing');

        // Create canvas at exact target resolution
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          throw new Error('Canvas 2D context unavailable');
        }

        // Apply high quality smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Calculate aspect fill (cover) centering
        const sourceAspect = img.naturalWidth / img.naturalHeight;
        const targetAspect = targetWidth / targetHeight;

        let renderWidth = targetWidth;
        let renderHeight = targetHeight;
        let offsetX = 0;
        let offsetY = 0;

        if (sourceAspect > targetAspect) {
          // Image is wider than target aspect ratio -> scale by height and crop horizontal edges
          renderHeight = targetHeight;
          renderWidth = targetHeight * sourceAspect;
          offsetX = (targetWidth - renderWidth) / 2;
        } else {
          // Image is taller than target aspect ratio -> scale by width and crop vertical edges
          renderWidth = targetWidth;
          renderHeight = targetWidth / sourceAspect;
          offsetY = (targetHeight - renderHeight) / 2;
        }

        // Draw image onto canvas
        ctx.drawImage(img, offsetX, offsetY, renderWidth, renderHeight);

        // Convert to high-quality JPEG Blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              fallbackDirectDownload(imageUrl, safeFilename);
              resolve();
              return;
            }

            const blobUrl = URL.createObjectURL(blob);
            triggerAnchorDownload(blobUrl, safeFilename);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

            onProgress?.('complete');
            resolve();
          },
          'image/jpeg',
          quality
        );
      } catch (err) {
        console.warn('Canvas export failed, using direct download fallback:', err);
        fallbackDirectDownload(imageUrl, safeFilename);
        resolve();
      }
    };

    img.onerror = () => {
      // Direct download fallback
      fallbackDirectDownload(imageUrl, safeFilename);
      resolve();
    };

    img.src = imageUrl;
  });
}

/**
 * Downloads a Live Motion wallpaper:
 * 1. If mediaSource is already a genuine video file (.mp4 or .webm), downloads the real video directly.
 * 2. If mediaSource is an image, records a smooth 60fps video loop from the animated canvas.
 */
export async function downloadLiveMotionVideo(
  mediaSource: string,
  category: string,
  baseFilename: string,
  onProgress?: (status: string) => void
): Promise<void> {
  const lowerUrl = (mediaSource || '').toLowerCase();
  const isRealVideo =
    lowerUrl.startsWith('data:video/') ||
    /\.(mp4|webm|mov|mkv|avi)($|\?)/i.test(lowerUrl);

  // If this item is already a genuine video file, download the real video directly!
  if (isRealVideo) {
    const ext = detectMediaExtension(mediaSource, 'mp4');
    return downloadDirectMediaFile(mediaSource, baseFilename, ext, onProgress);
  }

  onProgress?.('preparing_video');

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const width = 1920;
        const height = 1080;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx || typeof canvas.captureStream !== 'function' || typeof MediaRecorder === 'undefined') {
          // Fallback to high-res still download with clean .jpg (never .mp4.jpg)
          const fallbackJpgName = sanitizeFilename(baseFilename, 'jpg');
          downloadWallpaperWithResolution({
            imageUrl: mediaSource,
            filename: fallbackJpgName,
            targetWidth: 3840,
            targetHeight: 2160,
          });
          resolve();
          return;
        }

        // Setup particles
        const particles: Array<{
          x: number;
          y: number;
          size: number;
          speedX: number;
          speedY: number;
          alpha: number;
          color: string;
        }> = [];

        const colors =
          category === 'Space'
            ? ['#A855F7', '#06B6D4', '#E0E7FF']
            : category === 'Anime'
            ? ['#F472B6', '#FBCFE8', '#FDE047']
            : category === 'Gaming'
            ? ['#00F0FF', '#FF007F', '#A855F7']
            : ['#FF2255', '#00E5FF', '#FFFFFF'];

        for (let i = 0; i < 50; i++) {
          particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * 3 + 1,
            speedX: (Math.random() - 0.5) * 1.5,
            speedY: Math.random() * 2 + 1,
            alpha: Math.random() * 0.7 + 0.3,
            color: colors[Math.floor(Math.random() * colors.length)],
          });
        }

        const stream = canvas.captureStream(60);
        const mimeType = MediaRecorder.isTypeSupported('video/mp4; codecs="avc1.424028, mp4a.40.2"')
          ? 'video/mp4'
          : MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : 'video/webm';

        const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 10000000 });
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
          const videoBlob = new Blob(chunks, { type: mimeType });
          const videoUrl = URL.createObjectURL(videoBlob);
          const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
          const finalFilename = sanitizeFilename(baseFilename, ext);

          triggerAnchorDownload(videoUrl, finalFilename);
          setTimeout(() => URL.revokeObjectURL(videoUrl), 2000);

          onProgress?.('complete');
          resolve();
        };

        recorder.start();
        onProgress?.('recording_motion');

        let frame = 0;
        const totalFrames = 180; // 3 seconds at 60fps

        const drawLoop = () => {
          ctx.drawImage(img, 0, 0, width, height);

          // Draw particles
          particles.forEach((p) => {
            p.x += p.speedX;
            p.y += p.speedY;
            if (p.x < 0) p.x = width;
            if (p.x > width) p.x = 0;
            if (p.y > height) p.y = 0;

            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          });

          frame++;
          if (frame < totalFrames) {
            requestAnimationFrame(drawLoop);
          } else {
            recorder.stop();
          }
        };

        drawLoop();
      } catch (err) {
        console.warn('Video recording error, falling back to clean image:', err);
        const fallbackJpgName = sanitizeFilename(baseFilename, 'jpg');
        fallbackDirectDownload(mediaSource, fallbackJpgName);
        resolve();
      }
    };

    img.onerror = () => {
      const fallbackJpgName = sanitizeFilename(baseFilename, 'jpg');
      fallbackDirectDownload(mediaSource, fallbackJpgName);
      resolve();
    };

    img.src = mediaSource;
  });
}
