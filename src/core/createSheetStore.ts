import type { SheetInstance } from '../types/sheet';

export type SheetInstanceChanges = Partial<
  Pick<SheetInstance, 'props' | 'status' | 'result'>
>;

export type SheetStore = {
  getSnapshot(): readonly SheetInstance[];
  subscribe(listener: () => void): () => void;
  push(instance: SheetInstance): void;
  patch(id: string, changes: SheetInstanceChanges): void;
  remove(id: string): void;
  clear(): void;
};

/**
 * An immutable stack of open sheets, last = top. Every change replaces the
 * array, and `patch` replaces only the instance it touches, so other instances
 * keep their identity and their memoised components skip re-rendering.
 */
export function createSheetStore(): SheetStore {
  let instances: readonly SheetInstance[] = [];
  const listeners = new Set<() => void>();

  const commit = (next: readonly SheetInstance[]) => {
    instances = next;
    listeners.forEach((listener) => listener());
  };

  return {
    getSnapshot: () => instances,

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    push(instance) {
      commit([...instances, instance]);
    },

    patch(id, changes) {
      const index = instances.findIndex((instance) => instance.id === id);
      const current = instances[index];
      if (!current) {
        return;
      }
      const next = [...instances];
      next[index] = { ...current, ...changes };
      commit(next);
    },

    remove(id) {
      if (instances.some((instance) => instance.id === id)) {
        commit(instances.filter((instance) => instance.id !== id));
      }
    },

    clear() {
      if (instances.length > 0) {
        commit([]);
      }
    },
  };
}
