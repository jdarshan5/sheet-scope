import { BottomSheetView } from '@gorhom/bottom-sheet';
import { SheetModal, type SheetHandle } from '@jdarshan5/sheet-scope';
import { useRouter } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { DemoButton } from '../components/DemoButton';
import { navigationHref, type SheetPlacement } from '../demos/navigationPaths';
import { renderBackdrop } from './renderBackdrop';

type Props = { screen: number; placement: SheetPlacement; sheet: SheetHandle };

const DESCRIPTIONS: Record<SheetPlacement, (screen: number) => string> = {
  above: (screen) =>
    `It belongs to Screen ${screen}'s scope, but it's drawn above every screen. Push a screen from here and, unless Screen ${screen} closes its sheets when it loses focus, this sheet stays on top of the new screen: Screen ${screen} is still mounted underneath. Go back instead, and Screen ${screen} unmounts, so this sheet closes too, and its promise resolves undefined straight away.`,
  inside: (screen) =>
    `It belongs to Screen ${screen}'s scope and is drawn inside Screen ${screen}. Push a screen from here and the new screen slides over this sheet; come back and it's still open. Go back instead, and Screen ${screen} unmounts, so this sheet closes too.`,
};

/** A per-screen sheet, opened through its screen's own scope. */
export default function ScreenSheet({ screen, placement, sheet }: Props) {
  const router = useRouter();

  return (
    <SheetModal backdropComponent={renderBackdrop}>
      <BottomSheetView style={styles.content}>
        <Text style={styles.title}>Screen {screen}'s sheet</Text>
        <Text>{DESCRIPTIONS[placement](screen)}</Text>
        <DemoButton
          title={`Push screen ${screen + 1}`}
          onPress={() => router.push(navigationHref(screen + 1, placement))}
        />
        <DemoButton
          title="Go back"
          onPress={() => router.canGoBack() && router.back()}
        />
        <DemoButton title="Close" onPress={() => sheet.close()} />
      </BottomSheetView>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
});
