import { describe, expect, it, jest } from '@jest/globals';
import { createSheetStore } from '../../core/createSheetStore';
import type { SheetInstance } from '../../types/sheet';

const instance = (
  id: string,
  overrides: Partial<SheetInstance> = {}
): SheetInstance => ({
  id,
  name: 'confirm',
  props: {},
  status: 'open',
  order: 0,
  ...overrides,
});

const ids = (store: ReturnType<typeof createSheetStore>) =>
  store.getSnapshot().map((i) => i.id);

describe('createSheetStore', () => {
  it('keeps the snapshot identity until something changes', () => {
    const store = createSheetStore();
    const empty = store.getSnapshot();

    expect(empty).toEqual([]);
    expect(store.getSnapshot()).toBe(empty);

    store.push(instance('a'));
    const one = store.getSnapshot();

    expect(one).not.toBe(empty);
    expect(store.getSnapshot()).toBe(one);
  });

  it('pushes onto the top of the stack', () => {
    const store = createSheetStore();
    store.push(instance('a'));
    store.push(instance('b'));

    expect(ids(store)).toEqual(['a', 'b']);
  });

  it('patch replaces only the instance it touches', () => {
    const store = createSheetStore();
    store.push(instance('a'));
    store.push(instance('b'));
    const [a, b] = store.getSnapshot();

    store.patch('b', { status: 'closing', result: true });
    const [a2, b2] = store.getSnapshot();

    expect(a2).toBe(a);
    expect(b2).not.toBe(b);
    expect(b2).toMatchObject({ id: 'b', status: 'closing', result: true });
    expect(b?.status).toBe('open');
  });

  it('patch keeps the instance in place, with the fields it was not given', () => {
    const store = createSheetStore();
    store.push(instance('a'));
    store.push(instance('b', { props: { title: 'B' }, order: 7 }));
    store.push(instance('c'));

    store.patch('b', { status: 'closing' });

    expect(ids(store)).toEqual(['a', 'b', 'c']);
    expect(store.getSnapshot()[1]).toEqual({
      id: 'b',
      name: 'confirm',
      props: { title: 'B' },
      status: 'closing',
      order: 7,
    });
  });

  it('removes one instance and clears all of them', () => {
    const store = createSheetStore();
    store.push(instance('a'));
    store.push(instance('b'));
    store.push(instance('c'));

    store.remove('b');
    expect(ids(store)).toEqual(['a', 'c']);

    store.clear();
    expect(ids(store)).toEqual([]);
  });

  it('notifies subscribers on every change and stops after unsubscribe', () => {
    const store = createSheetStore();
    const listener = jest.fn();
    const unsubscribe = store.subscribe(listener);

    store.push(instance('a'));
    store.patch('a', { status: 'closing' });
    store.remove('a');
    expect(listener).toHaveBeenCalledTimes(3);

    unsubscribe();
    store.push(instance('b'));
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it('has the new snapshot ready when it notifies', () => {
    const store = createSheetStore();
    const seen: string[][] = [];
    store.subscribe(() => seen.push(ids(store)));

    store.push(instance('a'));
    store.push(instance('b'));
    store.remove('a');
    store.clear();

    expect(seen).toEqual([['a'], ['a', 'b'], ['b'], []]);
  });

  it('notifies every subscriber, once per change', () => {
    const store = createSheetStore();
    const first = jest.fn();
    const second = jest.fn();
    store.subscribe(first);
    const unsubscribeSecond = store.subscribe(second);
    store.push(instance('a'));
    store.push(instance('b'));

    store.clear();
    expect(first).toHaveBeenCalledTimes(3);
    expect(second).toHaveBeenCalledTimes(3);

    unsubscribeSecond();
    store.push(instance('c'));
    expect(first).toHaveBeenCalledTimes(4);
    expect(second).toHaveBeenCalledTimes(3);
  });

  it('does nothing, and notifies no one, for changes that change nothing', () => {
    const store = createSheetStore();
    const listener = jest.fn();
    store.subscribe(listener);
    const empty = store.getSnapshot();

    store.patch('missing', { status: 'closing' });
    store.remove('missing');
    store.clear();

    expect(listener).not.toHaveBeenCalled();
    expect(store.getSnapshot()).toBe(empty);
  });
});
