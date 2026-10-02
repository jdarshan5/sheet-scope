---
sidebar_position: 4
title: API reference
sidebar_label: API
description: The public API of sheet-scope, covering defineSheets, createSheetScope, useSheets, SheetScope, SheetModal and useSheetHandle, plus what happens when a sheet fails.
---

# API

## `defineSheets(registry)`

Declares your sheets. Each entry is a loader, `() => import('./MySheet')`, or `{ load, unique }`. The module's default export must be the sheet component. In development it throws for an entry that isn't a loader.

`unique` defaults to `true`: calling `show()` for a sheet that's already open in the same scope returns the open sheet's promise instead of opening a second copy. A sheet that's already animating closed doesn't count, so the call opens a new one. Set `unique: false` for sheets that can be open several times at once.

## `createSheetScope(registry)`

Returns `{ SheetScope, useSheets }`, typed by the registry. Most apps call it once. Each call creates a separate family of scopes: a `useSheets` only finds the `SheetScope` returned by the same call.

```ts
export const { SheetScope, useSheets } = createSheetScope(
  defineSheets({
    confirm: () => import('./ConfirmSheet'),
  })
);
```

## `useSheets(target?)`

Returns the nearest scope's controller, or the root scope's with `useSheets('root')`. Its identity is stable for the scope's lifetime, so it's safe in dependency arrays. It throws if there's no `<SheetScope>` above the component.

| Method | Description |
| --- | --- |
| `show(name, props?)` | Opens a sheet and returns a promise of its result, with the instance's `id` attached. `props` is optional when the sheet has no required props. For a `unique` sheet (the default) that's already open, it returns the open sheet's promise and replaces its props. |
| `hide(id)` | Closes the sheet with that `id`. Its promise resolves `undefined`, unless the sheet was already closing with a result. |
| `hideAll()` | Closes every sheet in this scope. |
| `update(id, props)` | Shallow-merges props into an open sheet. Pass the `id` from the promise `show()` returned, and the props are checked against that sheet. |
| `preload(name)` | Starts loading a sheet's module, for example from `onPressIn`, so it opens without a gap. |
| `isOpen(name)` | Whether a sheet with that name is loading or open in this scope. It's `false` once the sheet has started closing. |

A controller only reaches the sheets opened through its own scope. See [A scope only sees its own sheets](./scopes.md#a-scope-only-sees-its-own-sheets).

The `id` comes from the promise `show()` returns:

```tsx
const promise = sheets.show('confirm', { title: 'Delete this item?' });

sheets.update(promise.id, { title: 'Delete all 3 items?' });
sheets.hide(promise.id);

const confirmed = await promise;
```

## `<SheetScope>`

Owns the sheets opened through it. See [Scopes](./scopes.md).

| Prop | Description |
| --- | --- |
| `onError?(error, { name, id })` | Called when a sheet fails to load or render, after its promise rejects. |
| `closeOnBack?` | Whether Android's back button closes this scope's sheets. Defaults to `true`. Back closes the most recently opened sheet, in any scope, before your navigator handles it. |
| `loadingIndicator?` | Shown while one of this scope's sheets has been loading for over 150 ms, such as a slow web chunk. It's rendered after the scope's children, inside the scope's area, so style it as an overlay (for example `StyleSheet.absoluteFill`). |

In development, a `<SheetScope>` throws when it mounts if it isn't inside gorhom's `BottomSheetModalProvider`.

## `<SheetModal>`

The root element of every sheet. It takes any [`BottomSheetModal` prop](https://gorhom.dev/react-native-bottom-sheet/modal/props) except the two the library controls: `name` and `enableDismissOnClose`.

Callbacks such as `onChange`, `onAnimate` and `onDismiss` are yours to pass. Your `onDismiss` runs once the sheet has finished closing, as well as the library's own handling, so the promise from `show()` still resolves. It isn't called for a sheet that was closed before it was ever presented.

```tsx
export default function ConfirmSheet({ title, sheet }: Props) {
  return (
    <SheetModal onDismiss={() => console.log('Confirm sheet closed')}>
      {/* ... */}
    </SheetModal>
  );
}
```

Its `children` must be regular React nodes. gorhom's function-as-children form isn't supported.

It forwards its ref to gorhom's modal, so methods such as `snapToIndex()` and `expand()` still work.

It throws if it's rendered anywhere other than inside a sheet opened with `show()`.

## `useSheetHandle<R>()`

Returns the same handle a sheet gets as its `sheet` prop, for components deep inside a sheet. Pass the sheet's result type as `R`; it isn't inferred. It throws when called outside a sheet.

| Member | Description |
| --- | --- |
| `id` | The sheet instance's id. |
| `close(result?)` | Closes the sheet. The promise from `show()` resolves with `result` once the close animation ends. Only the first call counts. |
| `update(props)` | Shallow-merges `props` into this sheet's current props. |

## When a sheet fails

The promise from `show()` rejects in these cases:

- The sheet's module fails to load, or has no default export. The failed load isn't cached, so the next `show()` tries again.
- The sheet throws while rendering.
- The sheet renders no `<SheetModal>`, or more than one.
- The name isn't registered. TypeScript already rejects this at compile time.

In the first three cases the scope's `onError` is called after the promise rejects. Only the failing sheet is removed: other sheets and the screen stay up.

## Types

The package also exports these types: `SheetHandle`, `SheetModalProps`, `SheetScopeProps`, `SheetController`, `SheetPromise`, `SheetId`, `SheetErrorInfo`, `SheetEntry`, `SheetLoader`, `SheetRegistry`, `SheetPropsOf` and `SheetResultOf`.
