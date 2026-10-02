import { afterEach, beforeEach, expect, it, jest } from '@jest/globals';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { createDeferred } from '../../core/createDeferred';
import {
  createSheetScope,
  defineSheets,
  SheetModal,
  type SheetHandle,
} from '../../index';

function Sheet(_: { sheet: SheetHandle }) {
  return (
    <SheetModal>
      <Text>Sheet content</Text>
    </SheetModal>
  );
}

type Module = { default: typeof Sheet };

// The loader cache is shared and keyed by loader, so each test gets a scope family with fresh loaders.
async function renderScope() {
  const slow = createDeferred<Module>();
  const alsoSlow = createDeferred<Module>();
  const { SheetScope, useSheets } = createSheetScope(
    defineSheets({
      slow: () => slow.promise,
      alsoSlow: () => alsoSlow.promise,
      fast: () => Promise.resolve({ default: Sheet }),
    })
  );
  let sheets!: ReturnType<typeof useSheets>;
  function Capture() {
    sheets = useSheets();
    return null;
  }
  await render(
    <BottomSheetModalProvider>
      <SheetScope loadingIndicator={<Text>Loading…</Text>}>
        <Capture />
      </SheetScope>
    </BottomSheetModalProvider>
  );
  return { sheets, slow, alsoSlow };
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

it('shows the indicator once a load has taken 150 ms, until the sheet opens', async () => {
  const { sheets, slow } = await renderScope();
  await act(() => {
    sheets.show('slow');
  });

  await act(() => jest.advanceTimersByTime(149));
  expect(screen.queryByText('Loading…')).not.toBeOnTheScreen();

  await act(() => jest.advanceTimersByTime(1));
  expect(screen.getByText('Loading…')).toBeOnTheScreen();

  await act(async () => slow.resolve({ default: Sheet }));
  expect(screen.queryByText('Loading…')).not.toBeOnTheScreen();
  expect(screen.getByText('Sheet content')).toBeOnTheScreen();
});

it("doesn't show the indicator for a sheet that loads quickly", async () => {
  const { sheets } = await renderScope();
  await act(async () => {
    sheets.show('fast');
  });

  await act(() => jest.advanceTimersByTime(500));

  expect(screen.getByText('Sheet content')).toBeOnTheScreen();
  expect(screen.queryByText('Loading…')).not.toBeOnTheScreen();
});

it("doesn't show the indicator for a load that finishes just before 150 ms", async () => {
  const { sheets, slow } = await renderScope();
  await act(() => {
    sheets.show('slow');
  });

  await act(() => jest.advanceTimersByTime(149));
  await act(async () => slow.resolve({ default: Sheet }));
  await act(() => jest.advanceTimersByTime(500));

  expect(screen.getByText('Sheet content')).toBeOnTheScreen();
  expect(screen.queryByText('Loading…')).not.toBeOnTheScreen();
});

it('hides the indicator when the loading sheet is hidden', async () => {
  const { sheets } = await renderScope();
  let promise!: ReturnType<typeof sheets.show<'slow'>>;
  await act(() => {
    promise = sheets.show('slow');
  });
  await act(() => jest.advanceTimersByTime(150));
  expect(screen.getByText('Loading…')).toBeOnTheScreen();

  await act(() => sheets.hide(promise.id));

  expect(screen.queryByText('Loading…')).not.toBeOnTheScreen();
  await expect(promise).resolves.toBeUndefined();
});

it('hides the indicator when the load fails', async () => {
  const { sheets, slow } = await renderScope();
  let promise!: ReturnType<typeof sheets.show<'slow'>>;
  await act(() => {
    promise = sheets.show('slow');
    // It rejects during act(), before the test attaches `.rejects`.
    promise.catch(() => {});
  });
  await act(() => jest.advanceTimersByTime(150));
  expect(screen.getByText('Loading…')).toBeOnTheScreen();

  await act(async () => slow.reject(new Error('chunk failed')));

  expect(screen.queryByText('Loading…')).not.toBeOnTheScreen();
  await expect(promise).rejects.toThrow('chunk failed');
});

it('starts the delay again for a load that starts later', async () => {
  const { sheets } = await renderScope();
  let first!: ReturnType<typeof sheets.show<'slow'>>;
  await act(() => {
    first = sheets.show('slow');
  });
  await act(() => jest.advanceTimersByTime(100));
  await act(() => sheets.hide(first.id));

  await act(() => {
    sheets.show('slow');
  });
  // 150 ms after the first show(), but only 50 ms after the second.
  await act(() => jest.advanceTimersByTime(50));
  expect(screen.queryByText('Loading…')).not.toBeOnTheScreen();

  await act(() => jest.advanceTimersByTime(100));
  expect(screen.getByText('Loading…')).toBeOnTheScreen();
});

it('waits the full delay again after the indicator has been shown once', async () => {
  const { sheets } = await renderScope();
  let first!: ReturnType<typeof sheets.show<'slow'>>;
  await act(() => {
    first = sheets.show('slow');
  });
  await act(() => jest.advanceTimersByTime(150));
  expect(screen.getByText('Loading…')).toBeOnTheScreen();
  await act(() => sheets.hide(first.id));

  await act(() => {
    sheets.show('slow');
  });
  expect(screen.queryByText('Loading…')).not.toBeOnTheScreen();
  await act(() => jest.advanceTimersByTime(149));
  expect(screen.queryByText('Loading…')).not.toBeOnTheScreen();

  await act(() => jest.advanceTimersByTime(1));
  expect(screen.getByText('Loading…')).toBeOnTheScreen();
});

it('keeps the indicator while another sheet is still loading', async () => {
  const { sheets, slow, alsoSlow } = await renderScope();
  await act(() => {
    sheets.show('slow');
    sheets.show('alsoSlow');
  });
  await act(() => jest.advanceTimersByTime(150));
  expect(screen.getByText('Loading…')).toBeOnTheScreen();

  await act(async () => slow.resolve({ default: Sheet }));
  expect(screen.getByText('Sheet content')).toBeOnTheScreen();
  expect(screen.getByText('Loading…')).toBeOnTheScreen();

  await act(async () => alsoSlow.resolve({ default: Sheet }));
  expect(screen.queryByText('Loading…')).not.toBeOnTheScreen();
});
