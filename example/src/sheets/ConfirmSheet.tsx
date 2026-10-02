import { BottomSheetView } from '@gorhom/bottom-sheet';
import { SheetModal, type SheetHandle } from '@jdarshan5/sheet-scope';
import { Button, StyleSheet, Text, View } from 'react-native';
import { renderBackdrop } from './renderBackdrop';

type Props = { title: string; sheet: SheetHandle<boolean> };

export default function ConfirmSheet({ title, sheet }: Props) {
  return (
    <SheetModal backdropComponent={renderBackdrop}>
      <BottomSheetView style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.actions}>
          <Button title="Cancel" onPress={() => sheet.close(false)} />
          <Button
            title="Delete"
            color="#d11a2a"
            onPress={() => sheet.close(true)}
          />
        </View>
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
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
});
