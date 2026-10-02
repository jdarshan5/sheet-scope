---
sidebar_position: 1
title: Why sheet-scope
description: What sheet-scope adds on top of @gorhom/bottom-sheet in React Native. Sheets close with the screen that owns them, mount lazily, and return typed results you can await.
---

# Why sheet-scope

[@gorhom/bottom-sheet](https://github.com/gorhom/react-native-bottom-sheet) handles the hard part of a bottom sheet: gestures, animation and the keyboard. It leaves the bookkeeping to you:

- where each sheet is rendered,
- how a screen opens it,
- how the answer gets back to the screen,
- what happens to the sheet when its screen goes away.

sheet-scope is that bookkeeping. It's JavaScript only, and adds about 7.5 KB (minified) to your bundle.

## The same sheet, both ways

Here is a delete confirmation with gorhom alone. The screen renders the modal, keeps a ref to it, and gets the answer through a callback:

```tsx
function ItemScreen() {
  const confirmRef = useRef<BottomSheetModal>(null);

  const onDone = (confirmed: boolean) => {
    confirmRef.current?.dismiss();
    if (confirmed) deleteItem();
  };

  return (
    <>
      <Button
        title="Delete"
        onPress={() => confirmRef.current?.present()}
      />
      {/* One of these, and a ref, per sheet */}
      <BottomSheetModal ref={confirmRef}>
        <ConfirmContent title="Delete this item?" onDone={onDone} />
      </BottomSheetModal>
    </>
  );
}
```

And the same confirmation with sheet-scope:

```tsx
function ItemScreen() {
  const sheets = useSheets();

  const onDelete = async () => {
    const confirmed = await sheets.show('confirm', {
      title: 'Delete this item?',
    });
    if (confirmed) deleteItem();
  };

  return <Button title="Delete" onPress={onDelete} />;
}
```

The sheet itself is still a gorhom sheet. Its root element, `<SheetModal>`, takes `BottomSheetModal`'s props, apart from [two the library controls](./api.md#sheetmodal), so snap points, backdrops and gestures work the way you already know.

## What it adds

### Scoped

**The problem.** A global sheet manager lets you open a sheet from anywhere, but then the sheet belongs to the whole app. If the screen that opened it goes away, the sheet stays up over whatever comes next.

**With sheet-scope.** Every sheet belongs to a `<SheetScope>`. When the scope unmounts, for example because its screen was popped, its sheets close. See [Scopes](./scopes.md).

### Lazily mounted

**The problem.** The usual pattern adds a `<BottomSheetModal>` and a ref to the screen for every sheet it might show, and loads each sheet's code along with the screen.

**With sheet-scope.** A sheet isn't rendered, and its module isn't evaluated, until you call `show()` (or `preload()`, which loads the module early). Once it has closed, it unmounts.

### Typed

**The problem.** Sheet names passed as strings, loosely typed props, and results handed back through callbacks are all easy to get wrong.

**With sheet-scope.** Names, props and results are inferred from your sheet components. `await sheets.show('confirm', { title })` checks `title` at compile time and resolves with the sheet's result.

## What it doesn't do

- **Replace gorhom's inline `BottomSheet`.** Managed sheets are modals. An inline sheet is still rendered with gorhom directly; see [Inline sheets](./good-to-know.md#inline-sheets).
- **Depend on a navigation library.** Scopes work under React Navigation or Expo Router, but the library imports neither.
- **Persist open sheets** across reloads, or deep-link into sheets.
- **Own gestures, animation or keyboard handling.** That all stays in gorhom.
