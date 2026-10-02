import { DemoButton } from '../components/DemoButton';
import { DemoScreen } from '../components/DemoScreen';
import { useSheets } from '../sheets';
import type { StackBehavior } from '../sheets/StackSheet';
import { useResultLog } from './useResultLog';

const BEHAVIORS: StackBehavior[] = ['switch', 'push', 'replace'];

export function StackingDemo() {
  const sheets = useSheets();
  const [results, addResult] = useResultLog();

  const openLevelOne = async (behavior: StackBehavior) => {
    const result = await sheets.show('stack', {
      level: 1,
      behavior,
      onEvent: addResult,
    });
    addResult(`Level 1 resolved: ${String(result)}`);
  };

  const doubleTap = async () => {
    // Two show() calls in a row, as a double tap would make.
    const first = sheets.show('confirm', { title: 'Opened twice, shown once' });
    const second = sheets.show('confirm', {
      title: 'Opened twice, shown once',
    });
    addResult(`Same promise both times: ${String(first === second)}`);
    await first;
  };

  return (
    <DemoScreen
      description="Open a sheet, then open more levels from inside it. Each level's stackBehavior decides what happens to the level below: 'switch' (gorhom's default) minimises it until the new level closes, 'push' keeps it on screen underneath, and 'replace' dismisses it, resolving its promise with undefined. Known gorhom bug: in @gorhom/bottom-sheet 5.2.14, 'switch' dismisses the level below instead of minimising it, so it resolves undefined (gorhom issue #2685, fix pending in PR #2698). The confirm sheet is unique, so a second show() while it's open returns the open sheet's promise."
      results={results}
    >
      {BEHAVIORS.map((behavior) => (
        <DemoButton
          key={behavior}
          title={`Stack with '${behavior}'`}
          onPress={() => openLevelOne(behavior)}
        />
      ))}
      <DemoButton title="Double-tap a unique sheet" onPress={doubleTap} />
    </DemoScreen>
  );
}
