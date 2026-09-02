import { lazy, type ComponentType } from 'react';

/**
 * Production-hardened lazy wrapper for Vite dynamic imports.
 * Automatically catches 'Failed to fetch dynamically imported module' (caused by
 * asset cache skew after deployments) and reloads the browser to fetch fresh assets.
 */
export function lazyRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error: any) {
      const msg = error?.message || String(error);
      const isChunkError =
        msg.includes('Failed to fetch dynamically imported module') ||
        msg.includes('dynamically imported module') ||
        msg.includes('Importing a module script failed') ||
        msg.includes('error loading dynamically imported module') ||
        msg.includes('SyntaxError') ||
        error?.name === 'ChunkLoadError';

      if (isChunkError) {
        const reloadKey = 'revive_chunk_reload_' + (typeof window !== 'undefined' ? window.location.pathname : 'root');
        const lastReload = typeof window !== 'undefined' ? sessionStorage.getItem(reloadKey) : null;
        const now = Date.now();

        // Allow at most one automatic reload every 10 seconds to prevent loops
        if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
          if (typeof window !== 'undefined') {
            sessionStorage.setItem(reloadKey, String(now));
            window.location.reload();
          }
        }
      }
      throw error;
    }
  });
}
