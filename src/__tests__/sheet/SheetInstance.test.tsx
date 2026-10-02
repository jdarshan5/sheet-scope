import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import {
  createSheetScope,
  defineSheets,
  SheetModal,
  useSheetHandle,
  type SheetHandle,
} from '../../index';

// Calls show() inside act(), and returns the promise wrapped so the caller doesn't wait on it.
async function open<T extends Promise<unknown>>(
  start: () => T
): Promise<{ promise: T }> {
  let promise!: T;
  await act(() => {
    promise = start();
    // Some of these sheets reject during act(), before the test attaches `.rejects`.
    promise.catch(() => {});
  });
  return { promise };
}

type NoteProps = {
  title: string;
  pinned?: boolean;
  explode?: boolean;
  sheet: SheetHandle;
};

// Per instance id: how often the sheet rendered, and every handle it was given.
let renders: Record<string, number> = {};
let handles: Record<string, Array<SheetHandle<unknown>>> = {};

function NoteContent() {
  const handle = useSheetHandle();
  (handles[handle.id] ??= []).push(handle);
  return null;
}

function NoteSheet({ title, pinned, explode, sheet }: NoteProps) {
  renders[sheet.id] = (renders[sheet.id] ?? 0) + 1;
  (handles[sheet.id] ??= []).push(sheet, useSheetHandle());
  if (explode) {
    throw new Error('update failed');
  }
  return (
    <SheetModal>
      <Text>{pinned ? `${title} (pinned)` : title}</Text>
      <Pressable onPress={() => sheet.update({ title: `${title}!` })}>
        <Text>{`Rename ${title}`}</Text>
      </Pressable>
      <NoteContent />
    </SheetModal>
  );
}

const { SheetScope, useSheets } = createSheetScope(
  defineSheets({
    note: {
      load: () => Promise.resolve({ default: NoteSheet }),
      unique: false,
    },
  })
);

type Sheets = ReturnType<typeof useSheets>;

const onError = jest.fn();

async function renderScope() {
  let sheets!: Sheets;
  function Capture() {
    sheets = useSheets();
    return null;
  }
  await render(
    <BottomSheetModalProvider>
      <SheetScope onError={onError}>
        <Text>Screen</Text>
        <Capture />
      </SheetScope>
    </BottomSheetModalProvider>
  );
  return sheets;
}

beforeEach(() => {
  renders = {};
  handles = {};
  onError.mockClear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('SheetInstance', () => {
  it('gives the sheet one handle, as a prop and through useSheetHandle()', async () => {
    const sheets = await renderScope();

    const { promise } = await open(() => sheets.show('note', { title: 'A' }));
    await screen.findByText('A');
    await act(() => sheets.update(promise.id, { title: 'B' }));
    await screen.findByText('B');

    // The prop, the hook in the sheet's body, and the hook in its portaled
    // content, across two renders: all the same object.
    const seen = handles[promise.id] ?? [];
    expect(seen.length).toBeGreaterThanOrEqual(6);
    expect(new Set(seen).size).toBe(1);
    expect(seen[0]?.id).toBe(promise.id);
  });

  it('sheet.update() merges props from inside the sheet', async () => {
    const sheets = await renderScope();
    await open(() => sheets.show('note', { title: 'A', pinned: true }));

    await fireEvent.press(await screen.findByText('Rename A'));

    expect(screen.getByText('A! (pinned)')).toBeOnTheScreen();
    expect(screen.queryByText('A (pinned)')).not.toBeOnTheScreen();
  });

  it('re-renders only the sheet whose props changed', async () => {
    const sheets = await renderScope();
    const { promise: first } = await open(() =>
      sheets.show('note', { title: 'A' })
    );
    const { promise: second } = await open(() =>
      sheets.show('note', { title: 'B' })
    );
    await screen.findByText('B');
    const before = { ...renders };

    await act(() => sheets.update(second.id, { title: 'C' }));

    expect(screen.getByText('C')).toBeOnTheScreen();
    expect(renders[second.id]).toBeGreaterThan(before[second.id] ?? 0);
    expect(renders[first.id]).toBe(before[first.id]);
  });

  it("doesn't re-render an open sheet when another one opens or closes", async () => {
    const sheets = await renderScope();
    const { promise: first } = await open(() =>
      sheets.show('note', { title: 'A' })
    );
    await screen.findByText('A');
    const before = renders[first.id];

    const { promise: second } = await open(() =>
      sheets.show('note', { title: 'B' })
    );
    await screen.findByText('B');
    await act(() => sheets.hide(second.id));
    await fireEvent(screen.getByTestId(second.id), 'magicTap');
    await expect(second).resolves.toBeUndefined();

    expect(renders[first.id]).toBe(before);
  });

  it('rejects an open sheet that throws on a later render, and leaves the rest alone', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const sheets = await renderScope();
    await open(() => sheets.show('note', { title: 'Stable' }));
    const { promise } = await open(() =>
      sheets.show('note', { title: 'Fragile' })
    );
    await screen.findByText('Fragile');

    await act(() => sheets.update(promise.id, { explode: true }));

    await expect(promise).rejects.toThrow('update failed');
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'update failed' }),
      { name: 'note', id: promise.id }
    );
    expect(screen.queryByText('Fragile')).not.toBeOnTheScreen();
    expect(screen.getByText('Stable')).toBeOnTheScreen();
    expect(screen.getByText('Screen')).toBeOnTheScreen();
    expect(sheets.isOpen('note')).toBe(true);
  });
});
