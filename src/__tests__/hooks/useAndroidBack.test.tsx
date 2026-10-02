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
import { BackHandler, Platform, Text } from 'react-native';
import {
  createSheetScope,
  defineSheets,
  SheetModal,
  type SheetHandle,
} from '../../index';

function LabelSheet({ label }: { label: string; sheet: SheetHandle }) {
  return (
    <SheetModal>
      <Text>{label}</Text>
    </SheetModal>
  );
}

const { SheetScope, useSheets } = createSheetScope(
  defineSheets({
    label: {
      load: () => Promise.resolve({ default: LabelSheet }),
      unique: false,
    },
    // Never finishes loading.
    slow: () => new Promise<{ default: typeof LabelSheet }>(() => {}),
  })
);

type Sheets = ReturnType<typeof useSheets>;

// Jest runs as iOS, where BackHandler does nothing, so record listeners and
// call them the way Android does: most recently registered first.
type BackListener = Parameters<typeof BackHandler.addEventListener>[1];
let listeners: BackListener[] = [];

async function pressBack(): Promise<boolean> {
  let handled = false;
  await act(() => {
    handled = [...listeners]
      .reverse()
      .some(
        (listener) =>
          listener({ type: 'hardwareBackPress', timeStamp: 0 }) === true
      );
  });
  return handled;
}

const finishClosing = (id: string) =>
  fireEvent(screen.getByTestId(id), 'magicTap');

async function open(sheets: Sheets, label: string) {
  let promise!: ReturnType<Sheets['show']>;
  await act(() => {
    promise = sheets.show('label', { label });
  });
  await screen.findByText(label);
  // Wrapped: returning the promise itself would make the caller wait for the sheet to close.
  return { promise };
}

async function renderScopes({
  closeOnBack,
  screenCloseOnBack = closeOnBack,
}: { closeOnBack?: boolean; screenCloseOnBack?: boolean } = {}) {
  const scopes = {} as { root: Sheets; screen: Sheets };
  function Capture({ name }: { name: keyof typeof scopes }) {
    scopes[name] = useSheets();
    return null;
  }
  await render(
    <BottomSheetModalProvider>
      <SheetScope closeOnBack={closeOnBack}>
        <Capture name="root" />
        <SheetScope closeOnBack={screenCloseOnBack}>
          <Capture name="screen" />
        </SheetScope>
      </SheetScope>
    </BottomSheetModalProvider>
  );
  return scopes;
}

beforeEach(() => {
  jest.replaceProperty(Platform, 'OS', 'android');
  listeners = [];
  jest
    .spyOn(BackHandler, 'addEventListener')
    .mockImplementation((_, listener) => {
      listeners.push(listener);
      return {
        remove: () => {
          listeners = listeners.filter((l) => l !== listener);
        },
      };
    });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Android back', () => {
  it('closes the most recently opened sheet, across scopes', async () => {
    const scopes = await renderScopes();
    const { promise: first } = await open(scopes.screen, 'Screen 1');
    const { promise: second } = await open(scopes.root, 'Root 1');
    const { promise: third } = await open(scopes.screen, 'Screen 2');

    expect(await pressBack()).toBe(true);
    await finishClosing(third.id);
    await expect(third).resolves.toBeUndefined();

    // Not "Screen 1": the root scope's sheet opened after it.
    expect(await pressBack()).toBe(true);
    await finishClosing(second.id);
    await expect(second).resolves.toBeUndefined();

    expect(await pressBack()).toBe(true);
    await finishClosing(first.id);
    await expect(first).resolves.toBeUndefined();
  });

  it('removes its listener once no sheet is open', async () => {
    const scopes = await renderScopes();
    const { promise: sheet } = await open(scopes.screen, 'Only sheet');
    expect(listeners).toHaveLength(1);

    await pressBack();
    expect(listeners).toHaveLength(0);
    expect(await pressBack()).toBe(false);

    await finishClosing(sheet.id);
    await expect(sheet).resolves.toBeUndefined();
  });

  it('skips a sheet that is already closing', async () => {
    const scopes = await renderScopes();
    const { promise: bottom } = await open(scopes.screen, 'Bottom');
    const { promise: top } = await open(scopes.screen, 'Top');

    // Two presses, without waiting for the first close animation to end.
    expect(await pressBack()).toBe(true);
    expect(await pressBack()).toBe(true);

    expect(screen.getByTestId(top.id)).toBeBusy();
    expect(screen.getByTestId(bottom.id)).toBeBusy();
    expect(await pressBack()).toBe(false);

    await finishClosing(top.id);
    await finishClosing(bottom.id);
    await expect(top).resolves.toBeUndefined();
    await expect(bottom).resolves.toBeUndefined();
  });

  it('closes a sheet that is still loading', async () => {
    const scopes = await renderScopes();
    let promise!: ReturnType<Sheets['show']>;
    await act(() => {
      promise = scopes.screen.show('slow', { label: 'Never loads' });
    });
    expect(listeners).toHaveLength(1);

    expect(await pressBack()).toBe(true);

    await expect(promise).resolves.toBeUndefined();
    expect(listeners).toHaveLength(0);
  });

  it('shares one listener between scopes, until the last sheet closes', async () => {
    const scopes = await renderScopes();
    await open(scopes.root, 'Root');
    await open(scopes.screen, 'Screen');
    expect(BackHandler.addEventListener).toHaveBeenCalledTimes(1);
    expect(listeners).toHaveLength(1);

    await pressBack();
    expect(listeners).toHaveLength(1);

    await pressBack();
    expect(listeners).toHaveLength(0);
    expect(BackHandler.addEventListener).toHaveBeenCalledTimes(1);
  });

  it("doesn't swallow a back press that finds nothing left to close", async () => {
    const scopes = await renderScopes();
    await open(scopes.screen, 'Only sheet');
    const [listener] = listeners;
    const handled: unknown[] = [];

    // Both presses arrive before React re-renders and removes the listener.
    await act(() => {
      const event = { type: 'hardwareBackPress', timeStamp: 0 } as const;
      handled.push(listener?.(event), listener?.(event));
    });

    expect(handled).toEqual([true, false]);
  });

  it('removes its listener when a scope unmounts with a sheet open', async () => {
    const scopes = await renderScopes();
    const { promise: sheet } = await open(scopes.screen, 'Left open');
    expect(listeners).toHaveLength(1);

    await screen.unmount();

    expect(listeners).toHaveLength(0);
    await expect(sheet).resolves.toBeUndefined();
  });

  it('leaves back alone when closeOnBack is false', async () => {
    const scopes = await renderScopes({ closeOnBack: false });
    await open(scopes.screen, 'Stays open');

    expect(await pressBack()).toBe(false);
    expect(screen.getByText('Stays open')).toBeOnTheScreen();
    expect(BackHandler.addEventListener).not.toHaveBeenCalled();
  });

  it('skips only the scope that opted out', async () => {
    const scopes = await renderScopes({ screenCloseOnBack: false });
    const { promise: rootSheet } = await open(scopes.root, 'Root');
    // Opened later, but its scope opted out, so back goes to the root scope's sheet.
    const { promise: screenSheet } = await open(scopes.screen, 'Screen');

    expect(await pressBack()).toBe(true);

    expect(screen.getByTestId(rootSheet.id)).toBeBusy();
    expect(screen.getByTestId(screenSheet.id)).not.toBeBusy();
    expect(await pressBack()).toBe(false);
  });

  it.each(['ios', 'web'] as const)(
    "doesn't register a listener on %s",
    async (os) => {
      jest.replaceProperty(Platform, 'OS', os);
      const scopes = await renderScopes();
      await open(scopes.screen, 'Not Android');

      expect(BackHandler.addEventListener).not.toHaveBeenCalled();
    }
  );
});
