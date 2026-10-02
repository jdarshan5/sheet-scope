import { describe, expect, it } from '@jest/globals';
import { invariant } from '../../utils/invariant';

describe('invariant', () => {
  it.each([true, 1, 'yes', {}, []])('passes for %p', (condition) => {
    expect(() => invariant(condition, 'Never thrown.')).not.toThrow();
  });

  it.each([false, 0, '', null, undefined])(
    'throws a prefixed Error for %p',
    (condition) => {
      expect(() => invariant(condition, 'Render <SheetScope>.')).toThrow(
        new Error('[sheet-scope] Render <SheetScope>.')
      );
    }
  );
});
