import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import {
  Activity,
  Component,
  StrictMode,
  useEffect,
  type ReactNode,
} from 'react';
import { Pressable, Text } from 'react-native';
import {
  createSheetScope,
  defineSheets,
  SheetModal,
  useSheetHandle,
  type SheetHandle,
} from '../../index';

// Calls show() inside act(). The promise comes back wrapped: returning it from an
// async function would make the caller wait for the sheet to close.
async function open<T>(start: () => T): Promise<{ promise: T }> {
  let promise!: T;
  await act(() => {
    promise = start();
  });
  return { promise };
}

// In the gorhom fake (__mocks__/), magicTap on a modal's content ends its close animation.
const finishClosing = (id: string) =>
  fireEvent(screen.getByTestId(id), 'magicTap');

function ConfirmSheet({
  title,
  sheet,
}: {
  title: string;
  sheet: SheetHandle<boolean>;
}) {
  return (
    <SheetModal>
      <Text>{title}</Text>
      <Pressable onPress={() => sheet.close(true)}>
        <Text>Yes</Text>
      </Pressable>
    </SheetModal>
  );
}

function DeepCloseButton() {
  const handle = useSheetHandle<string>();
  const sheets = useSheets();
  return (
    <Pressable
      onPress={() => {
        // Throws if the scope's context didn't reach the portaled content.
        sheets.preload('confirm');
        handle.close('from deep inside');
      }}
    >
      <Text>Close from deep</Text>
    </Pressable>
  );
}

function DeepSheet(_: { sheet: SheetHandle<string> }) {
  return (
    <SheetModal>
      <DeepCloseButton />
    </SheetModal>
  );
}

// What a sheet's portaled content gets from useSheets().
let probed: { nearest: Sheets; root: Sheets } | undefined;

function ScopeProbe() {
  probed = { nearest: useSheets(), root: useSheets('root') };
  return <Text>Probe</Text>;
}

function ProbeSheet(_: { sheet: SheetHandle }) {
  return (
    <SheetModal>
      <ScopeProbe />
    </SheetModal>
  );
}

const { SheetScope, useSheets } = createSheetScope(
  defineSheets({
    confirm: () => Promise.resolve({ default: ConfirmSheet }),
    deep: () => Promise.resolve({ default: DeepSheet }),
    probe: () => Promise.resolve({ default: ProbeSheet }),
    broken: (): Promise<{ default: typeof ConfirmSheet }> =>
      Promise.reject(new Error('chunk failed')),
  })
);

type Sheets = ReturnType<typeof useSheets>;

function Capture({
  onSheets,
  target,
}: {
  onSheets: (sheets: Sheets) => void;
  target?: 'root';
}) {
  onSheets(useSheets(target));
  return null;
}

class CatchError extends Component<
  { onError: (error: unknown) => void; children?: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    this.props.onError(error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

async function renderScope(children?: ReactNode) {
  let sheets!: Sheets;
  await render(
    <BottomSheetModalProvider>
      <SheetScope>
        <Capture onSheets={(s) => (sheets = s)} />
        {children}
      </SheetScope>
    </BottomSheetModalProvider>
  );
  return sheets;
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('createSheetScope', () => {
  it('opens a sheet and resolves with its result after the close animation', async () => {
    const sheets = await renderScope();

    const { promise } = await open(() =>
      sheets.show('confirm', { title: 'Delete?' })
    );
    expect(await screen.findByText('Delete?')).toBeOnTheScreen();

    const settled = jest.fn();
    promise.then(settled);
    await fireEvent.press(screen.getByText('Yes'));
    expect(settled).not.toHaveBeenCalled();

    await finishClosing(promise.id);
    await expect(promise).resolves.toBe(true);
    expect(screen.queryByText('Delete?')).not.toBeOnTheScreen();
  });

  it('resolves undefined when the user swipes the sheet away', async () => {
    const sheets = await renderScope();
    const { promise } = await open(() =>
      sheets.show('confirm', { title: 'Delete?' })
    );
    await screen.findByText('Delete?');

    await fireEvent(screen.getByTestId(promise.id), 'accessibilityEscape');

    await expect(promise).resolves.toBeUndefined();
    expect(screen.queryByText('Delete?')).not.toBeOnTheScreen();
  });

  it('applies update() to the open sheet', async () => {
    const sheets = await renderScope();
    const { promise } = await open(() =>
      sheets.show('confirm', { title: 'Delete?' })
    );
    await screen.findByText('Delete?');

    await act(() => sheets.update(promise.id, { title: 'Really?' }));

    expect(screen.getByText('Really?')).toBeOnTheScreen();
  });

  it('closes a sheet hidden before it was presented, without animating', async () => {
    const sheets = await renderScope();
    await act(async () => {
      sheets.preload('confirm');
    });

    // The module is loaded, so this instance starts 'open' and is closed in the same tick.
    const { promise } = await open(() => {
      const shown = sheets.show('confirm', { title: 'Never seen' });
      sheets.hide(shown.id);
      return shown;
    });

    await expect(promise).resolves.toBeUndefined();
    expect(screen.queryByText('Never seen')).not.toBeOnTheScreen();
  });

  it('returns the same promise for a unique sheet that is already open, with the new props', async () => {
    const sheets = await renderScope();
    const { promise: first } = await open(() =>
      sheets.show('confirm', { title: 'Delete?' })
    );
    await screen.findByText('Delete?');

    const { promise: second } = await open(() =>
      sheets.show('confirm', { title: 'Really?' })
    );

    expect(second).toBe(first);
    expect(screen.getByText('Really?')).toBeOnTheScreen();
    expect(screen.queryByText('Delete?')).not.toBeOnTheScreen();
    expect(screen.getAllByText('Yes')).toHaveLength(1);
  });

  it('hideAll closes every open sheet, and isOpen follows', async () => {
    const sheets = await renderScope();
    expect(sheets.isOpen('confirm')).toBe(false);
    const { promise: confirm } = await open(() =>
      sheets.show('confirm', { title: 'Delete?' })
    );
    const { promise: deep } = await open(() => sheets.show('deep'));
    await screen.findByText('Close from deep');
    expect(sheets.isOpen('confirm')).toBe(true);
    expect(sheets.isOpen('deep')).toBe(true);

    await act(() => sheets.hideAll());

    expect(sheets.isOpen('confirm')).toBe(false);
    expect(sheets.isOpen('deep')).toBe(false);
    expect(screen.getByTestId(confirm.id)).toBeBusy();
    expect(screen.getByTestId(deep.id)).toBeBusy();

    await finishClosing(deep.id);
    await finishClosing(confirm.id);
    await expect(confirm).resolves.toBeUndefined();
    await expect(deep).resolves.toBeUndefined();
  });

  it('gives useSheets() the same controller on every render, with only the public methods', async () => {
    const seen: Sheets[] = [];
    const app = () => (
      <BottomSheetModalProvider>
        <SheetScope>
          <Capture onSheets={(s) => seen.push(s)} />
        </SheetScope>
      </BottomSheetModalProvider>
    );
    const { rerender } = await render(app());

    await rerender(app());

    expect(seen.length).toBeGreaterThan(1);
    expect(new Set(seen).size).toBe(1);
    expect(Object.keys(seen[0] ?? {}).sort()).toEqual([
      'hide',
      'hideAll',
      'isOpen',
      'preload',
      'show',
      'update',
    ]);
  });

  it('calls the latest onError, without re-creating the scope', async () => {
    const first = jest.fn();
    const second = jest.fn();
    let sheets!: Sheets;
    const app = (onError: typeof first) => (
      <BottomSheetModalProvider>
        <SheetScope onError={onError}>
          <Capture onSheets={(s) => (sheets = s)} />
        </SheetScope>
      </BottomSheetModalProvider>
    );
    const { rerender } = await render(app(first));
    const before = sheets;
    await rerender(app(second));

    const { promise } = await open(() => {
      const shown = sheets.show('broken', { title: 'Never seen' });
      // It rejects during act(), before the test attaches `.rejects`.
      shown.catch(() => {});
      return shown;
    });

    await expect(promise).rejects.toThrow('chunk failed');
    expect(sheets).toBe(before);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'chunk failed' }),
      { name: 'broken', id: promise.id }
    );
  });

  it("doesn't re-render the screen when a sheet opens", async () => {
    let renders = 0;
    let sheets!: Sheets;
    function Screen() {
      renders += 1;
      sheets = useSheets();
      return null;
    }
    await renderScope(<Screen />);
    const before = renders;

    await open(() => sheets.show('confirm', { title: 'Delete?' }));
    await screen.findByText('Delete?');

    expect(renders).toBe(before);
  });

  it('gives portaled sheet content its handle and scope', async () => {
    const sheets = await renderScope();
    const { promise } = await open(() => sheets.show('deep'));

    await fireEvent.press(await screen.findByText('Close from deep'));
    await finishClosing(promise.id);

    await expect(promise).resolves.toBe('from deep inside');
  });

  describe('unmounting', () => {
    it('resolves open sheets, and refuses new ones', async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const sheets = await renderScope();
      const { promise } = await open(() =>
        sheets.show('confirm', { title: 'Delete?' })
      );
      await screen.findByText('Delete?');

      await screen.unmount();

      await expect(promise).resolves.toBeUndefined();
      await expect(
        sheets.show('confirm', { title: 'Too late' })
      ).resolves.toBeUndefined();
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('after its <SheetScope> unmounted')
      );
    });

    it('still delivers a result the sheet had already closed with', async () => {
      const sheets = await renderScope();
      const { promise } = await open(() =>
        sheets.show('confirm', { title: 'Delete?' })
      );
      await fireEvent.press(await screen.findByText('Yes'));

      // The close animation never finishes: the screen goes away first.
      await screen.unmount();

      await expect(promise).resolves.toBe(true);
    });

    it('closes its sheets while hidden in an <Activity>, and opens new ones once visible again', async () => {
      let sheets!: Sheets;
      const app = (mode: 'visible' | 'hidden') => (
        <BottomSheetModalProvider>
          <Activity mode={mode}>
            <SheetScope>
              <Capture onSheets={(s) => (sheets = s)} />
            </SheetScope>
          </Activity>
        </BottomSheetModalProvider>
      );
      const { rerender } = await render(app('visible'));
      const { promise } = await open(() =>
        sheets.show('confirm', { title: 'Before' })
      );
      await screen.findByText('Before');

      await rerender(app('hidden'));
      await expect(promise).resolves.toBeUndefined();
      expect(screen.queryByText('Before')).not.toBeOnTheScreen();

      await rerender(app('visible'));
      await open(() => sheets.show('confirm', { title: 'After' }));
      expect(await screen.findByText('After')).toBeOnTheScreen();
      expect(screen.queryByText('Before')).not.toBeOnTheScreen();
    });
  });

  describe('nested scopes', () => {
    it('resolves the nearest scope, or the root one on request', async () => {
      let root!: Sheets;
      let nearest!: Sheets;
      let rootFromNested!: Sheets;
      await render(
        <BottomSheetModalProvider>
          <SheetScope>
            <Capture onSheets={(s) => (root = s)} />
            <SheetScope>
              <Capture onSheets={(s) => (nearest = s)} />
              <Capture onSheets={(s) => (rootFromNested = s)} target="root" />
            </SheetScope>
          </SheetScope>
        </BottomSheetModalProvider>
      );

      expect(nearest).not.toBe(root);
      expect(rootFromNested).toBe(root);
    });

    it('treats the outermost scope as root from any depth', async () => {
      let root!: Sheets;
      let middle!: Sheets;
      let rootFromMiddle!: Sheets;
      let deepest!: Sheets;
      let rootFromDeepest!: Sheets;
      await render(
        <BottomSheetModalProvider>
          <SheetScope>
            <Capture onSheets={(s) => (root = s)} />
            <SheetScope>
              <Capture onSheets={(s) => (middle = s)} />
              <Capture onSheets={(s) => (rootFromMiddle = s)} target="root" />
              <SheetScope>
                <Capture onSheets={(s) => (deepest = s)} />
                <Capture
                  onSheets={(s) => (rootFromDeepest = s)}
                  target="root"
                />
              </SheetScope>
            </SheetScope>
          </SheetScope>
        </BottomSheetModalProvider>
      );

      expect(new Set([root, middle, deepest]).size).toBe(3);
      expect(rootFromMiddle).toBe(root);
      expect(rootFromDeepest).toBe(root);
    });

    it("gives a sheet's content the scope that opened it", async () => {
      let root!: Sheets;
      let nested!: Sheets;
      await render(
        <BottomSheetModalProvider>
          <SheetScope>
            <Capture onSheets={(s) => (root = s)} />
            <SheetScope>
              <Capture onSheets={(s) => (nested = s)} />
            </SheetScope>
          </SheetScope>
        </BottomSheetModalProvider>
      );

      // gorhom portals the content to the provider, above both scopes.
      const { promise: fromNested } = await open(() => nested.show('probe'));
      await screen.findByText('Probe');
      expect(probed?.nearest).toBe(nested);
      expect(probed?.root).toBe(root);

      await act(() => nested.hide(fromNested.id));
      await finishClosing(fromNested.id);
      await open(() => root.show('probe'));
      await screen.findByText('Probe');
      expect(probed?.nearest).toBe(root);
      expect(probed?.root).toBe(root);
    });

    it('keeps scope families apart', async () => {
      const other = createSheetScope(
        defineSheets({
          confirm: () => Promise.resolve({ default: ConfirmSheet }),
        })
      );
      let outer!: Sheets;
      let insideOther!: Sheets;
      let otherNearest!: ReturnType<typeof other.useSheets>;
      let otherRoot!: ReturnType<typeof other.useSheets>;
      function OtherCapture() {
        otherNearest = other.useSheets();
        otherRoot = other.useSheets('root');
        return null;
      }
      await render(
        <BottomSheetModalProvider>
          <SheetScope>
            <Capture onSheets={(s) => (outer = s)} />
            <other.SheetScope>
              <Capture onSheets={(s) => (insideOther = s)} />
              <OtherCapture />
            </other.SheetScope>
          </SheetScope>
        </BottomSheetModalProvider>
      );

      // The other family's scope is invisible to this family's hook, and is its own root.
      expect(insideOther).toBe(outer);
      expect(otherNearest).not.toBe(outer);
      expect(otherRoot).toBe(otherNearest);

      await open(() => otherNearest.show('confirm', { title: 'Other family' }));
      await screen.findByText('Other family');
      expect(otherNearest.isOpen('confirm')).toBe(true);
      expect(outer.isOpen('confirm')).toBe(false);
    });

    it("closes a nested scope's sheets when it unmounts, and keeps the root's", async () => {
      let root!: Sheets;
      let nested!: Sheets;
      const app = (withNested: boolean) => (
        <BottomSheetModalProvider>
          <SheetScope>
            <Capture onSheets={(s) => (root = s)} />
            {withNested && (
              <SheetScope>
                <Capture onSheets={(s) => (nested = s)} />
              </SheetScope>
            )}
          </SheetScope>
        </BottomSheetModalProvider>
      );
      const { rerender } = await render(app(true));
      const { promise: screenSheet } = await open(() =>
        nested.show('confirm', { title: 'Screen sheet' })
      );
      await open(() => root.show('confirm', { title: 'App sheet' }));
      await screen.findByText('App sheet');

      await rerender(app(false));

      await expect(screenSheet).resolves.toBeUndefined();
      expect(screen.queryByText('Screen sheet')).not.toBeOnTheScreen();
      expect(screen.getByText('App sheet')).toBeOnTheScreen();
    });
  });

  it('opens a sheet from a mount effect under StrictMode', async () => {
    function OpenOnMount() {
      const sheets = useSheets();
      useEffect(() => {
        sheets.show('confirm', { title: 'Hello' });
      }, [sheets]);
      return null;
    }

    await render(
      <StrictMode>
        <BottomSheetModalProvider>
          <SheetScope>
            <OpenOnMount />
          </SheetScope>
        </BottomSheetModalProvider>
      </StrictMode>
    );

    expect(await screen.findAllByText('Hello')).toHaveLength(1);
  });

  it('settles sheets, and disposes on unmount, under StrictMode', async () => {
    let sheets!: Sheets;
    await render(
      <StrictMode>
        <BottomSheetModalProvider>
          <SheetScope>
            <Capture onSheets={(s) => (sheets = s)} />
          </SheetScope>
        </BottomSheetModalProvider>
      </StrictMode>
    );

    const { promise: closed } = await open(() =>
      sheets.show('confirm', { title: 'Delete?' })
    );
    await fireEvent.press(await screen.findByText('Yes'));
    await finishClosing(closed.id);
    await expect(closed).resolves.toBe(true);

    const { promise: leftOpen } = await open(() =>
      sheets.show('confirm', { title: 'Left open' })
    );
    await screen.findByText('Left open');
    await screen.unmount();
    await expect(leftOpen).resolves.toBeUndefined();
  });

  describe('setup errors', () => {
    it('throws when a scope is outside BottomSheetModalProvider', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const onError = jest.fn();

      await render(
        <CatchError onError={onError}>
          <SheetScope />
        </CatchError>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining(
            'must be inside BottomSheetModalProvider'
          ),
        })
      );
    });

    it("doesn't check for BottomSheetModalProvider in production", async () => {
      jest.replaceProperty(
        globalThis as unknown as { __DEV__: boolean },
        '__DEV__',
        false
      );

      await render(
        <SheetScope>
          <Text>Screen</Text>
        </SheetScope>
      );

      expect(screen.getByText('Screen')).toBeOnTheScreen();
    });

    it('throws when useSheetHandle() is called outside a sheet', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const onError = jest.fn();
      function Outside() {
        useSheetHandle();
        return null;
      }

      await render(
        <BottomSheetModalProvider>
          <SheetScope>
            <CatchError onError={onError}>
              <Outside />
            </CatchError>
          </SheetScope>
        </BottomSheetModalProvider>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining(
            'useSheetHandle() must be called inside a sheet'
          ),
        })
      );
    });

    it('throws when useSheets() is called outside a scope', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const onError = jest.fn();

      await render(
        <CatchError onError={onError}>
          <Capture onSheets={() => {}} />
        </CatchError>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining(
            'useSheets() must be called inside <SheetScope>'
          ),
        })
      );
    });
  });
});
