import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import {
  BottomSheetModalProvider,
  type BottomSheetModal,
} from '@gorhom/bottom-sheet';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useRef, useEffect } from 'react';
import { Text } from 'react-native';
import {
  createSheetScope,
  defineSheets,
  SheetModal,
  type SheetHandle,
} from '../../index';

// Calls show() inside act(), and returns the promise wrapped so the caller doesn't wait on it.
async function open<T extends Promise<unknown>>(
  start: () => T
): Promise<{ promise: T }> {
  let promise!: T;
  await act(() => {
    promise = start();
    // These sheets reject during act(), before the test attaches `.rejects`.
    promise.catch(() => {});
  });
  return { promise };
}

// In the gorhom fake (__mocks__/), magicTap on a modal's content ends its close animation.
const finishClosing = (id: string) =>
  fireEvent(screen.getByTestId(id), 'magicTap');

// In the gorhom fake, accessibilityEscape stands in for the user swiping the sheet down.
const swipeAway = (id: string) =>
  fireEvent(screen.getByTestId(id), 'accessibilityEscape');

function Thrower(): never {
  throw new Error('content failed');
}

let forwardedRef: BottomSheetModal | null = null;
let callbackRef: BottomSheetModal | null = null;
const ownOnDismiss = jest.fn();

// What the SheetModalProps type forbids, passed anyway.
const forbiddenProps = {
  name: 'custom-name',
  enableDismissOnClose: false,
} as object;

const sheetModules = {
  stable: (_: { sheet: SheetHandle }) => (
    <SheetModal>
      <Text>Stable sheet</Text>
    </SheetModal>
  ),
  noModal: (_: { sheet: SheetHandle }) => <Text>No modal</Text>,
  twoModals: (_: { sheet: SheetHandle }) => (
    <>
      <SheetModal>
        <Text>First</Text>
      </SheetModal>
      <SheetModal>
        <Text>Second</Text>
      </SheetModal>
    </>
  ),
  throwsInContent: (_: { sheet: SheetHandle }) => (
    <SheetModal>
      <Thrower />
    </SheetModal>
  ),
  throwsInBody: (_: { sheet: SheetHandle }): never => {
    throw new Error('body failed');
  },
  withRef: function WithRef(_: { sheet: SheetHandle }) {
    const ref = useRef<BottomSheetModal>(null);
    useEffect(() => {
      forwardedRef = ref.current;
    });
    return (
      <SheetModal ref={ref}>
        <Text>With ref</Text>
      </SheetModal>
    );
  },
  withCallbackRef: (_: { sheet: SheetHandle }) => (
    <SheetModal
      ref={(modal) => {
        callbackRef = modal;
      }}
    >
      <Text>With callback ref</Text>
    </SheetModal>
  ),
  overrides: (_: { sheet: SheetHandle }) => (
    <SheetModal {...forbiddenProps}>
      <Text>Overrides</Text>
    </SheetModal>
  ),
  withOnDismiss: ({ sheet }: { sheet: SheetHandle<string> }) => (
    <SheetModal onDismiss={ownOnDismiss}>
      <Text onPress={() => sheet.close('done')}>Close with a result</Text>
    </SheetModal>
  ),
  // Its onDismiss closes over a prop, so each render passes a new function.
  labelled: ({ label }: { label: string; sheet: SheetHandle }) => (
    <SheetModal onDismiss={() => ownOnDismiss(label)}>
      <Text>{label}</Text>
    </SheetModal>
  ),
};

const { SheetScope, useSheets } = createSheetScope(
  defineSheets({
    stable: () => Promise.resolve({ default: sheetModules.stable }),
    noModal: () => Promise.resolve({ default: sheetModules.noModal }),
    twoModals: () => Promise.resolve({ default: sheetModules.twoModals }),
    throwsInContent: () =>
      Promise.resolve({ default: sheetModules.throwsInContent }),
    throwsInBody: () => Promise.resolve({ default: sheetModules.throwsInBody }),
    withRef: () => Promise.resolve({ default: sheetModules.withRef }),
    withCallbackRef: () =>
      Promise.resolve({ default: sheetModules.withCallbackRef }),
    overrides: () => Promise.resolve({ default: sheetModules.overrides }),
    withOnDismiss: () =>
      Promise.resolve({ default: sheetModules.withOnDismiss }),
    labelled: () => Promise.resolve({ default: sheetModules.labelled }),
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
  onError.mockClear();
  // Reset, not clear: one test makes it throw.
  ownOnDismiss.mockReset();
  // React logs errors caught by boundaries; the tests assert on them directly.
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('SheetModal', () => {
  it.each([
    ['noModal', 'rendered 0'],
    ['twoModals', 'rendered 2'],
  ] satisfies Array<[keyof typeof sheetModules, string]>)(
    'rejects a sheet that renders the wrong number of SheetModals (%s)',
    async (name, detail) => {
      const sheets = await renderScope();

      const { promise } = await open(() => sheets.show(name));

      await expect(promise).rejects.toThrow(
        `Sheet "${name}" must render exactly one <SheetModal>`
      );
      await expect(promise).rejects.toThrow(detail);
      expect(onError).toHaveBeenCalledWith(expect.any(Error), {
        name,
        id: promise.id,
      });
    }
  );

  it.each([
    ['throwsInContent', 'content failed'],
    ['throwsInBody', 'body failed'],
  ] satisfies Array<[keyof typeof sheetModules, string]>)(
    'isolates a render error to its own sheet (%s)',
    async (name, message) => {
      const sheets = await renderScope();
      await open(() => sheets.show('stable'));
      await screen.findByText('Stable sheet');

      const { promise } = await open(() => sheets.show(name));

      await expect(promise).rejects.toThrow(message);
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message }),
        { name, id: promise.id }
      );
      expect(screen.getByText('Screen')).toBeOnTheScreen();
      expect(screen.getByText('Stable sheet')).toBeOnTheScreen();
    }
  );

  it("forwards its ref to gorhom's modal", async () => {
    const sheets = await renderScope();

    await open(() => sheets.show('withRef'));
    await screen.findByText('With ref');

    expect(forwardedRef?.snapToIndex).toEqual(expect.any(Function));
  });

  it('forwards a callback ref too, and clears it when the sheet closes', async () => {
    const sheets = await renderScope();

    const { promise } = await open(() => sheets.show('withCallbackRef'));
    await screen.findByText('With callback ref');
    expect(callbackRef?.dismiss).toEqual(expect.any(Function));

    await fireEvent(screen.getByTestId(promise.id), 'accessibilityEscape');
    await expect(promise).resolves.toBeUndefined();
    expect(callbackRef).toBeNull();
  });

  it("keeps control of the modal's name and enableDismissOnClose", async () => {
    const sheets = await renderScope();

    const { promise } = await open(() => sheets.show('overrides'));
    await screen.findByText('Overrides');
    expect(screen.queryByTestId('custom-name')).not.toBeOnTheScreen();

    // gorhom only reports a swipe-down while enableDismissOnClose is on.
    await fireEvent(screen.getByTestId(promise.id), 'accessibilityEscape');

    expect(screen.queryByText('Overrides')).not.toBeOnTheScreen();
    await expect(promise).resolves.toBeUndefined();
  });

  describe("the sheet's own onDismiss", () => {
    it('runs once the close animation ends, and the promise still resolves with the result', async () => {
      const sheets = await renderScope();

      const { promise } = await open(() => sheets.show('withOnDismiss'));
      await fireEvent.press(await screen.findByText('Close with a result'));
      // Still animating closed.
      expect(ownOnDismiss).not.toHaveBeenCalled();

      await finishClosing(promise.id);

      expect(ownOnDismiss).toHaveBeenCalledTimes(1);
      await expect(promise).resolves.toBe('done');
    });

    it('runs when the user swipes the sheet away', async () => {
      const sheets = await renderScope();
      const { promise } = await open(() => sheets.show('withOnDismiss'));
      await screen.findByText('Close with a result');

      await swipeAway(promise.id);

      expect(ownOnDismiss).toHaveBeenCalledTimes(1);
      await expect(promise).resolves.toBeUndefined();
    });

    it('runs when the sheet is hidden from outside', async () => {
      const sheets = await renderScope();
      const { promise } = await open(() => sheets.show('withOnDismiss'));
      await screen.findByText('Close with a result');

      await act(() => sheets.hide(promise.id));
      expect(ownOnDismiss).not.toHaveBeenCalled();
      await finishClosing(promise.id);

      expect(ownOnDismiss).toHaveBeenCalledTimes(1);
      await expect(promise).resolves.toBeUndefined();
    });

    it('runs for each sheet that closes, once each', async () => {
      const sheets = await renderScope();
      const { promise: first } = await open(() =>
        sheets.show('labelled', { label: 'First' })
      );
      const { promise: second } = await open(() =>
        sheets.show('withOnDismiss')
      );
      await screen.findByText('Close with a result');

      await act(() => sheets.hideAll());
      await finishClosing(second.id);
      expect(ownOnDismiss).toHaveBeenCalledTimes(1);
      await finishClosing(first.id);

      expect(ownOnDismiss).toHaveBeenCalledTimes(2);
      expect(ownOnDismiss).toHaveBeenLastCalledWith('First');
    });

    it('uses the function from the latest render', async () => {
      const sheets = await renderScope();
      const { promise } = await open(() =>
        sheets.show('labelled', { label: 'Before' })
      );
      await screen.findByText('Before');
      await act(() => sheets.update(promise.id, { label: 'After' }));
      await screen.findByText('After');

      await swipeAway(promise.id);

      expect(ownOnDismiss).toHaveBeenCalledTimes(1);
      expect(ownOnDismiss).toHaveBeenCalledWith('After');
    });

    it("doesn't run for a sheet hidden before it was presented", async () => {
      const sheets = await renderScope();
      await act(async () => {
        sheets.preload('withOnDismiss');
      });

      // The module is loaded, so this instance starts 'open' and is closed in the same tick.
      const { promise } = await open(() => {
        const shown = sheets.show('withOnDismiss');
        sheets.hide(shown.id);
        return shown;
      });

      await expect(promise).resolves.toBeUndefined();
      expect(ownOnDismiss).not.toHaveBeenCalled();
    });

    it('settles the promise even when it throws', async () => {
      const sheets = await renderScope();
      ownOnDismiss.mockImplementation(() => {
        throw new Error('own onDismiss failed');
      });
      const { promise } = await open(() => sheets.show('withOnDismiss'));
      await fireEvent.press(await screen.findByText('Close with a result'));

      // The library's handler ran first, so the throw can't strand the sheet.
      await expect(finishClosing(promise.id)).rejects.toThrow(
        'own onDismiss failed'
      );

      await expect(promise).resolves.toBe('done');
      expect(screen.queryByText('Close with a result')).not.toBeOnTheScreen();
      expect(sheets.isOpen('withOnDismiss')).toBe(false);
    });
  });

  it('throws when rendered outside a sheet', async () => {
    await expect(
      render(
        <BottomSheetModalProvider>
          <SheetModal>
            <Text>Orphan</Text>
          </SheetModal>
        </BottomSheetModalProvider>
      )
    ).rejects.toThrow('<SheetModal> must be the root of a sheet component');
  });
});
