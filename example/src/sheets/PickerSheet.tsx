import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { SheetModal, type SheetHandle } from '@jdarshan5/sheet-scope';
import { Pressable, StyleSheet, Text } from 'react-native';
import { renderBackdrop } from './renderBackdrop';

type Props = {
  title: string;
  options: string[];
  sheet: SheetHandle<string>;
};

// Scrollable sheets need fixed snap points; defined once so their identity never changes.
const snapPoints = ['55%'];

export default function PickerSheet({ title, options, sheet }: Props) {
  return (
    <SheetModal
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      backdropComponent={renderBackdrop}
    >
      <BottomSheetFlatList
        data={options}
        keyExtractor={(option) => option}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<Text style={styles.title}>{title}</Text>}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            style={styles.option}
            onPress={() => sheet.close(item)}
          >
            <Text>{item}</Text>
          </Pressable>
        )}
      />
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    padding: 24,
    paddingBottom: 12,
  },
  option: {
    borderBottomColor: '#e5e5e5',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
});
