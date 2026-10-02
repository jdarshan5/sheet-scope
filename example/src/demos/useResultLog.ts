import { useCallback, useState } from 'react';

/** The last few results a demo produced, newest first. */
export function useResultLog(): [string[], (result: string) => void] {
  const [results, setResults] = useState<string[]>([]);
  const add = useCallback(
    (result: string) =>
      setResults((current) => [result, ...current].slice(0, 5)),
    []
  );
  return [results, add];
}
