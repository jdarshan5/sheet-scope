---
sidebar_position: 3
title: Scopes
description: How a SheetScope decides when its bottom sheets close, where to put scopes in a React Native app, and how they behave with navigation and Android's back button.
---

import DemoVideo from '@site/src/components/DemoVideo';

# Scopes

Each `<SheetScope>` owns the sheets opened through it. When the scope unmounts, its sheets close and their promises resolve straight away, without waiting for the close animation. They resolve `undefined`, except for a sheet that was already closing with a result, which still delivers it.

<DemoVideo
  name="scope-unmount"
  caption="Screen 2 opens a sheet through its own scope. Going back unmounts Screen 2, so its sheet closes and the promise resolves undefined."
/>

A good setup is one scope at the app root, plus one per screen:

```text
GestureHandlerRootView
└─ BottomSheetModalProvider
   └─ <SheetScope>              root scope
      └─ Navigator
         ├─ CartScreen
         └─ ItemScreen
            └─ <SheetScope>     screen scope
```

```tsx title="ItemScreen.tsx"
function ItemScreen() {
  return (
    <SheetScope>
      <ItemDetails />
    </SheetScope>
  );
}

function ItemDetails() {
  // Screen scope: sheets close when the screen unmounts.
  const sheets = useSheets();
  // Root scope: sheets that should outlive the screen.
  const appSheets = useSheets('root');
  // ...
}
```

`useSheets()` returns the nearest scope's controller, and `useSheets('root')` returns the outermost one. Use `'root'` for app-level sheets, such as sign-in or a global error, that should outlive the current screen.

## Where to put scopes

| Placement | Effect |
| --- | --- |
| One scope at the app root | Behaves like a classic global sheet manager. |
| Root scope plus one scope per screen | Screen sheets close when the screen unmounts, and app-level sheets go through `useSheets('root')`. **This is the recommended setup.** |
| A scope around a feature, such as a checkout flow | Sheets are closed when the flow exits, whichever screen opened them. |

## A scope decides when, not where

A scope decides when a sheet is closed, not where it's drawn. A sheet is drawn by the nearest `BottomSheetModalProvider` above its scope. With the usual single provider at the app root, that's over the whole app, whichever scope opened the sheet.

<DemoVideo
  name="navigation-above"
  caption="Screen 1's sheet is drawn above every screen, so Screen 2 comes in underneath it. The app-level sheet, opened with useSheets('root'), stays open while screens are pushed and popped under it."
/>

### Keeping a screen's sheets inside the screen

To draw a screen's sheets inside that screen instead, give the screen its own `BottomSheetModalProvider`:

```tsx
function ItemScreen() {
  // From your navigation library.
  const focused = useIsFocused();

  return (
    <BottomSheetModalProvider>
      <SheetScope closeOnBack={focused}>
        <ItemDetails />
      </SheetScope>
    </BottomSheetModalProvider>
  );
}
```

- A screen pushed on top covers the sheet. The sheet is still open, with its promise pending, when you come back.
- `closeOnBack={focused}` stops Android's back button from closing a sheet that's hidden under another screen.
- Sheets opened with `useSheets('root')` still use the root provider, so they stay above every screen.
- gorhom keeps a separate modal stack for each provider, so `stackBehavior` only applies between sheets drawn by the same provider.

<DemoVideo
  name="navigation-inside"
  caption="With its own provider, Screen 1's sheet is drawn inside Screen 1. Screen 2 slides over it, and the sheet is still open on the way back."
/>

## A scope only sees its own sheets

Every scope can open every registered sheet, but each one keeps its own list of open sheets:

- `hide(id)`, `update(id, props)` and `hideAll()` only reach sheets opened through that scope.
- `isOpen(name)` is `false` if the sheet is open in a different scope.
- `unique` is checked per scope, so the same unique sheet can be open in two scopes at once.

Calling `show()` on a scope that has already unmounted, for example from an async handler that finishes late, doesn't open anything. It resolves `undefined` and logs a warning in development.

## Blur is not unmount

Navigators often keep a screen mounted when it loses focus: tabs, or the screen underneath in a stack. Its scope is still mounted, so its sheets stay open.

To close a screen's sheets when it loses focus, call `useSheets().hideAll()` from your navigator's focus-effect cleanup. The library doesn't do this itself, because that would mean depending on a navigation library.

## Android back button

Android's back button closes the most recently opened sheet, in any scope, before your navigator handles it. The sheet's promise resolves `undefined`. A scope can opt out with `closeOnBack={false}`, and back then skips its sheets.
