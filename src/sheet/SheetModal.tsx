import { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  forwardRef,
  useCallback,
  useContext,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from 'react';
import type { SheetModalProps } from '../types/sheet';
import { invariant } from '../utils/invariant';
import { SheetErrorBoundary } from './SheetErrorBoundary';
import { SheetHandleContext } from './SheetHandleContext';

/**
 * The root element of every sheet component: gorhom's BottomSheetModal, opened
 * and closed by the sheet's instance. It takes every BottomSheetModal prop
 * except the ones the library controls, and forwards its ref to gorhom's modal.
 */
export const SheetModal = forwardRef<BottomSheetModal, SheetModalProps>(
  function SheetModalWithRef({ children, onDismiss, ...props }, forwardedRef) {
    const context = useContext(SheetHandleContext);
    invariant(
      context,
      '<SheetModal> must be the root of a sheet component opened with useSheets().show().'
    );
    const { handle, status, registerModal, onDismissed, onError, bridge } =
      context;
    const modal = useRef<BottomSheetModal | null>(null);
    const presented = useRef(false);

    // gorhom must get a ref object, not a callback ref: its provider keeps the
    // ref it's given and calls `ref.current.minimize()` / `.dismiss()` on it for
    // stackBehavior 'switch' and 'replace'. So forward the caller's ref separately.
    useImperativeHandle(forwardedRef, () => modal.current as BottomSheetModal);

    useLayoutEffect(registerModal, [registerModal]);

    useLayoutEffect(() => {
      if (status === 'closing') {
        if (presented.current) {
          modal.current?.dismiss();
        } else {
          // Closed before it was ever presented, so there's nothing to animate out.
          onDismissed();
        }
      } else if (!presented.current) {
        presented.current = true;
        modal.current?.present();
      }
    }, [status, onDismissed]);

    // The sheet's own onDismiss runs as well as the library's, never instead of
    // it. The library's goes first, so the promise settles even if the sheet's throws.
    const handleDismiss = useCallback(() => {
      onDismissed();
      onDismiss?.();
    }, [onDismissed, onDismiss]);

    return (
      <BottomSheetModal
        {...props}
        ref={modal}
        name={handle.id}
        onDismiss={handleDismiss}
        enableDismissOnClose
      >
        {/* gorhom portals this content to BottomSheetModalProvider, outside the
            scope's tree, so re-provide the library's contexts and catch errors here. */}
        {bridge(
          <SheetErrorBoundary onError={onError}>
            <SheetHandleContext.Provider value={context}>
              {children}
            </SheetHandleContext.Provider>
          </SheetErrorBoundary>
        )}
      </BottomSheetModal>
    );
  }
);

SheetModal.displayName = 'SheetModal';
