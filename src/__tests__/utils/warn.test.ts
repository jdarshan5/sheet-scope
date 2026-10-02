import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { warn } from '../../utils/warn';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('warn', () => {
  it('logs a prefixed warning in dev', () => {
    const consoleWarn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => {});

    warn('Something looks wrong.');

    expect(consoleWarn).toHaveBeenCalledTimes(1);
    expect(consoleWarn).toHaveBeenCalledWith(
      '[sheet-scope] Something looks wrong.'
    );
  });

  it('logs nothing in production', () => {
    const consoleWarn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => {});
    jest.replaceProperty(
      globalThis as unknown as { __DEV__: boolean },
      '__DEV__',
      false
    );

    warn('Something looks wrong.');

    expect(consoleWarn).not.toHaveBeenCalled();
  });
});
