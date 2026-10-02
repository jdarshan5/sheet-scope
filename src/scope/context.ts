import type { SheetController, SheetRegistry } from '../types/registry';

/** What a `<SheetScope>` provides to its subtree. Each scope family has its own context. */
export type SheetScopeValue = {
  readonly controller: SheetController<SheetRegistry>;
  readonly parent: SheetScopeValue | null;
  readonly root: SheetScopeValue;
};
