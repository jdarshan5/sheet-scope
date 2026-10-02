import { useEffect, useSyncExternalStore } from 'react';
import {
  BackHandler,
  Platform,
  type NativeEventSubscription,
} from 'react-native';
import type { CoreSheetController } from '../core/createSheetController';
import type { SheetStore } from '../core/createSheetStore';
import type { SheetInstance } from '../types/sheet';

type BackScope = {
  readonly store: SheetStore;
  readonly controller: CoreSheetController;
};

// One listener serves every scope, so back can compare sheets across scopes.
const scopes = new Set<BackScope>();
let subscription: NativeEventSubscription | null = null;

function topOpenSheet(store: SheetStore): SheetInstance | undefined {
  const instances = store.getSnapshot();
  for (let i = instances.length - 1; i >= 0; i--) {
    const instance = instances[i];
    if (instance && instance.status !== 'closing') {
      return instance;
    }
  }
  return undefined;
}

const hasOpenSheet = (store: SheetStore) => topOpenSheet(store) !== undefined;

function closeMostRecentSheet(): boolean {
  let target: { scope: BackScope; instance: SheetInstance } | undefined;
  for (const scope of scopes) {
    const instance = topOpenSheet(scope.store);
    if (instance && (!target || instance.order > target.instance.order)) {
      target = { scope, instance };
    }
  }
  if (!target) {
    return false;
  }
  target.scope.controller.close(target.instance.id);
  return true;
}

/**
 * Android's hardware back closes the most recently opened sheet, in any scope.
 * The listener is only registered while some sheet is open, so it registers
 * after a navigator's own back listener, and React Native calls it first.
 */
export function useAndroidBack(
  store: SheetStore,
  controller: CoreSheetController,
  enabled: boolean
): void {
  const hasOpen = useSyncExternalStore(
    store.subscribe,
    () => hasOpenSheet(store),
    () => hasOpenSheet(store)
  );

  useEffect(() => {
    // BackHandler only does something on Android, and react-native-web logs an error when it's used.
    if (Platform.OS !== 'android' || !enabled || !hasOpen) {
      return undefined;
    }
    const scope = { store, controller };
    scopes.add(scope);
    subscription ??= BackHandler.addEventListener(
      'hardwareBackPress',
      closeMostRecentSheet
    );
    return () => {
      scopes.delete(scope);
      if (scopes.size === 0) {
        subscription?.remove();
        subscription = null;
      }
    };
  }, [controller, enabled, hasOpen, store]);
}
