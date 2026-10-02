import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { createDeferred } from '../../core/createDeferred';
import { createSheetController } from '../../core/createSheetController';
import { createSheetStore } from '../../core/createSheetStore';
import type { SheetLoader, SheetModule } from '../../types/registry';

const Sheet = () => null;
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

// The loader cache is shared by every scope, so each test needs fresh loaders.
function setup({ unique }: { unique?: boolean } = {}) {
  const sheetModule = createDeferred<SheetModule>();
  const load = jest.fn<SheetLoader>(() => sheetModule.promise);
  const store = createSheetStore();
  const onError = jest.fn();
  const controller = createSheetController({
    registry: {
      confirm: { load, unique },
      other: () => Promise.resolve({ default: Sheet }),
    },
    store,
    onError,
  });
  const statuses = () => store.getSnapshot().map((i) => i.status);
  const loaded = async () => {
    sheetModule.resolve({ default: Sheet });
    await flush();
  };
  return { controller, store, load, sheetModule, onError, statuses, loaded };
}

const silenceWarnings = () =>
  jest.spyOn(console, 'warn').mockImplementation(() => {});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('createSheetController', () => {
  describe('opening', () => {
    it('opens a sheet once its module loads', async () => {
      const { controller, store, statuses, loaded } = setup();

      const promise = controller.show('confirm', { title: 'Delete?' });
      expect(statuses()).toEqual(['loading']);

      await loaded();
      expect(statuses()).toEqual(['open']);
      expect(store.getSnapshot()[0]).toMatchObject({
        id: promise.id,
        name: 'confirm',
        props: { title: 'Delete?' },
      });
    });

    it('opens straight away when the module is already loaded', async () => {
      const { controller, load, statuses, loaded } = setup();

      controller.preload('confirm');
      await loaded();
      controller.show('confirm');

      expect(statuses()).toEqual(['open']);
      expect(load).toHaveBeenCalledTimes(1);
    });

    it('preload loads the module without opening a sheet', async () => {
      const { controller, load, statuses, loaded } = setup();

      controller.preload('confirm');
      controller.preload('confirm');
      await loaded();

      expect(load).toHaveBeenCalledTimes(1);
      expect(statuses()).toEqual([]);
      expect(controller.isOpen('confirm')).toBe(false);
    });

    it('makes ids from the sheet name, unique across scopes', () => {
      const first = setup().controller.show('confirm');
      const second = setup().controller.show('confirm');

      expect(first.id).toMatch(/^confirm-\d+$/);
      expect(second.id).toMatch(/^confirm-\d+$/);
      expect(second.id).not.toBe(first.id);
    });

    it('numbers sheets in the order they open, across scopes', () => {
      const a = setup();
      const b = setup();
      const orders = (store: typeof a.store) =>
        store.getSnapshot().map((i) => i.order);

      a.controller.show('confirm');
      b.controller.show('confirm');
      a.controller.show('other');

      const [first = 0] = orders(a.store);
      expect(orders(a.store)).toEqual([first, first + 2]);
      expect(orders(b.store)).toEqual([first + 1]);
    });

    it('rejects show() for an unknown sheet', async () => {
      const { controller, statuses, onError } = setup();

      const promise = controller.show('nope');

      expect(promise.id).toMatch(/^nope-\d+$/);
      await expect(promise).rejects.toThrow(
        '[sheet-scope] Unknown sheet "nope".'
      );
      expect(statuses()).toEqual([]);
      // onError is for sheets that failed to load or render, not for a wrong name.
      expect(onError).not.toHaveBeenCalled();
    });

    it("doesn't mistake Object.prototype names for sheets", async () => {
      const warn = silenceWarnings();
      const { controller } = setup();

      await expect(controller.show('toString')).rejects.toThrow(
        'Unknown sheet "toString"'
      );
      controller.preload('constructor');
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('unknown sheet "constructor"')
      );
      expect(controller.getModule('hasOwnProperty')).toBeUndefined();
    });
  });

  describe('closing', () => {
    it('resolves with the result after gorhom reports the dismissal', async () => {
      const { controller, statuses, loaded } = setup();
      const promise = controller.show('confirm');
      await loaded();
      const settled = jest.fn();
      promise.then(settled);

      controller.close(promise.id, true);
      expect(statuses()).toEqual(['closing']);
      await flush();
      expect(settled).not.toHaveBeenCalled();

      controller.dismissed(promise.id);
      await expect(promise).resolves.toBe(true);
      expect(statuses()).toEqual([]);
    });

    it('resolves undefined when the sheet is swiped away', async () => {
      const { controller, statuses, loaded } = setup();
      const promise = controller.show('confirm');
      await loaded();

      controller.dismissed(promise.id);

      await expect(promise).resolves.toBeUndefined();
      expect(statuses()).toEqual([]);
    });

    it('keeps the first result when close is called twice', async () => {
      const { controller, loaded } = setup();
      const promise = controller.show('confirm');
      await loaded();

      controller.close(promise.id, 'first');
      controller.close(promise.id, 'second');
      controller.dismissed(promise.id);

      await expect(promise).resolves.toBe('first');
    });

    it('warns when closing a sheet that has already settled', async () => {
      const warn = silenceWarnings();
      const { controller, loaded } = setup();
      const promise = controller.show('confirm');
      await loaded();
      controller.dismissed(promise.id);

      controller.close(promise.id, true);

      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('has already closed')
      );
    });

    it('ignores a dismissal gorhom reports twice', async () => {
      const warn = silenceWarnings();
      const { controller, store, loaded } = setup();
      const promise = controller.show('confirm');
      await loaded();
      controller.close(promise.id, 'result');
      controller.dismissed(promise.id);
      const listener = jest.fn();
      store.subscribe(listener);

      controller.dismissed(promise.id);

      await expect(promise).resolves.toBe('result');
      expect(listener).not.toHaveBeenCalled();
      expect(warn).not.toHaveBeenCalled();
    });

    it('removes a sheet hidden while loading, without ever opening it', async () => {
      const { controller, statuses, loaded } = setup();
      const promise = controller.show('confirm');

      controller.hide(promise.id);
      expect(statuses()).toEqual([]);
      await expect(promise).resolves.toBeUndefined();

      await loaded();
      expect(statuses()).toEqual([]);
    });

    it('resolves with the result straight away when closed while loading', async () => {
      const { controller, statuses } = setup();
      const promise = controller.show('confirm');

      // No dismissed() call: the sheet was never presented, so gorhom has nothing to report.
      controller.close(promise.id, 'result');

      expect(statuses()).toEqual([]);
      await expect(promise).resolves.toBe('result');
    });

    it('hide closes an open sheet without a result', async () => {
      const { controller, statuses, loaded } = setup();
      const promise = controller.show('confirm');
      await loaded();

      controller.hide(promise.id);
      expect(statuses()).toEqual(['closing']);

      controller.dismissed(promise.id);
      await expect(promise).resolves.toBeUndefined();
    });

    it('hideAll closes open sheets and drops loading ones', async () => {
      const { controller, statuses, loaded } = setup();
      const confirm = controller.show('confirm');
      await loaded();
      const other = controller.show('other');
      expect(statuses()).toEqual(['open', 'loading']);

      controller.hideAll();

      expect(statuses()).toEqual(['closing']);
      await expect(other).resolves.toBeUndefined();
      controller.dismissed(confirm.id);
      await expect(confirm).resolves.toBeUndefined();
    });

    it('hideAll closes sheets from the top of the stack down', async () => {
      const { controller, store, loaded } = setup({ unique: false });
      controller.preload('confirm');
      await loaded();
      const bottom = controller.show('confirm');
      const top = controller.show('confirm');
      const patch = jest.spyOn(store, 'patch');

      controller.hideAll();

      expect(patch.mock.calls.map(([id]) => id)).toEqual([top.id, bottom.id]);
    });

    it('hideAll does nothing when no sheet is open', () => {
      const warn = silenceWarnings();
      const { controller, store } = setup();
      const listener = jest.fn();
      store.subscribe(listener);

      controller.hideAll();

      expect(listener).not.toHaveBeenCalled();
      expect(warn).not.toHaveBeenCalled();
    });
  });

  describe('unique', () => {
    it('returns the instance that is still loading and replaces its props', () => {
      const { controller, store } = setup();

      const first = controller.show('confirm', { title: 'A', danger: true });
      const second = controller.show('confirm', { title: 'B' });

      expect(second).toBe(first);
      expect(store.getSnapshot()).toHaveLength(1);
      expect(store.getSnapshot()[0]?.props).toEqual({ title: 'B' });
    });

    it('returns the same promise once the sheet has opened, too', async () => {
      const { controller, store, statuses, loaded } = setup();
      const first = controller.show('confirm', { title: 'A' });
      await loaded();

      const second = controller.show('confirm');

      expect(second).toBe(first);
      expect(statuses()).toEqual(['open']);
      // Props are replaced, not merged: a show() without props clears them.
      expect(store.getSnapshot()[0]?.props).toEqual({});
    });

    it('treats a bare loader as unique, and only dedupes by name', () => {
      const { controller, store } = setup();

      const confirm = controller.show('confirm');
      const first = controller.show('other');
      const second = controller.show('other');

      expect(second).toBe(first);
      expect(first.id).not.toBe(confirm.id);
      expect(store.getSnapshot().map((i) => i.name)).toEqual([
        'confirm',
        'other',
      ]);
    });

    it('opens a new instance after the previous one settled', async () => {
      const { controller, statuses, loaded } = setup();
      const first = controller.show('confirm');
      await loaded();
      controller.dismissed(first.id);

      const second = controller.show('confirm');

      expect(second).not.toBe(first);
      expect(second.id).not.toBe(first.id);
      expect(statuses()).toEqual(['open']);
    });

    it('opens a new instance while the previous one is closing', async () => {
      const { controller, statuses, loaded } = setup();
      const first = controller.show('confirm');
      await loaded();
      controller.close(first.id);

      const second = controller.show('confirm');

      expect(second.id).not.toBe(first.id);
      expect(statuses()).toEqual(['closing', 'open']);
    });

    it('stacks copies when unique is false', () => {
      const { controller, store } = setup({ unique: false });

      const first = controller.show('confirm');
      const second = controller.show('confirm');

      expect(second.id).not.toBe(first.id);
      expect(store.getSnapshot()).toHaveLength(2);
    });
  });

  describe('errors', () => {
    it('rejects, removes the sheet and reports the error when loading fails', async () => {
      const { controller, sheetModule, statuses, onError } = setup();
      const promise = controller.show('confirm');
      const error = new Error('chunk failed');

      sheetModule.reject(error);

      await expect(promise).rejects.toBe(error);
      expect(statuses()).toEqual([]);
      expect(onError).toHaveBeenCalledWith(error, {
        name: 'confirm',
        id: promise.id,
      });
    });

    it('retries the load on the next show after a failure', async () => {
      const { controller, sheetModule, load } = setup();
      const first = controller.show('confirm');
      sheetModule.reject(new Error('chunk failed'));
      await expect(first).rejects.toThrow('chunk failed');

      const second = controller.show('confirm');

      expect(load).toHaveBeenCalledTimes(2);
      await expect(second).rejects.toThrow('chunk failed');
    });

    it('rejects every instance waiting on the failed load', async () => {
      const { controller, sheetModule, load, statuses, onError } = setup({
        unique: false,
      });
      const first = controller.show('confirm');
      const second = controller.show('confirm');
      const error = new Error('chunk failed');

      sheetModule.reject(error);

      await expect(first).rejects.toBe(error);
      await expect(second).rejects.toBe(error);
      expect(load).toHaveBeenCalledTimes(1);
      expect(statuses()).toEqual([]);
      expect(onError.mock.calls).toEqual([
        [error, { name: 'confirm', id: first.id }],
        [error, { name: 'confirm', id: second.id }],
      ]);
    });

    it("doesn't report a failed load for a sheet hidden while it loaded", async () => {
      const { controller, sheetModule, onError } = setup();
      const promise = controller.show('confirm');
      controller.hide(promise.id);

      sheetModule.reject(new Error('chunk failed'));
      await flush();

      await expect(promise).resolves.toBeUndefined();
      expect(onError).not.toHaveBeenCalled();
    });

    it('preload swallows a failed load, and the next show() reports it', async () => {
      const { controller, sheetModule, load, onError } = setup();

      controller.preload('confirm');
      sheetModule.reject(new Error('chunk failed'));
      await flush();
      expect(onError).not.toHaveBeenCalled();

      const promise = controller.show('confirm');

      expect(load).toHaveBeenCalledTimes(2);
      await expect(promise).rejects.toThrow('chunk failed');
      expect(onError).toHaveBeenCalledTimes(1);
    });

    it('fail() rejects and reports a sheet that threw while rendering', async () => {
      const { controller, statuses, onError, loaded } = setup();
      const promise = controller.show('confirm');
      await loaded();
      const error = new Error('render failed');

      controller.fail(promise.id, error);

      await expect(promise).rejects.toBe(error);
      expect(statuses()).toEqual([]);
      expect(onError).toHaveBeenCalledWith(error, {
        name: 'confirm',
        id: promise.id,
      });
    });

    it('fail() only counts once, and not after the sheet settled', async () => {
      const { controller, onError, loaded } = setup({ unique: false });
      const failed = controller.show('confirm');
      await loaded();
      const settled = controller.show('confirm');
      controller.dismissed(settled.id);

      controller.fail(failed.id, new Error('first'));
      controller.fail(failed.id, new Error('second'));
      controller.fail(settled.id, new Error('too late'));

      await expect(failed).rejects.toThrow('first');
      await expect(settled).resolves.toBeUndefined();
      expect(onError).toHaveBeenCalledTimes(1);
    });

    it('fail() works without an onError callback', async () => {
      const store = createSheetStore();
      const controller = createSheetController({
        registry: { sheet: () => Promise.resolve({ default: Sheet }) },
        store,
      });
      const promise = controller.show('sheet');
      const error = new Error('render failed');

      expect(() => controller.fail(promise.id, error)).not.toThrow();

      await expect(promise).rejects.toBe(error);
      expect(store.getSnapshot()).toEqual([]);
    });
  });

  describe('update, isOpen and preload', () => {
    it('update merges into the current props', () => {
      const { controller, store } = setup();
      const promise = controller.show('confirm', { title: 'A', danger: true });

      controller.update(promise.id, { title: 'B' });

      expect(store.getSnapshot()[0]?.props).toEqual({
        title: 'B',
        danger: true,
      });
    });

    it('update only touches the sheet it names', async () => {
      const { controller, store, loaded } = setup({ unique: false });
      controller.preload('confirm');
      await loaded();
      const first = controller.show('confirm', { title: 'A' });
      const second = controller.show('confirm', { title: 'B' });
      const [before] = store.getSnapshot();

      controller.update(second.id, { title: 'C' });

      const [after, updated] = store.getSnapshot();
      expect(after).toBe(before);
      expect(updated).toMatchObject({
        id: second.id,
        status: 'open',
        props: { title: 'C' },
      });
      expect(after?.id).toBe(first.id);
    });

    it('warns when updating a sheet that has already closed', async () => {
      const warn = silenceWarnings();
      const { controller, store, loaded } = setup();
      const promise = controller.show('confirm');
      await loaded();
      controller.dismissed(promise.id);

      controller.update(promise.id, { title: 'Too late' });

      expect(warn).toHaveBeenCalledWith(
        `[sheet-scope] update() was called for sheet "${promise.id}", which has already closed.`
      );
      expect(store.getSnapshot()).toEqual([]);
    });

    it('isOpen is true while loading or open, and false once closing', async () => {
      const { controller, loaded } = setup();
      expect(controller.isOpen('confirm')).toBe(false);

      const promise = controller.show('confirm');
      expect(controller.isOpen('confirm')).toBe(true);
      // Only the named sheet counts.
      expect(controller.isOpen('other')).toBe(false);
      await loaded();
      expect(controller.isOpen('confirm')).toBe(true);

      controller.close(promise.id);
      expect(controller.isOpen('confirm')).toBe(false);
    });

    it('getModule returns the module once it has loaded', async () => {
      const { controller, loaded } = setup();
      controller.show('confirm');
      expect(controller.getModule('confirm')).toBeUndefined();

      await loaded();

      expect(controller.getModule('confirm')).toEqual({ default: Sheet });
      expect(controller.getModule('nope')).toBeUndefined();
    });

    it('warns when preloading an unknown sheet', () => {
      const warn = silenceWarnings();
      const { controller } = setup();

      controller.preload('nope');

      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('unknown sheet "nope"')
      );
    });
  });

  describe('dispose', () => {
    it('resolves every pending sheet and clears the store', async () => {
      const { controller, statuses, loaded } = setup({ unique: false });
      const closing = controller.show('confirm');
      await loaded();
      controller.close(closing.id, true);
      const open = controller.show('confirm');

      controller.dispose();

      expect(statuses()).toEqual([]);
      // The result the user already chose isn't lost because the screen unmounted.
      await expect(closing).resolves.toBe(true);
      await expect(open).resolves.toBeUndefined();
    });

    it('ignores a load that finishes after dispose', async () => {
      const { controller, statuses, loaded } = setup();
      const promise = controller.show('confirm');

      controller.dispose();
      await expect(promise).resolves.toBeUndefined();
      await loaded();

      expect(statuses()).toEqual([]);
    });

    it('ignores a load that fails after dispose', async () => {
      const { controller, sheetModule, onError } = setup();
      const promise = controller.show('confirm');

      controller.dispose();
      sheetModule.reject(new Error('chunk failed'));
      await flush();

      await expect(promise).resolves.toBeUndefined();
      expect(onError).not.toHaveBeenCalled();
    });

    it('ignores a dismissal gorhom reports after dispose', async () => {
      const { controller, statuses, loaded } = setup();
      const promise = controller.show('confirm');
      await loaded();
      controller.close(promise.id, 'result');

      controller.dispose();
      controller.dispose();
      controller.dismissed(promise.id);

      await expect(promise).resolves.toBe('result');
      expect(statuses()).toEqual([]);
    });

    it('opens sheets again after activate()', async () => {
      const { controller, statuses, loaded } = setup();
      controller.dispose();

      controller.activate();
      controller.show('confirm');
      await loaded();

      expect(statuses()).toEqual(['open']);
    });

    it('resolves show() with undefined after dispose, and warns', async () => {
      const warn = silenceWarnings();
      const { controller, load, statuses } = setup();
      controller.dispose();

      const promise = controller.show('confirm');

      expect(promise.id).toMatch(/^confirm-\d+$/);
      await expect(promise).resolves.toBeUndefined();
      expect(statuses()).toEqual([]);
      expect(load).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('after its <SheetScope> unmounted')
      );
    });
  });
});
