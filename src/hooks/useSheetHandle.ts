import { useContext } from 'react';
import { SheetHandleContext } from '../sheet/SheetHandleContext';
import type { SheetHandle } from '../types/sheet';
import { invariant } from '../utils/invariant';

/** The handle of the sheet this component is rendered in, for components deep inside a sheet. */
export function useSheetHandle<R = void>(): SheetHandle<R> {
  const context = useContext(SheetHandleContext);
  invariant(
    context,
    'useSheetHandle() must be called inside a sheet opened with useSheets().show().'
  );
  return context.handle as SheetHandle<R>;
}
