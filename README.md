# @jdarshan5/sheet-scope

Scoped, lazily-mounted, typed bottom sheet manager for React Native, built on [@gorhom/bottom-sheet](https://github.com/gorhom/react-native-bottom-sheet).

**[Documentation website](https://jdarshan5.github.io/sheet-scope/)**

- **Scoped:** every sheet belongs to a `<SheetScope>`. When the scope unmounts (say, its screen is popped), its sheets close.
- **Lazily mounted:** a sheet isn't rendered, and its module isn't evaluated, until it's opened. It unmounts once it has closed.
- **Typed:** sheet names, props and results are inferred from your sheet components. `await sheets.show('confirm', { title })` checks `title` at compile time and resolves with the sheet's result.

It's JavaScript only, and adds about 7.5 KB (minified) to your bundle.

## Installation

The library needs `@gorhom/bottom-sheet` v5, which in turn needs Reanimated and Gesture Handler.

With Expo:

```sh
npx expo install @jdarshan5/sheet-scope @gorhom/bottom-sheet react-native-reanimated react-native-gesture-handler
```

With bare React Native:

```sh
yarn add @jdarshan5/sheet-scope @gorhom/bottom-sheet react-native-reanimated react-native-gesture-handler
cd ios && pod install
```

Reanimated 4 also needs `react-native-worklets`, so add it to the command if that's the version you get.

Then finish Reanimated's and Gesture Handler's setup (Babel plugin, root view) by following [gorhom's installation guide](https://gorhom.dev/react-native-bottom-sheet/) and [Reanimated's](https://docs.swmansion.com/react-native-reanimated/).

## Usage

### 1. Write a sheet

A sheet is a component whose root is `<SheetModal>`. `SheetModal` takes any [`BottomSheetModal`](https://gorhom.dev/react-native-bottom-sheet/modal/props) prop, such as snap points or a backdrop, except `name` and `enableDismissOnClose`, which the library controls. The sheet also receives a `sheet` prop; its type, `SheetHandle<R>`, declares what the sheet resolves with.

```tsx
// sheets/ConfirmSheet.tsx
import { BottomSheetView } from '@gorhom/bottom-sheet';
import { SheetModal, type SheetHandle } from '@jdarshan5/sheet-scope';
import { Button, Text } from 'react-native';

type Props = { title: string; sheet: SheetHandle<boolean> };

export default function ConfirmSheet({ title, sheet }: Props) {
  return (
    <SheetModal>
      <BottomSheetView>
        <Text>{title}</Text>
        <Button title="Cancel" onPress={() => sheet.close(false)} />
        <Button title="Delete" onPress={() => sheet.close(true)} />
      </BottomSheetView>
    </SheetModal>
  );
}
```

### 2. Register your sheets

```ts
// sheets/index.ts
import { createSheetScope, defineSheets } from '@jdarshan5/sheet-scope';

export const { SheetScope, useSheets } = createSheetScope(
  defineSheets({
    confirm: () => import('./ConfirmSheet'),
    // `unique: false` lets several copies of a sheet be open at once.
    picker: { load: () => import('./PickerSheet'), unique: false },
  })
);
```

### 3. Add the providers

`GestureHandlerRootView` and gorhom's `BottomSheetModalProvider` go **above** your root `<SheetScope>`:

```tsx
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SheetScope } from './sheets';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <SheetScope>{/* your navigator and screens */}</SheetScope>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
```

### 4. Open sheets

```tsx
const sheets = useSheets();

const deleteItem = async () => {
  const confirmed = await sheets.show('confirm', { title: 'Delete this item?' });
  // confirmed: boolean | undefined
  if (confirmed) {
    // ...
  }
};
```

`show()` resolves once the sheet has finished animating closed. It resolves with the value passed to `sheet.close(value)`, or `undefined` if the sheet closed without one: a swipe-down, a tap on its backdrop, Android's back button, `hide()`, or its scope unmounting. It only rejects on real errors, such as a failed import or a sheet that throws while rendering.

## Scopes

Each `<SheetScope>` owns the sheets opened through it. A good setup is one scope at the app root, plus one per screen:

```tsx
function ProductScreen() {
  return (
    <SheetScope>
      <ProductDetails />
    </SheetScope>
  );
}

function ProductDetails() {
  const sheets = useSheets(); // this screen's scope: its sheets close when the screen unmounts
  const appSheets = useSheets('root'); // the root scope: for sheets that should outlive the screen
  // ...
}
```

A scope decides when a sheet is closed, not where it's drawn. A sheet is drawn by the nearest `BottomSheetModalProvider`, so with one provider at the app root it covers the whole app, whichever scope opened it. To keep a screen's sheets inside the screen, give that screen its own `BottomSheetModalProvider` around its `<SheetScope>`.

Navigators often keep a screen mounted when it loses focus, so its sheets stay open. To close them on blur, call `useSheets().hideAll()` from your navigator's focus-effect cleanup.

## API

### `useSheets(target?: 'nearest' | 'root')`

Returns the nearest scope's controller, or the root scope's with `'root'`. Its identity is stable for the scope's lifetime.

| Method | |
| --- | --- |
| `show(name, props?)` | Opens a sheet and returns a promise of its result, with the instance's `id` attached. `props` is optional when the sheet has no required props. For a `unique` sheet (the default) that's already open, it returns the open sheet's promise and replaces its props. |
| `hide(id)` | Closes a sheet. Its promise resolves `undefined`. |
| `hideAll()` | Closes every sheet in this scope. |
| `update(id, props)` | Shallow-merges props into an open sheet. Pass the `id` from the promise `show()` returned, and the props are checked against that sheet. |
| `preload(name)` | Starts loading a sheet's module, e.g. from `onPressIn`, so it opens without a gap. |
| `isOpen(name)` | Whether a sheet with that name is loading or open in this scope. |

A controller only reaches the sheets opened through its own scope: `hide`, `update`, `hideAll`, `isOpen` and the `unique` check don't see sheets in other scopes.

### `<SheetScope>`

| Prop | |
| --- | --- |
| `onError?(error, { name, id })` | Called when a sheet fails to load or render, after its promise rejects. |
| `closeOnBack?` | Whether Android's back button closes this scope's sheets. Defaults to `true`. Back closes the most recently opened sheet, in any scope, before your navigator handles it. |
| `loadingIndicator?` | Shown while one of this scope's sheets has been loading for over 150 ms, such as a slow web chunk. It's rendered after the scope's children, inside the scope's area, so style it as an overlay (e.g. `StyleSheet.absoluteFill`). |

### `useSheetHandle<R>()`

The `sheet` handle (`{ id, close(result?), update(props) }`), for components deep inside a sheet.

## Good to know

- **Context inside a sheet.** gorhom renders modal content next to `BottomSheetModalProvider`, not where the sheet was opened. `useSheets()` and `useSheetHandle()` still work inside it, but any other provider that content needs (theme, i18n, data clients, safe area) must be **above** `BottomSheetModalProvider`. The sheet component's own body, outside `<SheetModal>`, renders where its scope is, so it can read screen-level context and pass values down as props.
- **Render `<SheetModal>` on the first render.** A sheet that renders no `SheetModal`, or more than one, is rejected with an error naming it.
- **Stacking sheets.** A sheet's `stackBehavior` (a `SheetModal` prop) decides what happens to the sheet below when it opens: `'push'` keeps it on screen, and `'replace'` dismisses it, so its promise resolves `undefined`. gorhom's default, `'switch'`, should minimise it until the new sheet closes. In `@gorhom/bottom-sheet` 5.2.14 it dismisses it instead ([gorhom#2685](https://github.com/gorhom/react-native-bottom-sheet/issues/2685), fix pending in [gorhom#2698](https://github.com/gorhom/react-native-bottom-sheet/pull/2698)). Until that ships, set `stackBehavior="push"` on sheets that open over other sheets.
- **Memoise `snapPoints`.** gorhom recalculates layout whenever `snapPoints` changes identity. Define them at module scope, or with `useMemo`.
- **Props are a snapshot.** `show()` captures `props` when it's called. To change them later, use `update()` or `sheet.update()`, or read live data from your state library inside the sheet.
- **Inline sheets.** The library only manages modals. For a sheet that's always on screen, such as a map's results panel, render gorhom's [`BottomSheet`](https://gorhom.dev/react-native-bottom-sheet/props) in your screen as usual. It works next to a `<SheetScope>`, and managed sheets open above it. The library doesn't open, close or type it, and Android's back button won't close it.

## Contributing

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
