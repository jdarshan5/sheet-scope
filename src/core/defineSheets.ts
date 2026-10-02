import type { SheetRegistry } from '../types/registry';
import { invariant } from '../utils/invariant';

/**
 * Declares a scope family's sheets. It returns its argument unchanged; it exists
 * so the registry's type is inferred and checked where it's written.
 */
export function defineSheets<R extends SheetRegistry>(sheets: R): R {
  if (__DEV__) {
    for (const [name, entry] of Object.entries(sheets)) {
      const load = typeof entry === 'function' ? entry : entry?.load;
      invariant(
        typeof load === 'function',
        `Sheet "${name}" must be a loader, such as () => import('./MySheet'), or { load: () => import('./MySheet') }.`
      );
    }
  }
  return sheets;
}
