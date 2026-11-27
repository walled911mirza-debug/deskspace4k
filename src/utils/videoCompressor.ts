export const VIDEO_COMPRESSION_THRESHOLD_BYTES = 50 * 1024 * 1024; // 50 MB

export interface VideoCompressionProgress {
  percent: number;
  elapsedSec: number;
  estimatedTotalSec: number;
}

export interface VideoCompressionOptions {
  maxSizeBytes?: number;
  maxDimension?: number;
  onProgress?: (progress: VideoCompressionProgress) => void;
  signal?: AbortSignal;
}

export interface VideoCompressionResult {
  file: File;
  wasCompressed: boolean;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  width: number;
  height: number;
  durationSeconds: number;
  compressionRatioPercent: number;
}

export function formatBytesMB(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0.0 MB';
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function toEvenDimension(value: number): number {
  const rounded = Math.max(2, Math.round(value));
  return rounded % 2 === 0 ? rounded : rounded - 1;
}

function selectSupportedVideoMimeType(): { mimeType: string; ext: 'mp4' | 'webm' } | null {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return null;
  }

  const candidates: Array<{ mimeType: string; ext: 'mp4' | 'webm' }> = [
    { mimeType: 'video/mp4;codecs=avc1.42E01E', ext: 'mp4' },
    { mimeType: 'video/mp4;codecs=avc1', ext: 'mp4' },
    { mimeType: 'video/mp4', ext: 'mp4' },
    { mimeType: 'video/webm;codecs=vp9', ext: 'webm' },
    { mimeType: 'video/webm;codecs=vp8', ext: 'webm' },
    { mimeType: 'video/webm', ext: 'webm' },
  ];

  for (const candidate of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(candidate.mimeType)) {
        return candidate;
      }
    } catch {
      // ignore unsupported query errors
    }
  }

  return { mimeType: '', ext: 'webm' };
}

function replaceFileExtension(fileName: string, ext: 'mp4' | 'webm'): string {
  const stripped = (fileName || 'animated_wallpaper').replace(/\.[^/.]+$/, '');
  return `${stripped}_compressed.${ext}`;
}

/**
 * Compresses animated wallpaper video files > 50 MB in the browser using an off-DOM
 * video decoder + canvas + hardware-accelerated MediaRecorder without blocking the UI thread.
 */
export async function compressVideoForWallpaper(
  file: File,
  options: VideoCompressionOptions = {}
): Promise<VideoCompressionResult> {
  const maxSizeBytes = options.maxSizeBytes ?? VIDEO_COMPRESSION_THRESHOLD_BYTES;
  const maxDimension = options.maxDimension ?? 1920;
  const { onProgress, signal } = options;

  if (signal?.aborted) {
    throw new DOMException('Compression aborted', 'AbortError');
  }

  // Requirement 2: Skip compression if <= 50 MB
  if (file.size <= maxSizeBytes) {
    onProgress?.({ percent: 100, elapsedSec: 0, estimatedTotalSec: 0 });
    return {
      file,
      wasCompressed: false,
      originalSizeBytes: file.size,
      compressedSizeBytes: file.size,
      width: 0,
      height: 0,
      durationSeconds: 0,
      compressionRatioPercent: 0,
    };
  }

  if (typeof MediaRecorder === 'undefined') {
    throw new Error('This browser does not support in-browser video compression (MediaRecorder unavailable).');
  }

  const mimeSelection = selectSupportedVideoMimeType();
  if (!mimeSelection) {
    throw new Error('No supported video encoder codec found in this browser.');
  }

  return new Promise<VideoCompressionResult>((resolve, reject) => {
    let settled = false;
    let objectUrl: string | null = null;
    let video: HTMLVideoElement | null = null;
    let canvas: HTMLCanvasElement | null = null;
    let stream: MediaStream | null = null;
    let recorder: MediaRecorder | null = null;
    let progressInterval: ReturnType<typeof setInterval> | null = null;
    let metadataTimeout: ReturnType<typeof setTimeout> | null = null;
    let pumpFrameId: number | null = null;
    let pumpType: 'rvfc' | 'raf' | null = null;

    const cleanup = () => {
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
      if (metadataTimeout) {
        clearTimeout(metadataTimeout);
        metadataTimeout = null;
      }
      if (pumpFrameId !== null) {
        if (pumpType === 'rvfc' && video && 'cancelVideoFrameCallback' in video) {
          try {
            (video as any).cancelVideoFrameCallback(pumpFrameId);
          } catch {
            // ignore
          }
        } else {
          cancelAnimationFrame(pumpFrameId);
        }
        pumpFrameId = null;
      }
      if (signal) {
        signal.removeEventListener('abort', handleAbort);
      }
      if (recorder && recorder.state !== 'inactive') {
        try {
          recorder.stop();
        } catch {
          // ignore
        }
      }
      if (stream) {
        try {
          stream.getTracks().forEach((t) => t.stop());
        } catch {
          // ignore
        }
        stream = null;
      }
      if (video) {
        try {
          video.pause();
          video.removeAttribute('src');
          video.load();
        } catch {
          // ignore
        }
        video = null;
      }
      if (canvas) {
        try {
          const ctx = canvas.getContext('2d');
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
          canvas.width = 0;
          canvas.height = 0;
        } catch {
          // ignore
        }
        canvas = null;
      }
      if (objectUrl) {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {
          // ignore
        }
        objectUrl = null;
      }
    };

    const failWith = (err: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    };

    const handleAbort = () => {
      failWith(new DOMException('Compression aborted', 'AbortError'));
    };

    if (signal) {
      signal.addEventListener('abort', handleAbort, { once: true });
    }

    try {
      objectUrl = URL.createObjectURL(file);
      video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.crossOrigin = 'anonymous';
      video.src = objectUrl;

      metadataTimeout = setTimeout(() => {
        failWith(new Error('Timed out loading video metadata. Try skipping compression or checking codec support.'));
      }, 15000);

      video.onerror = () => {
        failWith(new Error('Unsupported video codec or unreadable file format in this browser.'));
      };

      video.onloadedmetadata = async () => {
        if (settled || !video) return;
        if (metadataTimeout) {
          clearTimeout(metadataTimeout);
          metadataTimeout = null;
        }

        const srcWidth = video.videoWidth || 1920;
        const srcHeight = video.videoHeight || 1080;
        const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 10;

        // Preserve aspect ratio cleanly, scaling down ultra-high-res 4K/8K to crisp 1080p max edge
        const longestEdge = Math.max(srcWidth, srcHeight);
        const scale = longestEdge > maxDimension ? maxDimension / longestEdge : 1;
        const targetWidth = toEvenDimension(srcWidth * scale);
        const targetHeight = toEvenDimension(srcHeight * scale);

        // Aim comfortably below 50 MB (36 MB ceiling) while maintaining clean animated wallpaper quality
        const targetCeilingBytes = 36 * 1024 * 1024;
        const calculatedBps = Math.floor((targetCeilingBytes * 8) / Math.max(duration, 1));
        const videoBitsPerSecond = Math.max(1_400_000, Math.min(6_500_000, calculatedBps));

        canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d', { alpha: false });

        if (!ctx) {
          failWith(new Error('Failed to initialize 2D canvas context for video compression.'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const captureTargetFps = 30;
        if (typeof canvas.captureStream !== 'function') {
          failWith(new Error('Canvas captureStream is not supported in this browser.'));
          return;
        }

        stream = canvas.captureStream(captureTargetFps);

        const recorderOptions: MediaRecorderOptions = { videoBitsPerSecond };
        if (mimeSelection.mimeType) {
          recorderOptions.mimeType = mimeSelection.mimeType;
        }

        try {
          recorder = new MediaRecorder(stream, recorderOptions);
        } catch {
          recorder = new MediaRecorder(stream);
        }

        const chunks: BlobPart[] = [];
        const startedAtMs = performance.now();

        recorder.ondataavailable = (ev: BlobEvent) => {
          if (ev.data && ev.data.size > 0) {
            chunks.push(ev.data);
          }
        };

        recorder.onerror = () => {
          failWith(new Error('MediaRecorder encountered an encoding error during compression.'));
        };

        recorder.onstop = () => {
          if (settled) return;
          if (signal?.aborted) {
            failWith(new DOMException('Compression aborted', 'AbortError'));
            return;
          }

          const resolvedType =
            recorder?.mimeType || mimeSelection.mimeType || (mimeSelection.ext === 'mp4' ? 'video/mp4' : 'video/webm');
          const resolvedExt: 'mp4' | 'webm' = resolvedType.includes('mp4') ? 'mp4' : 'webm';
          const compressedBlob = new Blob(chunks, { type: resolvedType });

          if (!compressedBlob || compressedBlob.size === 0) {
            failWith(new Error('Video compression produced an empty output file.'));
            return;
          }

          // Use compressed output whenever it reduced size or fits cleanly under maxSizeBytes
          const useOriginal = compressedBlob.size >= file.size && file.size <= maxSizeBytes;
          const outputFile = useOriginal
            ? file
            : new File([compressedBlob], replaceFileExtension(file.name, resolvedExt), {
                type: resolvedType,
                lastModified: Date.now(),
              });

          const savedPercent =
            file.size > 0
              ? Math.max(0, Math.round(((file.size - outputFile.size) / file.size) * 100))
              : 0;

          settled = true;
          onProgress?.({
            percent: 100,
            elapsedSec: Math.round((performance.now() - startedAtMs) / 1000),
            estimatedTotalSec: Math.round(duration),
          });
          cleanup();

          resolve({
            file: outputFile,
            wasCompressed: !useOriginal,
            originalSizeBytes: file.size,
            compressedSizeBytes: outputFile.size,
            width: targetWidth,
            height: targetHeight,
            durationSeconds: duration,
            compressionRatioPercent: savedPercent,
          });
        };

        const drawCurrentFrame = () => {
          if (!ctx || !video || settled || signal?.aborted) return;
          try {
            ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
          } catch {
            // ignore transient frame read errors
          }
        };

        const scheduleNextPump = () => {
          if (!video || settled || signal?.aborted || video.ended) return;
          if ('requestVideoFrameCallback' in video) {
            pumpType = 'rvfc';
            pumpFrameId = (video as any).requestVideoFrameCallback(() => {
              drawCurrentFrame();
              scheduleNextPump();
            });
          } else {
            pumpType = 'raf';
            pumpFrameId = requestAnimationFrame(() => {
              drawCurrentFrame();
              scheduleNextPump();
            });
          }
        };

        const finalizeRecording = () => {
          if (settled) return;
          drawCurrentFrame();
          if (recorder && recorder.state !== 'inactive') {
            try {
              recorder.stop();
            } catch (err: any) {
              failWith(new Error(err?.message || 'Failed to finalize compressed video.'));
            }
          }
        };

        video.onended = () => {
          finalizeRecording();
        };

        progressInterval = setInterval(() => {
          if (!video || settled) return;
          const pct = Math.min(98, Math.max(1, Math.round((video.currentTime / duration) * 100)));
          const elapsedSec = Math.round((performance.now() - startedAtMs) / 1000);
          onProgress?.({
            percent: pct,
            elapsedSec,
            estimatedTotalSec: Math.max(1, Math.round(duration)),
          });

          if (video.ended || video.currentTime >= duration - 0.03) {
            finalizeRecording();
          }
        }, 200);

        onProgress?.({
          percent: 1,
          elapsedSec: 0,
          estimatedTotalSec: Math.max(1, Math.round(duration)),
        });

        try {
          video.currentTime = 0;
          recorder.start(500);
          drawCurrentFrame();
          scheduleNextPump();
          await video.play();
        } catch (playErr: any) {
          failWith(
            new Error(
              playErr?.message || 'Browser blocked offscreen video playback required for compression.'
            )
          );
        }
      };
    } catch (err: any) {
      failWith(new Error(err?.message || 'Unexpected video compression initialization error.'));
    }
  });
}
