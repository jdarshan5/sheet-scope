/**
 * A small fake of @gorhom/bottom-sheet for this library's tests. gorhom's own
 * mock can't exercise the library: its dismiss() never calls onDismiss and its
 * provider has no context. This fake behaves like gorhom where it matters:
 *
 * - Modal content is portaled to BottomSheetModalProvider, so React context
 *   inside a sheet comes from above the provider, as in a real app.
 * - dismiss() only starts the close animation, marking the content busy. Tests end
 *   it by firing `magicTap` on the modal's content (testID = the modal's name),
 *   which calls onDismiss.
 * - Firing `accessibilityEscape` on the content stands in for the user swiping the
 *   sheet down: gorhom closes it on its own and calls onDismiss. As in gorhom, a
 *   swipe isn't reported when the modal has `enableDismissOnClose={false}`.
 * - useBottomSheetModal() throws outside a provider, with gorhom's plain-string error.
 * - The provider keeps a stack of presented modals and applies stackBehavior the
 *   way gorhom does: it keeps the ref each modal was given and calls
 *   `ref.current.minimize()` ('switch') or `ref.current.dismiss()` ('replace') on
 *   the modal below. Like gorhom, that does nothing if the ref is a callback ref.
 *   A minimised modal's content isn't rendered.
 */
import type { BottomSheetModalProps } from '@gorhom/bottom-sheet';
import {
  createContext,
  forwardRef,
  Fragment,
  useContext,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { View, type ViewProps } from 'react-native';

type StackBehavior = 'switch' | 'push' | 'replace';

// What gorhom reads off a modal's ref.
type ModalMethods = {
  dismiss(): boolean;
  minimize(): void;
  restore(): void;
  isClosing(): boolean;
};
type StackedModal = { name: string; ref: unknown };

type Portal = {
  nodes: Map<string, ReactNode>;
  version: number;
  listeners: Set<() => void>;
  stack: StackedModal[];
  set(name: string, node: ReactNode): void;
  remove(name: string): void;
  mountSheet(name: string, ref: unknown, behavior: StackBehavior): void;
  unmountSheet(name: string): void;
};

// gorhom calls methods on `ref.current`, so a callback ref yields nothing.
const methodsOf = (ref: unknown): ModalMethods | undefined =>
  (ref as { current?: ModalMethods } | null)?.current;

function createPortal(): Portal {
  const notify = () => {
    portal.version += 1;
    portal.listeners.forEach((listener) => listener());
  };
  const portal: Portal = {
    nodes: new Map(),
    version: 0,
    listeners: new Set(),
    stack: [],
    set(name, node) {
      portal.nodes.set(name, node);
      notify();
    },
    remove(name) {
      portal.nodes.delete(name);
      notify();
    },
    mountSheet(name, ref, behavior) {
      const index = portal.stack.findIndex((modal) => modal.name === name);
      if (index !== -1 && index === portal.stack.length - 1) {
        return;
      }
      const top = methodsOf(portal.stack[portal.stack.length - 1]?.ref);
      if (top && !top.isClosing()) {
        if (behavior === 'replace') {
          top.dismiss();
        } else if (behavior === 'switch') {
          top.minimize();
        }
      }
      if (index !== -1) {
        portal.stack.splice(index, 1);
        methodsOf(ref)?.restore();
      }
      portal.stack.push({ name, ref });
    },
    unmountSheet(name) {
      const wasOnTop = portal.stack[portal.stack.length - 1]?.name === name;
      portal.stack = portal.stack.filter((modal) => modal.name !== name);
      if (wasOnTop) {
        methodsOf(portal.stack[portal.stack.length - 1]?.ref)?.restore();
      }
    },
  };
  return portal;
}

const ModalContext = createContext<Portal | null>(null);

function PortalHost({ portal }: { portal: Portal }) {
  useSyncExternalStore(
    (listener) => {
      portal.listeners.add(listener);
      return () => portal.listeners.delete(listener);
    },
    () => portal.version
  );
  return (
    <>
      {[...portal.nodes].map(([name, node]) => (
        <Fragment key={name}>{node}</Fragment>
      ))}
    </>
  );
}

export function BottomSheetModalProvider({
  children,
}: {
  children?: ReactNode;
}) {
  const [portal] = useState(createPortal);
  return (
    <ModalContext.Provider value={portal}>
      {children}
      <PortalHost portal={portal} />
    </ModalContext.Provider>
  );
}

function useModalContext(): Portal {
  const portal = useContext(ModalContext);
  if (portal === null) {
    // gorhom throws a plain string here, not an Error.
    throw "'BottomSheetModalContext' cannot be null!";
  }
  return portal;
}

export function useBottomSheetModal() {
  useModalContext();
  return { dismiss: () => true, dismissAll: () => {} };
}

const noop = () => {};

export const BottomSheetModal = forwardRef(function FakeBottomSheetModal(
  {
    name = 'modal',
    children,
    onDismiss,
    stackBehavior = 'switch',
    enableDismissOnClose = true,
  }: BottomSheetModalProps,
  ref
) {
  const portal = useModalContext();
  const [state, setState] = useState<
    'hidden' | 'shown' | 'minimized' | 'closing'
  >('hidden');
  const stateRef = useRef(state);
  stateRef.current = state;
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  // Like gorhom, dismiss() only starts the close animation; onDismiss comes when it ends.
  const dismiss = () => {
    setState((current) => (current === 'hidden' ? current : 'closing'));
    return true;
  };
  const finishClosing = () => {
    setState('hidden');
    portal.unmountSheet(name);
    onDismissRef.current?.();
  };

  // Like gorhom, a presented modal that unmounts leaves the stack, restoring the one below.
  useEffect(
    () => () => {
      if (stateRef.current !== 'hidden') {
        portal.unmountSheet(name);
      }
    },
    [portal, name]
  );

  useImperativeHandle(ref, () => ({
    present: () => {
      setState('shown');
      portal.mountSheet(name, ref, stackBehavior);
    },
    dismiss,
    close: dismiss,
    forceClose: dismiss,
    minimize: () => setState('minimized'),
    restore: () =>
      setState((current) => (current === 'minimized' ? 'shown' : current)),
    isClosing: () => stateRef.current === 'closing',
    snapToIndex: noop,
    snapToPosition: noop,
    expand: noop,
    collapse: noop,
  }));

  useLayoutEffect(() => {
    if (state === 'hidden' || state === 'minimized') {
      return undefined;
    }
    portal.set(
      name,
      <View
        testID={name}
        accessibilityState={state === 'closing' ? { busy: true } : undefined}
        onAccessibilityEscape={enableDismissOnClose ? finishClosing : undefined}
        onMagicTap={finishClosing}
      >
        {children as ReactNode}
      </View>
    );
    return () => portal.remove(name);
  });

  return null;
});

export function BottomSheetView(props: ViewProps) {
  return <View {...props} />;
}
