import { useSyncExternalStore } from 'react';

// Shared by every navigation screen, so a screen's sheet can report its result
// even after the screen itself has unmounted.
let lines: string[] = [];
const listeners = new Set<() => void>();

export function logNavigationEvent(line: string) {
  lines = [line, ...lines].slice(0, 6);
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export function useNavigationLog(): string[] {
  return useSyncExternalStore(subscribe, () => lines);
}
