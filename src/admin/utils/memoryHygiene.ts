/**
 * Admin Memory Hygiene & Resource Lifecycle Manager
 * 
 * Strict protection against memory leaks, lingering object URLs,
 * and high-resolution canvas bitmap memory retained in browser heap/GPU.
 */

// Registry of temporary blob URLs specifically allocated during an admin editing session
const temporaryBlobUrls = new Set<string>();

/**
 * Register a temporary object URL created for image/video preview or canvas export
 */
export function registerTempBlobUrl(url: string): string {
  if (url && url.startsWith('blob:')) {
    temporaryBlobUrls.add(url);
  }
  return url;
}

/**
 * Safely revoke a single object URL and deregister from active memory
 */
export function revokeTempBlobUrl(url: string | null | undefined) {
  if (!url || !url.startsWith('blob:')) return;
  try {
    URL.revokeObjectURL(url);
    temporaryBlobUrls.delete(url);
  } catch {
    // Ignore browser errors on already-revoked URLs
  }
}

/**
 * Revoke ALL active temporary blob URLs created during this admin session
 */
export function drainAllTempBlobUrls() {
  temporaryBlobUrls.forEach((url) => {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // Ignore
    }
  });
  temporaryBlobUrls.clear();
}

/**
 * Clean up HTMLCanvasElement GPU memory backing store.
 * Setting dimensions to 0 releases the GPU frame buffer back to browser memory immediately.
 */
export function cleanupCanvas(canvas: HTMLCanvasElement | null) {
  if (!canvas) return;
  try {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    canvas.width = 0;
    canvas.height = 0;
  } catch {
    // Ignore
  }
}
