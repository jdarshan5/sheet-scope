import type { SheetLoader, SheetModule } from '../types/registry';

const loading = new WeakMap<SheetLoader, Promise<SheetModule>>();
const loaded = new WeakMap<SheetLoader, SheetModule>();

/**
 * Shared by every scope and keyed by loader function. Concurrent loads share
 * one promise. A failed load is evicted so the next attempt retries, instead of
 * one flaky web-chunk fetch breaking the sheet for the rest of the session.
 */
export const loaderCache = {
  load(loader: SheetLoader): Promise<SheetModule> {
    const existing = loading.get(loader);
    if (existing) {
      return existing;
    }
    // Resolving with loader() turns a loader that throws synchronously into a rejection.
    const promise = new Promise<SheetModule>((resolve) => resolve(loader()))
      .then((mod) => {
        if (!mod || mod.default == null) {
          throw new Error(
            '[sheet-scope] Sheet module has no default export. Export the sheet component with `export default`.'
          );
        }
        loaded.set(loader, mod);
        return mod;
      })
      .catch((error: unknown) => {
        loading.delete(loader);
        throw error;
      });
    loading.set(loader, promise);
    return promise;
  },

  /** The module, if this loader has already loaded successfully. */
  get(loader: SheetLoader): SheetModule | undefined {
    return loaded.get(loader);
  },
};
