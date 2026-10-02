import { BottomSheetView } from '@gorhom/bottom-sheet';
import { SheetModal, type SheetHandle } from '@jdarshan5/sheet-scope';
import { useState } from 'react';
import { Button, StyleSheet, Text } from 'react-native';
import { renderBackdrop } from './renderBackdrop';

function Bomb(): never {
  throw new Error('CrashSheet threw while rendering');
}

export default function CrashSheet(_: { sheet: SheetHandle }) {
  const [crashed, setCrashed] = useState(false);
  return (
    <SheetModal backdropComponent={renderBackdrop}>
      <BottomSheetView style={styles.content}>
        <Text>
          This content is portaled to BottomSheetModalProvider. If it throws,
          only this sheet closes: its promise rejects and the scope's onError
          runs. The rest of the app stays up.
        </Text>
        <Button
          title="Throw while rendering"
          onPress={() => setCrashed(true)}
        />
        {crashed && <Bomb />}
      </BottomSheetView>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 24,
    gap: 16,
  },
});
