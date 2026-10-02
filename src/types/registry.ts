import type { ComponentType, JSXElementConstructor } from 'react';
import type { SheetHandle, SheetId, SheetPromise } from './sheet';

/** What a sheet's loader resolves to: a module whose default export is the sheet component. */
export type SheetModule = { default: ComponentType<any> };

export type SheetLoader = () => Promise<SheetModule>;

export type SheetEntry = SheetLoader | { load: SheetLoader; unique?: boolean };

export type SheetRegistry = Readonly<Record<string, SheetEntry>>;

type LoaderOf<E> = E extends { load: infer L } ? L : E;
type ModuleOf<E> = LoaderOf<E> extends () => Promise<infer M> ? M : never;
type ComponentOf<E> = ModuleOf<E> extends { default: infer C } ? C : never;
type RawPropsOf<E> =
  ComponentOf<E> extends JSXElementConstructor<infer P> ? P : never;

/** The props `show()` takes for a sheet: its component's props, minus the injected `sheet`. */
export type SheetPropsOf<E> = Omit<RawPropsOf<E>, 'sheet'>;

/** What a sheet resolves with, read from its `sheet: SheetHandle<R>` prop. */
export type SheetResultOf<E> =
  RawPropsOf<E> extends { sheet: SheetHandle<infer R> } ? R : void;

/** `props` is optional when the sheet has no required props. */
export type ShowArgs<E> =
  Record<never, never> extends SheetPropsOf<E>
    ? [props?: SheetPropsOf<E>]
    : [props: SheetPropsOf<E>];

/** What `useSheets()` returns, typed by the scope family's registry. */
export interface SheetController<Reg extends SheetRegistry> {
  /** Opens a sheet. Resolves with its result, or `undefined` if it closed without one. */
  show<N extends keyof Reg & string>(
    name: N,
    ...args: ShowArgs<Reg[N]>
  ): SheetPromise<SheetResultOf<Reg[N]> | undefined, N>;
  hide(id: string): void;
  hideAll(): void;
  /** Shallow-merges `props` into an open sheet. Pass the `id` of the promise `show()` returned. */
  update<N extends keyof Reg & string>(
    id: SheetId<N>,
    props: Partial<SheetPropsOf<Reg[N]>>
  ): void;
  /** Starts loading a sheet's module, e.g. from `onPressIn`, so it opens without a loading gap. */
  preload(name: keyof Reg & string): void;
  /** True while a sheet with this name is loading or open, not once it's closing. */
  isOpen(name: keyof Reg & string): boolean;
}
