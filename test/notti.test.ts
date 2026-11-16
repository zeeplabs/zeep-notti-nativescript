import { describe, expect, it } from 'vitest';

import type { NottiNative } from '../src/native/types';
import { createNotti } from '../src/notti';
import { SDK_VERSION } from '../src/version';

function fakeNative() {
  const calls: Parameters<NottiNative['initialize']>[] = [];
  const native: NottiNative = {
    initialize: (...args) => {
      calls.push(args);
    },
  };
  return { native, calls };
}

describe('Notti.initialize', () => {
  it('forwards appId, clientKey and baseUrl with the package version', () => {
    const { native, calls } = fakeNative();
    createNotti(native).initialize('app', 'key', { baseUrl: 'https://notti.example' });
    expect(calls).toEqual([['app', 'key', 'https://notti.example', SDK_VERSION]]);
  });

  it('passes null as baseUrl when no options are given, so the native default host is used', () => {
    const { native, calls } = fakeNative();
    createNotti(native).initialize('app', 'key');
    expect(calls).toEqual([['app', 'key', null, SDK_VERSION]]);
  });

  it('passes null as baseUrl when options omit it', () => {
    const { native, calls } = fakeNative();
    createNotti(native).initialize('app', 'key', {});
    expect(calls).toEqual([['app', 'key', null, SDK_VERSION]]);
  });
});
