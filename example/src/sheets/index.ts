import { createSheetScope, defineSheets } from '@jdarshan5/sheet-scope';

export const { SheetScope, useSheets } = createSheetScope(
  defineSheets({
    confirm: () => import('./ConfirmSheet'),
    picker: () => import('./PickerSheet'),
    heavy: () => import('./HeavySheet'),
    crash: () => import('./CrashSheet'),
    // Not unique: a level opens another copy of itself on top.
    stack: { load: () => import('./StackSheet'), unique: false },
    navigator: () => import('./NavigatorSheet'),
    screenSheet: () => import('./ScreenSheet'),
    // Stands in for a sheet whose code fails to download, like a web chunk on a bad connection.
    unreachable: () =>
      Promise.reject<typeof import('./HeavySheet')>(
        new Error('Could not load the sheet')
      ),
  })
);
