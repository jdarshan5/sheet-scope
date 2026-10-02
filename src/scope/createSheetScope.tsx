import { createContext, useContext } from 'react';
import type { SheetController, SheetRegistry } from '../types/registry';
import { invariant } from '../utils/invariant';
import type { SheetScopeValue } from './context';
import { SheetScopeProvider, type SheetScopeProps } from './SheetScopeProvider';

/**
 * Binds a registry to a typed scope family: a `<SheetScope>` provider, and a
 * `useSheets()` hook whose controller knows every sheet's props and result.
 */
export function createSheetScope<Reg extends SheetRegistry>(registry: Reg) {
  const ScopeContext = createContext<SheetScopeValue | null>(null);

  function SheetScope(props: SheetScopeProps) {
    return (
      <SheetScopeProvider
        {...props}
        registry={registry}
        context={ScopeContext}
      />
    );
  }

  /**
   * The nearest scope's controller, or with `'root'` the outermost one, for
   * app-level sheets that should outlive the current screen.
   */
  function useSheets(
    target: 'nearest' | 'root' = 'nearest'
  ): SheetController<Reg> {
    const scope = useContext(ScopeContext);
    invariant(
      scope,
      'useSheets() must be called inside <SheetScope>. Render <SheetScope> above this component.'
    );
    const { controller } = target === 'root' ? scope.root : scope;
    return controller as unknown as SheetController<Reg>;
  }

  return { SheetScope, useSheets };
}
