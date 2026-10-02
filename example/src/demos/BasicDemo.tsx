import { DemoButton } from '../components/DemoButton';
import { DemoScreen } from '../components/DemoScreen';
import { useSheets } from '../sheets';
import { useResultLog } from './useResultLog';

export function BasicDemo() {
  const sheets = useSheets();
  const [results, addResult] = useResultLog();

  const confirmDelete = async () => {
    const confirmed = await sheets.show('confirm', {
      title: 'Delete this item?',
    });
    if (confirmed === undefined) {
      addResult('Confirm: dismissed without an answer');
    } else {
      addResult(confirmed ? 'Confirm: deleted' : 'Confirm: kept');
    }
  };

  const pickFruit = async () => {
    const fruit = await sheets.show('picker', {
      title: 'Pick a fruit',
      options: ['Apple', 'Banana', 'Cherry', 'Mango', 'Peach', 'Pear', 'Plum'],
    });
    addResult(`Picker: ${fruit ?? 'dismissed'}`);
  };

  const openHeavy = async () => {
    await sheets.show('heavy');
    addResult('Heavy sheet closed');
  };

  return (
    <DemoScreen
      description="Each sheet resolves with its result once its close animation ends, or with undefined when it's swiped away. The heavy sheet's module isn't evaluated until it's needed; its button preloads it on press-in."
      results={results}
    >
      <DemoButton title="Delete item" onPress={confirmDelete} />
      <DemoButton title="Pick a fruit" onPress={pickFruit} />
      <DemoButton
        title="Open the heavy sheet"
        onPressIn={() => sheets.preload('heavy')}
        onPress={openHeavy}
      />
    </DemoScreen>
  );
}
