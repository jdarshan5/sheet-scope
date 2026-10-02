import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import type { CoreSheetController } from '../core/createSheetController';
import type {
  SheetHandle,
  SheetInstance as SheetInstanceData,
} from '../types/sheet';
import { SheetErrorBoundary } from './SheetErrorBoundary';
import {
  SheetHandleContext,
  type ScopeBridge,
  type SheetContextValue,
} from './SheetHandleContext';

type Props = {
  instance: SheetInstanceData;
  controller: CoreSheetController;
  bridge: ScopeBridge;
};

function LoadedSheet({ instance, controller, bridge }: Props) {
  const { id, name, props, status } = instance;
  const modalCount = useRef(0);

  const handle = useMemo<SheetHandle<unknown>>(
    () => ({
      id,
      close: (result) => controller.close(id, result),
      update: (next) => controller.update(id, next),
    }),
    [controller, id]
  );

  const registerModal = useCallback(() => {
    modalCount.current += 1;
    return () => {
      modalCount.current -= 1;
    };
  }, []);

  const onDismissed = useCallback(
    () => controller.dismissed(id),
    [controller, id]
  );

  const onError = useCallback(
    (error: unknown) => controller.fail(id, error),
    [controller, id]
  );

  const context = useMemo<SheetContextValue>(
    () => ({ handle, status, registerModal, onDismissed, onError, bridge }),
    [handle, status, registerModal, onDismissed, onError, bridge]
  );

  // SheetModal registers in a layout effect, and those all run before this one.
  useEffect(() => {
    if (modalCount.current !== 1) {
      controller.fail(
        id,
        new Error(
          `[sheet-scope] Sheet "${name}" must render exactly one <SheetModal> as its root, on its first render. It rendered ${modalCount.current}.`
        )
      );
    }
  }, [controller, id, name]);

  // The controller only moves an instance past 'loading' once its module has loaded.
  const Sheet = controller.getModule(name)?.default;
  if (!Sheet) {
    return null;
  }

  return (
    <SheetErrorBoundary onError={onError}>
      <SheetHandleContext.Provider value={context}>
        <Sheet {...props} sheet={handle} />
      </SheetHandleContext.Provider>
    </SheetErrorBoundary>
  );
}

/**
 * Renders one instance's sheet once its module has loaded. It's memoised and
 * keyed by id, so an instance re-renders only when its own data changes.
 */
export const SheetInstance = memo(function MemoSheetInstance(props: Props) {
  return props.instance.status === 'loading' ? null : (
    <LoadedSheet {...props} />
  );
});
