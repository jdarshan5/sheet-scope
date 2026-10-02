import { describe, expect, it, jest } from '@jest/globals';
import { loaderCache } from '../../core/loaderCache';
import type { SheetLoader, SheetModule } from '../../types/registry';

// The cache is module-level and keyed by loader, so every test makes its own loaders.
const Sheet = () => null;
const sheetModule: SheetModule = { default: Sheet };

describe('loaderCache', () => {
  it('shares one load between concurrent calls', async () => {
    const loader = jest.fn<SheetLoader>(() => Promise.resolve(sheetModule));

    const first = loaderCache.load(loader);
    const second = loaderCache.load(loader);

    expect(second).toBe(first);
    await expect(first).resolves.toBe(sheetModule);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('returns the module synchronously once it has loaded', async () => {
    const loader: SheetLoader = () => Promise.resolve(sheetModule);

    expect(loaderCache.get(loader)).toBeUndefined();
    const loading = loaderCache.load(loader);
    // Not before the load has finished.
    expect(loaderCache.get(loader)).toBeUndefined();
    await loading;
    expect(loaderCache.get(loader)).toBe(sheetModule);
  });

  it("doesn't call the loader again once it has loaded", async () => {
    const loader = jest.fn<SheetLoader>(() => Promise.resolve(sheetModule));
    await loaderCache.load(loader);

    await expect(loaderCache.load(loader)).resolves.toBe(sheetModule);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('caches by loader function, not by the module it returns', async () => {
    const first = jest.fn<SheetLoader>(() => Promise.resolve(sheetModule));
    const second = jest.fn<SheetLoader>(() => Promise.resolve(sheetModule));

    await loaderCache.load(first);

    expect(loaderCache.get(second)).toBeUndefined();
    await loaderCache.load(second);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('shares one failure between concurrent calls', async () => {
    const loader = jest
      .fn<SheetLoader>()
      .mockRejectedValue(new Error('chunk failed'));

    const first = loaderCache.load(loader);
    const second = loaderCache.load(loader);

    await expect(first).rejects.toThrow('chunk failed');
    await expect(second).rejects.toThrow('chunk failed');
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('evicts a failed load so the next call retries', async () => {
    const loader = jest
      .fn<SheetLoader>()
      .mockRejectedValueOnce(new Error('chunk failed'))
      .mockResolvedValueOnce(sheetModule);

    await expect(loaderCache.load(loader)).rejects.toThrow('chunk failed');
    expect(loaderCache.get(loader)).toBeUndefined();

    await expect(loaderCache.load(loader)).resolves.toBe(sheetModule);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('turns a loader that throws synchronously into a rejection', async () => {
    const loader: SheetLoader = () => {
      throw new Error('bad import');
    };

    await expect(loaderCache.load(loader)).rejects.toThrow('bad import');
    expect(loaderCache.get(loader)).toBeUndefined();
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['a null default export', { default: null }],
  ])('rejects a loader that resolves with %s', async (_, value) => {
    const loader: SheetLoader = () =>
      Promise.resolve(value as unknown as SheetModule);

    await expect(loaderCache.load(loader)).rejects.toThrow(
      '[sheet-scope] Sheet module has no default export.'
    );
    expect(loaderCache.get(loader)).toBeUndefined();
  });

  it('rejects a module without a default export', async () => {
    const loader = jest.fn<SheetLoader>(() =>
      Promise.resolve({} as SheetModule)
    );

    await expect(loaderCache.load(loader)).rejects.toThrow('no default export');
    expect(loaderCache.get(loader)).toBeUndefined();

    await expect(loaderCache.load(loader)).rejects.toThrow('no default export');
    expect(loader).toHaveBeenCalledTimes(2);
  });
});
