/** Throws with an actionable message when `condition` is falsy. */
export function invariant(
  condition: unknown,
  message: string
): asserts condition {
  if (!condition) {
    throw new Error(`[sheet-scope] ${message}`);
  }
}
