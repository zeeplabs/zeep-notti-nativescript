import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAndroidNative } from '../src/native/native.android';

const g = globalThis as Record<string, unknown>;

class FakeNottiOptions {
  constructor(
    readonly baseUrl: string | null,
    readonly opensInAppUrls: boolean
  ) {}
}

function stubNotti() {
  const initializeForWrapper = vi.fn();
  g.com = {
    zeeplabs: { notti: { Notti: { initializeForWrapper }, NottiOptions: FakeNottiOptions } },
  };
  return initializeForWrapper;
}

afterEach(() => {
  delete g.com;
});

describe('Android adapter', () => {
  it('calls initializeForWrapper as "nativescript" with the app context and the package version', () => {
    const initializeForWrapper = stubNotti();
    const context = { app: true };

    createAndroidNative(() => context as never).initialize(
      'app',
      'key',
      'https://notti.example',
      '1.2.3'
    );

    expect(initializeForWrapper).toHaveBeenCalledOnce();
    const [ctx, appId, clientKey, options, sdkName, sdkVersion] =
      initializeForWrapper.mock.calls[0]!;
    expect(ctx).toBe(context);
    expect([appId, clientKey, sdkName, sdkVersion]).toEqual([
      'app',
      'key',
      'nativescript',
      '1.2.3',
    ]);
    expect(options).toBeInstanceOf(FakeNottiOptions);
    expect(options.baseUrl).toBe('https://notti.example');
  });

  it('turns off In-App link opening, because the host app opens links (AD-004)', () => {
    const initializeForWrapper = stubNotti();

    createAndroidNative(() => ({}) as never).initialize('app', 'key', null, '1.2.3');

    const options = initializeForWrapper.mock.calls[0]![3];
    expect(options.opensInAppUrls).toBe(false);
    expect(options.baseUrl).toBeNull();
  });
});
