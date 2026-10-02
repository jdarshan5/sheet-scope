import type { SheetErrorInfo } from '@jdarshan5/sheet-scope';

export const logSheetError = (error: unknown, { name }: SheetErrorInfo) =>
  console.warn(`Sheet "${name}" failed:`, error);
