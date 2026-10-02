import { createContext, type ReactNode } from 'react';
import type { SheetHandle, SheetStatus } from '../types/sheet';

/** Re-provides a scope's context around content rendered outside the scope's tree. */
export type ScopeBridge = (content: ReactNode) => ReactNode;

/** What a sheet's subtree, and its SheetModal, need from the instance rendering it. */
export type SheetContextValue = {
  readonly handle: SheetHandle<unknown>;
  readonly status: SheetStatus;
  /** SheetModal calls this when it mounts, so the instance can check there's exactly one. Returns the unregister function. */
  readonly registerModal: () => () => void;
  /** gorhom's `onDismiss`. */
  readonly onDismissed: () => void;
  /** Reports an error thrown by the sheet's content. */
  readonly onError: (error: unknown) => void;
  readonly bridge: ScopeBridge;
};

export const SheetHandleContext = createContext<SheetContextValue | null>(null);
