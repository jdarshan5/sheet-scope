import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { defineSheets } from '../../core/defineSheets';
import type { SheetModule, SheetRegistry } from '../../types/registry';

const load = (): Promise<SheetModule> =>
  Promise.resolve({ default: () => null });

afterEach(() => {
  jest.restoreAllMocks();
});

describe('defineSheets', () => {
  it('returns the registry unchanged', () => {
    const sheets = { confirm: load, picker: { load, unique: false } };

    expect(defineSheets(sheets)).toBe(sheets);
  });

  it("doesn't call the loaders", () => {
    const loader = jest.fn(load);

    defineSheets({ confirm: loader, picker: { load: loader } });

    expect(loader).not.toHaveBeenCalled();
  });

  it('throws in dev for an entry without a loader', () => {
    expect(() =>
      defineSheets({
        // @ts-expect-error: an entry needs a loader
        broken: { unique: false },
      })
    ).toThrow('Sheet "broken" must be a loader');
  });

  it.each([
    ['null', null],
    ['a component instead of a loader', { default: () => null }],
    ['a load that is not a function', { load: './MySheet' }],
  ])('throws in dev for an entry that is %s', (_, entry) => {
    const sheets = { fine: load, broken: entry } as unknown as SheetRegistry;

    expect(() => defineSheets(sheets)).toThrow(
      "[sheet-scope] Sheet \"broken\" must be a loader, such as () => import('./MySheet'), or { load: () => import('./MySheet') }."
    );
  });

  it('skips the check in production', () => {
    jest.replaceProperty(
      globalThis as unknown as { __DEV__: boolean },
      '__DEV__',
      false
    );
    const sheets = { broken: null } as unknown as SheetRegistry;

    expect(defineSheets(sheets)).toBe(sheets);
  });
});
