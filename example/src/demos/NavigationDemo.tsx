import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { DemoButton } from '../components/DemoButton';
import { DemoScreen } from '../components/DemoScreen';
import { useSheets } from '../sheets';
import { logNavigationEvent, useNavigationLog } from './navigationLog';
import { navigationHref, type SheetPlacement } from './navigationPaths';

type Props = { step: number; placement: SheetPlacement };

const DESCRIPTIONS: Record<SheetPlacement, (step: number) => string> = {
  above: (step) =>
    `Screen ${step} has its own scope, but its sheets are drawn by the app's root BottomSheetModalProvider, above every screen. Push a screen and it comes in under this screen's sheet. The sheet closes when this screen unmounts (go back), or on blur if you turn that on below. The app-level sheet belongs to the root scope, so it stays open while you navigate under it.`,
  inside: (step) =>
    `Screen ${step} has its own scope and its own BottomSheetModalProvider, so its sheets are drawn inside the screen. Push a screen and it slides over this screen's sheet; come back and the sheet is still open, its promise still pending. Android's back button skips a covered screen's sheets. The app-level sheet still uses the root provider, so it stays above every screen.`,
};

/** One screen in a navigation stack. Its route wraps it in its own <SheetScope>. */
export function NavigationDemo({ step, placement }: Props) {
  const router = useRouter();
  const screenSheets = useSheets();
  const appSheets = useSheets('root');
  const log = useNavigationLog();

  const [closeOnBlur, setCloseOnBlur] = useState(false);
  const closeOnBlurRef = useRef(closeOnBlur);
  useEffect(() => {
    closeOnBlurRef.current = closeOnBlur;
  }, [closeOnBlur]);

  // The README's pattern for closing a screen's sheets when it loses focus.
  // It reads the switch through a ref, so flipping it doesn't re-run the effect.
  useFocusEffect(
    useCallback(
      () => () => {
        if (closeOnBlurRef.current) {
          screenSheets.hideAll();
        }
      },
      [screenSheets]
    )
  );

  const openScreenSheet = async () => {
    const result = await screenSheets.show('screenSheet', {
      screen: step,
      placement,
    });
    logNavigationEvent(`Screen ${step}'s sheet resolved: ${String(result)}`);
  };

  const openAppSheet = async () => {
    const result = await appSheets.show('navigator');
    logNavigationEvent(`App-level sheet resolved: ${String(result)}`);
  };

  return (
    <DemoScreen description={DESCRIPTIONS[placement](step)} results={log}>
      <View style={styles.row}>
        <Text style={styles.label}>
          Draw this screen's sheets inside the screen. The next screen you push
          starts the same way, so flip it there to mix both in one stack.
        </Text>
        {/* Changing the provider remounts this screen's scope, which closes its sheets. */}
        <Switch
          accessibilityLabel="Draw this screen's sheets inside the screen"
          value={placement === 'inside'}
          onValueChange={(inside) =>
            router.setParams({ sheets: inside ? 'inside' : undefined })
          }
        />
      </View>
      <DemoButton
        title={`Push screen ${step + 1}`}
        onPress={() => router.push(navigationHref(step + 1, placement))}
      />
      <DemoButton title="Open this screen's sheet" onPress={openScreenSheet} />
      <DemoButton title="Open the app-level sheet" onPress={openAppSheet} />
      {placement === 'above' && (
        <View style={styles.row}>
          <Text style={styles.label}>
            Close this screen's sheets when it loses focus
          </Text>
          <Switch
            accessibilityLabel="Close this screen's sheets when it loses focus"
            value={closeOnBlur}
            onValueChange={setCloseOnBlur}
          />
        </View>
      )}
    </DemoScreen>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    flex: 1,
  },
});
