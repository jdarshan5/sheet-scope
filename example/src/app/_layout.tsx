import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack } from 'expo-router';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SheetScope } from '../sheets';
import { logSheetError } from '../sheets/logSheetError';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <BottomSheetModalProvider>
        {/* The app's root scope, above the navigator, so its sheets outlive every screen. */}
        <SheetScope onError={logSheetError}>
          <Stack />
        </SheetScope>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
