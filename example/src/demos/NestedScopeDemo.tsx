import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DemoButton } from '../components/DemoButton';
import { DemoScreen } from '../components/DemoScreen';
import { SheetScope, useSheets } from '../sheets';
import { useResultLog } from './useResultLog';

const LEAVE_AFTER_MS = 2000;

export function NestedScopeDemo() {
  const [screenMounted, setScreenMounted] = useState(true);
  const [results, addResult] = useResultLog();

  return (
    <DemoScreen
      description="The box below stands in for a screen with its own <SheetScope>. A sheet opened through it closes when the screen unmounts, and its promise resolves undefined. A sheet opened with useSheets('root') belongs to the app's root scope and stays open."
      results={results}
    >
      <DemoButton
        title={screenMounted ? 'Unmount the screen' : 'Mount the screen'}
        onPress={() => setScreenMounted((mounted) => !mounted)}
      />
      {screenMounted && (
        <SheetScope>
          <InnerScreen
            onResult={addResult}
            onLeave={() => setScreenMounted(false)}
          />
        </SheetScope>
      )}
    </DemoScreen>
  );
}

type InnerScreenProps = {
  onResult: (result: string) => void;
  onLeave: () => void;
};

function InnerScreen({ onResult, onLeave }: InnerScreenProps) {
  const screenSheets = useSheets();
  const appSheets = useSheets('root');

  const openThenLeave = async (owner: 'screen' | 'root') => {
    const sheets = owner === 'screen' ? screenSheets : appSheets;
    setTimeout(onLeave, LEAVE_AFTER_MS);
    const confirmed = await sheets.show('confirm', {
      title: `Owned by the ${owner} scope. The screen unmounts in 2 seconds.`,
    });
    onResult(`${owner} scope's sheet resolved: ${String(confirmed)}`);
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.label}>Inner screen</Text>
      <DemoButton
        title="Open a screen sheet, then leave"
        onPress={() => openThenLeave('screen')}
      />
      <DemoButton
        title="Open an app sheet, then leave"
        onPress={() => openThenLeave('root')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    borderColor: '#d0d7de',
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 12,
  },
  label: {
    color: '#777777',
    fontWeight: '600',
  },
});
