import type { ReactNode } from 'react';
import type { CoreSheetController } from '../core/createSheetController';
import type { SheetStore } from '../core/createSheetStore';
import { useDelayedFlag } from '../hooks/useDelayedFlag';
import { useStoreSnapshot } from '../hooks/useStoreSnapshot';
import type { ScopeBridge } from '../sheet/SheetHandleContext';
import { SheetInstance } from '../sheet/SheetInstance';

// On native a sheet's module loads within a frame or two; only show the indicator for slower loads, like web chunks.
const LOADING_INDICATOR_DELAY_MS = 150;

type Props = {
  store: SheetStore;
  controller: CoreSheetController;
  bridge: ScopeBridge;
  loadingIndicator?: ReactNode;
};

/** The only component that subscribes to the store, so opening a sheet doesn't re-render the screen. */
export function SheetHost({
  store,
  controller,
  bridge,
  loadingIndicator,
}: Props) {
  const instances = useStoreSnapshot(store);
  const showLoadingIndicator = useDelayedFlag(
    loadingIndicator != null &&
      instances.some((instance) => instance.status === 'loading'),
    LOADING_INDICATOR_DELAY_MS
  );

  return (
    <>
      {instances.map((instance) => (
        <SheetInstance
          key={instance.id}
          instance={instance}
          controller={controller}
          bridge={bridge}
        />
      ))}
      {showLoadingIndicator ? loadingIndicator : null}
    </>
  );
}
