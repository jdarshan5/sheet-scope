import { BottomSheetView } from '@gorhom/bottom-sheet';
import { SheetModal, type SheetHandle } from '@jdarshan5/sheet-scope';
import { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import { DemoButton } from '../components/DemoButton';
import { useSheets } from './index';

export type StackBehavior = 'switch' | 'push' | 'replace';

const MAX_LEVEL = 4;
const BACKGROUNDS = ['#ffffff', '#e8f0fe', '#f1e8fd', '#e6f6ec'];

const WHAT_HAPPENED_BELOW: Record<StackBehavior, string> = {
  switch:
    'The level below was minimised. It comes back when this level closes.',
  push: 'The level below is still on screen, underneath this one.',
  replace: 'The level below was dismissed, and its promise resolved undefined.',
};

type Props = {
  level: number;
  behavior: StackBehavior;
  onEvent: (event: string) => void;
  sheet: SheetHandle<string>;
};

export default function StackSheet({ level, behavior, onEvent, sheet }: Props) {
  const sheets = useSheets();
  // Each level is shorter than the one below, so 'push' leaves the lower levels visible.
  const snapPoints = useMemo(() => [`${75 - level * 12}%`], [level]);
  const backgroundStyle = useMemo(
    () => ({ backgroundColor: BACKGROUNDS[(level - 1) % BACKGROUNDS.length] }),
    [level]
  );

  const openNextLevel = async () => {
    const next = level + 1;
    const result = await sheets.show('stack', {
      level: next,
      behavior,
      onEvent,
    });
    onEvent(`Level ${next} resolved: ${String(result)}`);
  };

  return (
    <SheetModal
      stackBehavior={behavior}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      backgroundStyle={backgroundStyle}
    >
      <BottomSheetView style={styles.content}>
        <Text style={styles.title}>
          Level {level} · stackBehavior '{behavior}'
        </Text>
        {level > 1 && <Text>{WHAT_HAPPENED_BELOW[behavior]}</Text>}
        {level < MAX_LEVEL && (
          <DemoButton
            title={`Open level ${level + 1}`}
            onPress={openNextLevel}
          />
        )}
        <DemoButton
          title={`Close level ${level}`}
          onPress={() => sheet.close(`level ${level}`)}
        />
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
