let lastId = 0;

/**
 * Ids are unique across all scopes, not per scope: each id is also the `name`
 * gorhom keys its modal by, and every scope shares one BottomSheetModalProvider.
 */
export function createId(name: string): string {
  lastId += 1;
  return `${name}-${lastId}`;
}
