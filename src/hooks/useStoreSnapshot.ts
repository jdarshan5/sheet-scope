import { useSyncExternalStore } from 'react';
import type { SheetStore } from '../core/createSheetStore';

export function useStoreSnapshot(store: SheetStore) {
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot
  );
}
