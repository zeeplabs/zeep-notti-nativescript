import { afterEach, describe, expect, it, vi } from 'vitest';

import { createIosNative } from '../src/native/native.ios';

const g = globalThis as Record<string, unknown>;

afterEach(() => {
  delete g.NottiNativeScript;
});

describe('iOS adapter', () => {
  it('forwards initialize to the Swift shim with every argument', () => {
    const initialize = vi.fn();
    g.NottiNativeScript = { initializeWithAppIdClientKeyBaseUrlSdkVersion: initialize };

    createIosNative().initialize('app', 'key', 'https://notti.example', '1.2.3');

    expect(initialize).toHaveBeenCalledExactlyOnceWith(
      'app',
      'key',
      'https://notti.example',
      '1.2.3'
    );
  });

  it('passes a null baseUrl through, so the SDK uses its default host', () => {
    const initialize = vi.fn();
    g.NottiNativeScript = { initializeWithAppIdClientKeyBaseUrlSdkVersion: initialize };

    createIosNative().initialize('app', 'key', null, '1.2.3');

    expect(initialize).toHaveBeenCalledExactlyOnceWith('app', 'key', null, '1.2.3');
  });
});
