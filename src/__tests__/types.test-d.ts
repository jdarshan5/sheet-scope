// Type-level tests, checked by `tsc` (yarn typecheck), not run by Jest.
import {
  createSheetScope,
  defineSheets,
  useSheetHandle,
  type SheetErrorInfo,
  type SheetHandle,
  type SheetId,
  type SheetModalProps,
  type SheetPromise,
  type SheetPropsOf,
  type SheetResultOf,
  type SheetScopeProps,
} from '../index';

declare function Confirm(props: {
  title: string;
  sheet: SheetHandle<boolean>;
}): null;
declare function Picker(props: {
  items?: string[];
  sheet: SheetHandle<string>;
}): null;
declare function Info(props: { sheet: SheetHandle }): null;
declare function Label(props: { label: string }): null;

const registry = defineSheets({
  confirm: () => Promise.resolve({ default: Confirm }),
  picker: { load: () => Promise.resolve({ default: Picker }), unique: false },
  info: () => Promise.resolve({ default: Info }),
  label: () => Promise.resolve({ default: Label }),
});

export const { useSheets } = createSheetScope(registry);

type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
const expectType = <T extends true>(_: T) => {};

export function showTypes(sheets: ReturnType<typeof useSheets>) {
  // The result comes from the component's `sheet: SheetHandle<R>` prop.
  const confirm = sheets.show('confirm', { title: 'Delete?' });
  expectType<
    Equals<typeof confirm, SheetPromise<boolean | undefined, 'confirm'>>
  >(true);
  expectType<
    Equals<
      Awaited<ReturnType<typeof sheets.show<'picker'>>>,
      string | undefined
    >
  >(true);
  expectType<
    Equals<Awaited<ReturnType<typeof sheets.show<'info'>>>, void | undefined>
  >(true);
  expectType<
    Equals<Awaited<ReturnType<typeof sheets.show<'label'>>>, void | undefined>
  >(true);

  // @ts-expect-error: `title` is required.
  sheets.show('confirm');
  // @ts-expect-error: a misspelt prop.
  sheets.show('confirm', { titel: 'Delete?' });
  // @ts-expect-error: `sheet` is injected, not passed to show().
  sheets.show('confirm', { title: 'Delete?', sheet: null });
  // @ts-expect-error: not a registered sheet.
  sheets.show('nope');

  // `props` is optional when the sheet has no required props.
  sheets.show('picker');
  sheets.show('picker', { items: ['a'] });
  sheets.show('info');
  sheets.hide(confirm.id);

  // The promise carries its instance id, tagged with the sheet's name.
  expectType<Equals<typeof confirm.id, SheetId<'confirm'>>>(true);
  const id: string = confirm.id;
  sheets.hide(id);
}

export function registryTypes() {
  type Registry = typeof registry;

  // Both entry forms give the same props and result.
  expectType<Equals<SheetPropsOf<Registry['confirm']>, { title: string }>>(
    true
  );
  expectType<Equals<SheetPropsOf<Registry['picker']>, { items?: string[] }>>(
    true
  );
  expectType<Equals<SheetResultOf<Registry['confirm']>, boolean>>(true);
  expectType<Equals<SheetResultOf<Registry['picker']>, string>>(true);
  // A bare SheetHandle, or no `sheet` prop at all: no result.
  expectType<Equals<SheetResultOf<Registry['info']>, void>>(true);
  expectType<Equals<SheetResultOf<Registry['label']>, void>>(true);

  // @ts-expect-error: an entry needs a loader.
  defineSheets({ broken: { unique: false } });
  // @ts-expect-error: a loader returns a promise of the module, not the component.
  defineSheets({ broken: () => Confirm });
}

export function scopeTypes(): SheetScopeProps {
  // useSheets() takes 'nearest' (the default) or 'root'.
  expectType<
    Equals<Parameters<typeof useSheets>, [target?: 'nearest' | 'root']>
  >(true);
  expectType<
    Equals<
      Parameters<NonNullable<SheetScopeProps['onError']>>,
      [error: unknown, info: SheetErrorInfo]
    >
  >(true);
  expectType<
    Equals<SheetErrorInfo, { readonly name: string; readonly id: string }>
  >(true);

  // Every scope prop is optional.
  return {};
}

export function controllerTypes(sheets: ReturnType<typeof useSheets>) {
  const confirm = sheets.show('confirm', { title: 'Delete?' });

  // update() checks props against the sheet the id came from.
  sheets.update(confirm.id, { title: 'Really?' });
  sheets.update(confirm.id, {});
  // @ts-expect-error: a misspelt prop.
  sheets.update(confirm.id, { titel: 'Really?' });
  // @ts-expect-error: `items` belongs to another sheet.
  sheets.update(confirm.id, { items: [] });
  // @ts-expect-error: `sheet` is injected, not updated.
  sheets.update(confirm.id, { sheet: null });
  // @ts-expect-error: the wrong type for `title`.
  sheets.update(confirm.id, { title: 1 });

  sheets.hide(confirm.id);
  sheets.hideAll();
  sheets.preload('picker');
  // @ts-expect-error: not a registered sheet.
  sheets.preload('nope');
  expectType<Equals<ReturnType<typeof sheets.isOpen>, boolean>>(true);
  // @ts-expect-error: not a registered sheet.
  sheets.isOpen('nope');

  // The methods the React layer uses stay off the public controller.
  // @ts-expect-error: internal.
  sheets.close(confirm.id);
  // @ts-expect-error: internal.
  sheets.dispose();
}

export function handleTypes(handle: SheetHandle<boolean>, done: SheetHandle) {
  handle.close(true);
  handle.close();
  // @ts-expect-error: the result type is boolean.
  handle.close('yes');
  done.close();

  expectType<Equals<typeof handle.id, string>>(true);
  handle.update({ title: 'Really?' });
  // @ts-expect-error: the handle's id is read-only.
  handle.id = 'other';

  // useSheetHandle<R>() returns the same handle type as the `sheet` prop.
  expectType<Equals<ReturnType<typeof useSheetHandle<boolean>>, typeof handle>>(
    true
  );
  expectType<Equals<ReturnType<typeof useSheetHandle<void>>, typeof done>>(
    true
  );
}

export function modalPropTypes(): SheetModalProps[] {
  // `onDismiss` is the sheet's own: SheetModal calls it as well as the library's.
  const allowed: SheetModalProps = {
    stackBehavior: 'push',
    onDismiss: () => {},
  };
  // @ts-expect-error: the library sets `name`.
  const name: SheetModalProps = { name: 'confirm' };
  // @ts-expect-error: `false` would stop the sheet's promise settling.
  const keepOpen: SheetModalProps = { enableDismissOnClose: false };
  // It keeps gorhom's signature: no arguments, so it can't receive the result.
  expectType<Equals<SheetModalProps['onDismiss'], (() => void) | undefined>>(
    true
  );
  return [allowed, name, keepOpen];
}
