import { useLocalSearchParams } from 'expo-router';
import { ScreenScope } from '../../components/ScreenScope';
import { NavigationDemo } from '../../demos/NavigationDemo';
import { placementOf } from '../../demos/navigationPaths';

export default function NavigationStepRoute() {
  const { step, sheets } = useLocalSearchParams<{
    step: string;
    sheets?: string;
  }>();
  const screen = Number(step) || 1;
  const placement = placementOf(sheets);
  return (
    <ScreenScope title={`Screen ${screen}`} contained={placement === 'inside'}>
      <NavigationDemo step={screen} placement={placement} />
    </ScreenScope>
  );
}
