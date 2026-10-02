import { describe, expect, it, jest } from '@jest/globals';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import {
  createSheetScope,
  defineSheets,
  SheetModal,
  type SheetHandle,
} from '../../index';

type Behavior = 'switch' | 'push' | 'replace';

function LevelSheet({
  label,
  behavior,
}: {
  label: string;
  behavior?: Behavior;
  sheet: SheetHandle<string>;
}) {
  return (
    <SheetModal stackBehavior={behavior}>
      <Text>{label}</Text>
    </SheetModal>
  );
}

function CallbackRefSheet(_: { sheet: SheetHandle }) {
  return (
    <SheetModal ref={() => {}}>
      <Text>Callback ref</Text>
    </SheetModal>
  );
}

const { SheetScope, useSheets } = createSheetScope(
  defineSheets({
    level: {
      load: () => Promise.resolve({ default: LevelSheet }),
      unique: false,
    },
    callbackRef: () => Promise.resolve({ default: CallbackRefSheet }),
  })
);

type Sheets = ReturnType<typeof useSheets>;

// Returns the promise wrapped, so the caller doesn't wait for the sheet to close.
async function open(sheets: Sheets, label: string, behavior?: Behavior) {
  let promise!: ReturnType<typeof sheets.show<'level'>>;
  await act(() => {
    promise = sheets.show('level', { label, behavior });
  });
  await screen.findByText(label);
  return { promise };
}

// In the gorhom fake, magicTap on a modal's content ends its close animation.
const finishClosing = (id: string) =>
  fireEvent(screen.getByTestId(id), 'magicTap');

async function renderScope() {
  let sheets!: Sheets;
  function Capture() {
    sheets = useSheets();
    return null;
  }
  await render(
    <BottomSheetModalProvider>
      <SheetScope>
        <Capture />
      </SheetScope>
    </BottomSheetModalProvider>
  );
  return sheets;
}

describe('stackBehavior', () => {
  it("'switch' minimises the sheet below, and restores it when the top one closes", async () => {
    const sheets = await renderScope();
    const { promise: first } = await open(sheets, 'First');
    const settled = jest.fn();
    first.then(settled);

    const { promise: second } = await open(sheets, 'Second', 'switch');
    expect(screen.queryByText('First')).not.toBeOnTheScreen();

    await act(() => sheets.hide(second.id));
    await finishClosing(second.id);

    expect(screen.getByText('First')).toBeOnTheScreen();
    expect(settled).not.toHaveBeenCalled();
  });

  it("'replace' dismisses the sheet below, which resolves undefined", async () => {
    const sheets = await renderScope();
    const { promise: first } = await open(sheets, 'First');

    await open(sheets, 'Second', 'replace');
    // gorhom started dismissing the first sheet; the fake marks it busy until its animation ends.
    expect(screen.getByTestId(first.id)).toBeBusy();
    await finishClosing(first.id);

    await expect(first).resolves.toBeUndefined();
    expect(screen.queryByText('First')).not.toBeOnTheScreen();
    expect(screen.getByText('Second')).toBeOnTheScreen();
  });

  it("'replace' still reaches a sheet that gave SheetModal a callback ref", async () => {
    const sheets = await renderScope();
    let below!: ReturnType<typeof sheets.show<'callbackRef'>>;
    await act(() => {
      below = sheets.show('callbackRef');
    });
    await screen.findByText('Callback ref');

    // gorhom calls `ref.current.dismiss()` on the ref it was given, which only works for a ref object.
    await open(sheets, 'Second', 'replace');
    expect(screen.getByTestId(below.id)).toBeBusy();
    await finishClosing(below.id);

    await expect(below).resolves.toBeUndefined();
  });

  it("'push' leaves the sheet below on screen", async () => {
    const sheets = await renderScope();
    await open(sheets, 'First');

    await open(sheets, 'Second', 'push');

    expect(screen.getByText('First')).toBeOnTheScreen();
    expect(screen.getByText('Second')).toBeOnTheScreen();
  });
});
