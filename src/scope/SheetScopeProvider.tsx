import {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Context,
  type ReactNode,
} from 'react';
import {
  createSheetController,
  type SheetErrorInfo,
} from '../core/createSheetController';
import { createSheetStore } from '../core/createSheetStore';
import { useAndroidBack } from '../hooks/useAndroidBack';
import { useModalProviderCheck } from '../sheet/useModalProviderCheck';
import type { SheetController, SheetRegistry } from '../types/registry';
import type { SheetScopeValue } from './context';
import { SheetHost } from './SheetHost';

export type SheetScopeProps = {
  children?: ReactNode;
  /** Called after a sheet's promise rejects because it failed to load or render. */
  onError?: (error: unknown, info: SheetErrorInfo) => void;
  /** Whether Android's hardware back closes this scope's sheets. Defaults to `true`. */
  closeOnBack?: boolean;
  /**
   * Shown while one of this scope's sheets has been loading for over 150 ms,
   * such as a slow web chunk. It's rendered after the scope's children, inside
   * the scope's area, so style it as an overlay (e.g. `StyleSheet.absoluteFill`).
   */
  loadingIndicator?: ReactNode;
};

type Props = SheetScopeProps & {
  registry: SheetRegistry;
  context: Context<SheetScopeValue | null>;
};

export function SheetScopeProvider({
  registry,
  context: ScopeContext,
  onError,
  closeOnBack = true,
  loadingIndicator,
  children,
}: Props) {
  useModalProviderCheck();
  const parent = useContext(ScopeContext);

  const onErrorRef = useRef(onError);
  useLayoutEffect(() => {
    onErrorRef.current = onError;
  });

  const [scope] = useState(() => {
    const store = createSheetStore();
    const controller = createSheetController({
      registry,
      store,
      onError: (error, info) => onErrorRef.current?.(error, info),
    });
    const { show, hide, hideAll, update, preload, isOpen } = controller;
    const publicController = {
      show,
      hide,
      hideAll,
      update,
      preload,
      isOpen,
    } as SheetController<SheetRegistry>;
    return { store, controller, publicController };
  });

  // Stable for the scope's lifetime, so consumers of the context never re-render.
  const value = useMemo(() => {
    const scopeValue = {
      controller: scope.publicController,
      parent,
    } as { -readonly [K in keyof SheetScopeValue]: SheetScopeValue[K] };
    scopeValue.root = parent?.root ?? scopeValue;
    return scopeValue as SheetScopeValue;
  }, [scope, parent]);

  const bridge = useCallback(
    (content: ReactNode) => (
      <ScopeContext.Provider value={value}>{content}</ScopeContext.Provider>
    ),
    [ScopeContext, value]
  );

  const disposeScheduled = useRef(false);
  useEffect(() => {
    disposeScheduled.current = false;
    scope.controller.activate();
    return () => {
      // StrictMode and Fast Refresh run this cleanup and then the effect again
      // straight away. Waiting a microtask lets that re-run cancel the dispose,
      // so only a real unmount (or a hidden <Activity>) disposes the scope.
      disposeScheduled.current = true;
      Promise.resolve().then(() => {
        if (disposeScheduled.current) {
          scope.controller.dispose();
        }
      });
    };
  }, [scope]);

  useAndroidBack(scope.store, scope.controller, closeOnBack);

  return (
    <ScopeContext.Provider value={value}>
      {children}
      <SheetHost
        store={scope.store}
        controller={scope.controller}
        bridge={bridge}
        loadingIndicator={loadingIndicator}
      />
    </ScopeContext.Provider>
  );
}
