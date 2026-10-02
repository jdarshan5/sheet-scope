import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack, useIsFocused } from 'expo-router';
import type { ReactNode } from 'react';
import { SheetScope } from '../sheets';
import { logSheetError } from '../sheets/logSheetError';

type Props = {
  title: string;
  /**
   * Give the screen its own BottomSheetModalProvider, so its sheets are drawn
   * inside the screen instead of above every screen: a pushed screen covers
   * them, and they're still open when you come back.
   */
  contained?: boolean;
  children: ReactNode;
};

/** A route's own sheet scope: sheets opened through it close when the route unmounts. */
export function ScreenScope({ title, contained = false, children }: Props) {
  const focused = useIsFocused();
  const scope = (
    // A covered screen's sheets shouldn't catch Android's back button.
    <SheetScope onError={logSheetError} closeOnBack={!contained || focused}>
      <Stack.Screen options={{ title }} />
      {children}
    </SheetScope>
  );
  return contained ? (
    <BottomSheetModalProvider>{scope}</BottomSheetModalProvider>
  ) : (
    scope
  );
}
