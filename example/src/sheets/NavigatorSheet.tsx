import { BottomSheetView } from '@gorhom/bottom-sheet';
import { SheetModal, type SheetHandle } from '@jdarshan5/sheet-scope';
import { useGlobalSearchParams, usePathname, useRouter } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { DemoButton } from '../components/DemoButton';
import {
  navigationHref,
  navigationStep,
  placementOf,
} from '../demos/navigationPaths';

const snapPoints = ['36%'];

/**
 * An app-level sheet, opened through the root scope. It has no backdrop, so the
 * screens changing underneath stay visible, and it stays open while they do.
 */
export default function NavigatorSheet({ sheet }: { sheet: SheetHandle }) {
  const router = useRouter();
  const pathname = usePathname();
  // The screen on top right now: the next one it pushes is drawn the same way.
  const { sheets } = useGlobalSearchParams<{ sheets?: string }>();
  const step = navigationStep(pathname);

  return (
    <SheetModal snapPoints={snapPoints} enableDynamicSizing={false}>
      <BottomSheetView style={styles.content}>
        <Text style={styles.title}>App-level sheet</Text>
        <Text>
          It belongs to the root scope, so it stays open while you move between
          screens. Current route: {pathname}
        </Text>
        <DemoButton
          title={`Push screen ${step + 1}`}
          onPress={() =>
            router.push(navigationHref(step + 1, placementOf(sheets)))
          }
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
