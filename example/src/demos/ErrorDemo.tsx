import { DemoButton } from '../components/DemoButton';
import { DemoScreen } from '../components/DemoScreen';
import { useSheets } from '../sheets';
import { useResultLog } from './useResultLog';

const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export function ErrorDemo() {
  const sheets = useSheets();
  const [results, addResult] = useResultLog();

  const openUnreachable = async () => {
    try {
      await sheets.show('unreachable');
    } catch (error) {
      addResult(`Load failed: ${messageOf(error)}`);
    }
  };

  const openCrashing = async () => {
    try {
      await sheets.show('crash');
      addResult('Crash sheet closed without crashing');
    } catch (error) {
      addResult(`Render failed: ${messageOf(error)}`);
    }
  };

  return (
    <DemoScreen
      description="Errors reject the sheet's promise and call the scope's onError, which this app logs with console.warn. Only the failing sheet closes. In dev, React also logs the render error."
      results={results}
    >
      <DemoButton
        title="Open a sheet that fails to load"
        onPress={openUnreachable}
      />
      <DemoButton title="Open a sheet that can crash" onPress={openCrashing} />
    </DemoScreen>
  );
}
