import { ScreenScope } from '../components/ScreenScope';
import { NestedScopeDemo } from '../demos/NestedScopeDemo';

export default function ScopesRoute() {
  return (
    <ScreenScope title="Scopes">
      <NestedScopeDemo />
    </ScreenScope>
  );
}
