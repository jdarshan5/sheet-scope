import { useEffect, useState } from 'react';

/** `value`, but it only turns true once it has stayed true for `delayMs`. It turns false straight away. */
export function useDelayedFlag(value: boolean, delayMs: number): boolean {
  const [elapsed, setElapsed] = useState(false);

  useEffect(() => {
    if (!value) {
      setElapsed(false);
      return undefined;
    }
    const timer = setTimeout(() => setElapsed(true), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return value && elapsed;
}
