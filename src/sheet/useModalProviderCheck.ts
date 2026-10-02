import { useBottomSheetModal } from '@gorhom/bottom-sheet';

/**
 * Throws in dev when a scope isn't inside gorhom's BottomSheetModalProvider, so
 * the mistake shows up at app start instead of when the first sheet opens.
 */
export function useModalProviderCheck(): void {
  try {
    useBottomSheetModal();
  } catch {
    // gorhom throws a plain string here, not an Error, so catch everything.
    if (__DEV__) {
      throw new Error(
        '[sheet-scope] <SheetScope> must be inside BottomSheetModalProvider. Render GestureHandlerRootView → BottomSheetModalProvider above your root <SheetScope>.'
      );
    }
  }
}
