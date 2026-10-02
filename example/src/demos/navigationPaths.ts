import type { Href } from 'expo-router';

// The navigation demo is one stack of screens: /navigation/1, /navigation/2, …
// Each screen chooses where its own sheets are drawn: above every screen (the
// app's root BottomSheetModalProvider) or inside the screen (a provider of its
// own). The choice travels in the `sheets` query parameter, so one stack can
// mix both.
export type SheetPlacement = 'above' | 'inside';

/** A screen's placement, read from its `sheets` query parameter. */
export const placementOf = (
  sheets: string | string[] | undefined
): SheetPlacement => (sheets === 'inside' ? 'inside' : 'above');

/** The route of a navigation demo screen, e.g. "/navigation/2?sheets=inside". */
export function navigationHref(step: number, placement: SheetPlacement): Href {
  return {
    pathname: '/navigation/[step]',
    params: placement === 'inside' ? { step, sheets: 'inside' } : { step },
  };
}

/** The step of a navigation demo route, e.g. 2 for "/navigation/2". */
export function navigationStep(pathname: string): number {
  return Number(/^\/navigation\/(\d+)/.exec(pathname)?.[1] ?? 0);
}
