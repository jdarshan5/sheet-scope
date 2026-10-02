---
sidebar_position: 2
title: Getting started
description: Install sheet-scope in an Expo or bare React Native app, register your sheets, and open a typed @gorhom/bottom-sheet modal with one awaited call.
---

import DemoVideo from '@site/src/components/DemoVideo';

# Getting started

## Install

The library needs React 18 or newer and `@gorhom/bottom-sheet` v5, which in turn needs Reanimated and Gesture Handler.

With Expo:

```bash
npx expo install @jdarshan5/sheet-scope @gorhom/bottom-sheet \
  react-native-reanimated react-native-gesture-handler
```

With bare React Native:

```bash
yarn add @jdarshan5/sheet-scope @gorhom/bottom-sheet \
  react-native-reanimated react-native-gesture-handler
cd ios && pod install
```

Reanimated 4 also needs `react-native-worklets`, so add it to the command if that's the version you get.

Then finish Reanimated's and Gesture Handler's setup (Babel plugin, root view) by following [gorhom's installation guide](https://gorhom.dev/react-native-bottom-sheet/) and [Reanimated's](https://docs.swmansion.com/react-native-reanimated/).

## 1. Write a sheet

A sheet is a component whose root is `<SheetModal>`. `SheetModal` takes any [`BottomSheetModal`](https://gorhom.dev/react-native-bottom-sheet/modal/props) prop, such as snap points or a backdrop, except [the two the library controls](./api.md#sheetmodal).

The sheet also receives a `sheet` prop. Its type, `SheetHandle<R>`, declares what the sheet resolves with.

```tsx title="sheets/ConfirmSheet.tsx"
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

## 2. Register your sheets

Each entry is a dynamic import, so a sheet's code isn't evaluated until it's first opened or preloaded. Each module must export the sheet component as its default export. This file is also where the types come from.

```ts title="sheets/index.ts"
import { createSheetScope, defineSheets } from '@jdarshan5/sheet-scope';

export const { SheetScope, useSheets } = createSheetScope(
  defineSheets({
    confirm: () => import('./ConfirmSheet'),
    // `unique: false` lets several copies of a sheet be open at once.
    picker: { load: () => import('./PickerSheet'), unique: false },
  })
);
```

## 3. Add the providers

`GestureHandlerRootView` and gorhom's `BottomSheetModalProvider` go **above** your root `<SheetScope>`:

```tsx title="App.tsx"
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

## 4. Open sheets

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

`show()` resolves once the sheet has finished animating closed. It resolves with the value passed to `sheet.close(value)`, or `undefined` if the sheet closed without one: a swipe-down, a tap on its backdrop, Android's back button, `hide()`, or its scope unmounting.

<DemoVideo
  name="basics"
  caption="The example app's confirm sheet. Tapping Delete resolves true once the sheet has closed; swiping the sheet down resolves undefined."
/>

It only rejects on real errors, such as a failed import or a sheet that throws while rendering. See [When a sheet fails](./api.md#when-a-sheet-fails).

## Next

- [Scopes](./scopes.md): decide which sheets close with which screen.
- [API](./api.md): everything `useSheets()` and `<SheetScope>` offer.
- [Good to know](./good-to-know.md): things worth knowing before you ship.
