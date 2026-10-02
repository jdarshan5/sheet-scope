import type { BottomSheetModalProps } from '@gorhom/bottom-sheet';
import type { ReactNode } from 'react';

export type SheetStatus = 'loading' | 'open' | 'closing';

export type SheetProps = Readonly<Record<string, unknown>>;

/** One open sheet. Plain data: every change to it goes through the store. */
export type SheetInstance = {
  readonly id: string;
  readonly name: string;
  readonly props: SheetProps;
  readonly status: SheetStatus;
  /** When it opened, relative to every sheet in every scope. Android back closes the highest. */
  readonly order: number;
  /** Recorded by `close(result)`, and delivered once gorhom reports the dismissal. */
  readonly result?: unknown;
};

declare const sheetName: unique symbol;

/**
 * An instance id. It's a string at runtime; the phantom sheet name lets
 * `update(id, props)` check `props` against the sheet the id belongs to.
 */
export type SheetId<N extends string = string> = string & {
  readonly [sheetName]?: N;
};

/** A Promise that also carries the instance id, so callers can hide or update the sheet. */
export type SheetPromise<T, N extends string = string> = Promise<T> & {
  readonly id: SheetId<N>;
};

/** How a sheet controls itself. Injected as the `sheet` prop, and returned by `useSheetHandle()`. */
export type SheetHandle<R = void> = {
  readonly id: string;
  /** Closes the sheet. The promise from `show()` resolves with `result` once the close animation ends. */
  close(result?: R): void;
  /** Shallow-merges `props` into this sheet's current props. */
  update(props: SheetProps): void;
};

/**
 * gorhom's `BottomSheetModal` props, minus the ones the library controls.
 * `enableDismissOnClose: false` would stop gorhom reporting a swipe-down, so the
 * sheet's promise would never settle. `onDismiss` is allowed: `SheetModal` calls
 * it after its own handling.
 */
export type SheetModalProps = Omit<
  BottomSheetModalProps,
  'name' | 'enableDismissOnClose' | 'children'
> & {
  children?: ReactNode;
};
