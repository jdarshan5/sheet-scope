/** Logs a warning in dev builds only. */
export function warn(message: string): void {
  if (__DEV__) {
    console.warn(`[sheet-scope] ${message}`);
  }
}
