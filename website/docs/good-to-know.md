---
sidebar_position: 5
title: Good to know
description: Things worth knowing before you ship with sheet-scope, including context inside a sheet, backdrops, stacking sheets, snap points and inline gorhom bottom sheets.
---

import DemoVideo from '@site/src/components/DemoVideo';

# Good to know

## Context inside a sheet

gorhom renders modal content next to `BottomSheetModalProvider`, not where the sheet was opened. `useSheets()` and `useSheetHandle()` still work inside it, but any other provider that content needs (theme, i18n, data clients, safe area) must be **above** `BottomSheetModalProvider`. That includes your navigation library's hooks: inside `<SheetModal>` they see whatever navigator is around the provider, if any, not the screen that opened the sheet.

The sheet component's own body, outside `<SheetModal>`, renders where its scope is. It can read screen-level context there and pass values down as props.

## Render `<SheetModal>` on the first render

A sheet that renders no `SheetModal`, or more than one, is rejected with an error naming it.

## Backdrops are opt-in

gorhom draws no backdrop unless you give it one, so a sheet like the one in [Getting started](./getting-started.md) has nothing behind it to tap. To dim the screen and close the sheet on a tap outside, pass gorhom's `backdropComponent`:

```tsx
import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';

// Defined once, outside any component, so its identity never changes.
const renderBackdrop = (props: BottomSheetBackdropProps) => (
  <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
);

// In the sheet:
<SheetModal backdropComponent={renderBackdrop}>{/* ... */}</SheetModal>;
```

## Stacking sheets

A sheet's `stackBehavior` (a `SheetModal` prop) decides what happens to the sheet below when it opens: `'push'` keeps it on screen, and `'replace'` dismisses it, so its promise resolves `undefined`.

<DemoVideo
  name="stacking"
  caption="Three levels opened with 'push' stay on screen, one underneath the other. With 'replace', opening level 2 dismisses level 1, which resolves undefined."
/>

gorhom's default, `'switch'`, should minimise the sheet below until the new sheet closes. In `@gorhom/bottom-sheet` 5.2.14 it dismisses it instead ([gorhom#2685](https://github.com/gorhom/react-native-bottom-sheet/issues/2685), fix pending in [gorhom#2698](https://github.com/gorhom/react-native-bottom-sheet/pull/2698)). Until that ships, set `stackBehavior="push"` on sheets that open over other sheets.

## Memoise `snapPoints`

gorhom recalculates layout whenever `snapPoints` changes identity. Define them at module scope, or with `useMemo`.

## Props are a snapshot

`show()` captures `props` when it's called. To change them later, use `update()` or `sheet.update()`, or read live data from your state library inside the sheet.

## Inline sheets

The library only manages modals. For a sheet that's always on screen, such as a map's results panel, render gorhom's [`BottomSheet`](https://gorhom.dev/react-native-bottom-sheet/props) in your screen as usual:

```tsx
function MapScreen() {
  const sheets = useSheets();

  return (
    <View style={{ flex: 1 }}>
      {/* A managed sheet, opened above the inline one. */}
      <Map onPressFilters={() => sheets.show('filters')} />
      <BottomSheet snapPoints={snapPoints}>
        <BottomSheetView>
          <Results />
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}
```

It works next to a `<SheetScope>`, and managed sheets open above it. The library doesn't open, close or type it, and Android's back button won't close it.

A registered sheet can't use `BottomSheet` as its root: it must render `<SheetModal>`.
