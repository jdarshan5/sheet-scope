import { BottomSheetView } from '@gorhom/bottom-sheet';
import { SheetModal, type SheetHandle } from '@jdarshan5/sheet-scope';
import { Button, StyleSheet, Text } from 'react-native';
import { evaluatedAt, evaluationMs, rows } from './heavyData';
import { renderBackdrop } from './renderBackdrop';

export default function HeavySheet({ sheet }: { sheet: SheetHandle }) {
  return (
    <SheetModal backdropComponent={renderBackdrop}>
      <BottomSheetView style={styles.content}>
        <Text style={styles.title}>Heavy sheet</Text>
        <Text>
          Its module built {rows.length} rows in {evaluationMs} ms, at{' '}
          {evaluatedAt.toLocaleTimeString()}. That happened when the sheet was
          first preloaded or opened, not when the app started.
        </Text>
        <Button title="Close" onPress={() => sheet.close()} />
      </BottomSheetView>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
});
