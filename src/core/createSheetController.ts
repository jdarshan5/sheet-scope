import type {
  SheetLoader,
  SheetModule,
  SheetRegistry,
} from '../types/registry';
import type { SheetId, SheetProps, SheetPromise } from '../types/sheet';
import { warn } from '../utils/warn';
import { createDeferred, type Deferred } from './createDeferred';
import { createId } from './createId';
import type { SheetStore } from './createSheetStore';
import { loaderCache } from './loaderCache';

export type SheetErrorInfo = { readonly name: string; readonly id: string };

export type CreateSheetControllerOptions = {
  registry: SheetRegistry;
  store: SheetStore;
  /** Called after a sheet's promise rejects because it failed to load or render. */
  onError?: (error: unknown, info: SheetErrorInfo) => void;
};

/**
 * The untyped controller behind one scope. The scope layer exposes the first
 * six methods to consumers with registry types applied; the rest are for the
 * React layer.
 */
export type CoreSheetController = {
  show(name: string, props?: SheetProps): SheetPromise<unknown>;
  hide(id: string): void;
  hideAll(): void;
  /** Shallow-merges `props` into the instance's current props. */
  update(id: string, props: SheetProps): void;
  preload(name: string): void;
  /** True while a sheet with this name is loading or open, not once it's closing. */
  isOpen(name: string): boolean;
  /** `sheet.close(result)` from inside a sheet. The first close wins. */
  close(id: string, result?: unknown): void;
  /** gorhom finished dismissing the modal: remove it and resolve its promise. */
  dismissed(id: string): void;
  /** The sheet failed to load or render: remove it and reject its promise. */
  fail(id: string, error: unknown): void;
  /** The loaded module for a sheet name, once its loader has resolved. */
  getModule(name: string): SheetModule | undefined;
  /** The scope unmounted: resolve every pending promise and clear the store. A result already recorded by `close` is delivered; otherwise `undefined`. */
  dispose(): void;
  /** The scope's effects ran again after a dispose (e.g. a hidden `<Activity>` became visible): accept `show()` again. */
  activate(): void;
};

type Entry = { load: SheetLoader; unique: boolean };

type Pending = {
  deferred: Deferred<unknown>;
  promise: SheetPromise<unknown>;
};

// Shared by every scope, so Android back can find the most recently opened sheet anywhere.
let lastOrder = 0;

const withId = <T>(promise: Promise<T>, id: string): SheetPromise<T> =>
  Object.assign(promise, { id: id as SheetId });

export function createSheetController({
  registry,
  store,
  onError,
}: CreateSheetControllerOptions): CoreSheetController {
  // A Map rather than the registry object, so names like "toString" can't hit the prototype.
  const entries = new Map<string, Entry>(
    Object.entries(registry).map(([name, entry]) => [
      name,
      typeof entry === 'function'
        ? { load: entry, unique: true }
        : { load: entry.load, unique: entry.unique ?? true },
    ])
  );
  // Promises live outside the store, so settling one never triggers a render.
  const pending = new Map<string, Pending>();
  let disposed = false;

  const find = (id: string) =>
    store.getSnapshot().find((instance) => instance.id === id);

  const settle = (id: string, result: unknown) => {
    const entry = pending.get(id);
    pending.delete(id);
    store.remove(id);
    entry?.deferred.resolve(result);
  };

  const controller: CoreSheetController = {
    show(name, props = {}) {
      if (disposed) {
        warn(
          `show("${name}") was called after its <SheetScope> unmounted, so the sheet won't open.`
        );
        return withId(Promise.resolve(undefined), createId(name));
      }

      const entry = entries.get(name);
      if (!entry) {
        return withId(
          Promise.reject(new Error(`[sheet-scope] Unknown sheet "${name}".`)),
          createId(name)
        );
      }

      if (entry.unique) {
        // A closing instance doesn't count: tapping again while it animates out opens a new one.
        const existing = store
          .getSnapshot()
          .find(
            (instance) =>
              instance.name === name && instance.status !== 'closing'
          );
        const existingPending = existing && pending.get(existing.id);
        if (existing && existingPending) {
          store.patch(existing.id, { props });
          return existingPending.promise;
        }
      }

      const id = createId(name);
      const order = ++lastOrder;
      const deferred = createDeferred<unknown>();
      const promise = withId(deferred.promise, id);
      pending.set(id, { deferred, promise });

      if (loaderCache.get(entry.load)) {
        store.push({ id, name, props, status: 'open', order });
        return promise;
      }

      store.push({ id, name, props, status: 'loading', order });
      loaderCache.load(entry.load).then(
        () => {
          // The sheet may have been hidden, or the scope disposed, while it loaded.
          if (find(id)?.status === 'loading') {
            store.patch(id, { status: 'open' });
          }
        },
        (error: unknown) => controller.fail(id, error)
      );
      return promise;
    },

    hide(id) {
      controller.close(id);
    },

    hideAll() {
      const instances = store.getSnapshot();
      for (let i = instances.length - 1; i >= 0; i--) {
        const instance = instances[i];
        if (instance) {
          controller.close(instance.id);
        }
      }
    },

    update(id, props) {
      const instance = find(id);
      if (!instance) {
        warn(
          `update() was called for sheet "${id}", which has already closed.`
        );
        return;
      }
      store.patch(id, { props: { ...instance.props, ...props } });
    },

    preload(name) {
      const entry = entries.get(name);
      if (!entry) {
        warn(`preload() was called with unknown sheet "${name}".`);
        return;
      }
      loaderCache.load(entry.load).catch(() => {
        // The failed load was evicted. show() will retry it and report the error.
      });
    },

    isOpen(name) {
      return store
        .getSnapshot()
        .some(
          (instance) => instance.name === name && instance.status !== 'closing'
        );
    },

    close(id, result) {
      const instance = find(id);
      if (!instance) {
        warn(`Sheet "${id}" has already closed.`);
        return;
      }
      if (instance.status === 'loading') {
        // Never presented, so there's no dismissal to wait for.
        settle(id, result);
      } else if (instance.status === 'open') {
        store.patch(id, { status: 'closing', result });
      }
    },

    dismissed(id) {
      const instance = find(id);
      if (instance) {
        settle(id, instance.result);
      }
    },

    fail(id, error) {
      const instance = find(id);
      const entry = pending.get(id);
      if (!instance || !entry) {
        return;
      }
      pending.delete(id);
      store.remove(id);
      entry.deferred.reject(error);
      onError?.(error, { name: instance.name, id });
    },

    dispose() {
      disposed = true;
      // A sheet already closing with a result (the user tapped "Delete") still delivers it.
      const results = new Map(
        store.getSnapshot().map((instance) => [instance.id, instance.result])
      );
      const toSettle = [...pending];
      pending.clear();
      store.clear();
      toSettle.forEach(([id, { deferred }]) =>
        deferred.resolve(results.get(id))
      );
    },

    activate() {
      disposed = false;
    },

    getModule(name) {
      const entry = entries.get(name);
      return entry && loaderCache.get(entry.load);
    },
  };

  return controller;
}
