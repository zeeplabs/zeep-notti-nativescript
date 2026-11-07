import { afterEach, describe, expect, it, vi } from 'vitest';

import type { NottiNative } from '../src/native/types';
import { createNotti } from '../src/notti';
import { SDK_VERSION } from '../src/version';

type Call = [method: keyof NottiNative, args: unknown[]];

function fakeNative(overrides: Partial<NottiNative> = {}) {
  const calls: Call[] = [];
  const record =
    (method: keyof NottiNative) =>
    (...args: unknown[]) => {
      calls.push([method, args]);
    };
  const native: NottiNative = {
    initialize: record('initialize'),
    requestPermission: () => Promise.resolve(true),
    login: record('login'),
    logout: record('logout'),
    setSubscription: record('setSubscription'),
    setLocationSharingEnabled: record('setLocationSharingEnabled'),
    getDeviceId: () => 'device-1',
    trackEvent: record('trackEvent'),
    addTag: record('addTag'),
    addTags: record('addTags'),
    removeTag: record('removeTag'),
    removeTags: record('removeTags'),
    setEmail: record('setEmail'),
    clearEmail: record('clearEmail'),
    setPhone: record('setPhone'),
    clearPhone: record('clearPhone'),
    ...overrides,
  };
  return { native, calls };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Notti.initialize', () => {
  it('forwards appId, clientKey and baseUrl with the package version', () => {
    const { native, calls } = fakeNative();
    createNotti(native).initialize('app', 'key', { baseUrl: 'https://notti.example' });
    expect(calls).toEqual([['initialize', ['app', 'key', 'https://notti.example', SDK_VERSION]]]);
  });

  it('passes null as baseUrl when no options are given, so the native default host is used', () => {
    const { native, calls } = fakeNative();
    createNotti(native).initialize('app', 'key');
    expect(calls).toEqual([['initialize', ['app', 'key', null, SDK_VERSION]]]);
  });

  it('passes null as baseUrl when options omit it', () => {
    const { native, calls } = fakeNative();
    createNotti(native).initialize('app', 'key', {});
    expect(calls).toEqual([['initialize', ['app', 'key', null, SDK_VERSION]]]);
  });
});

describe('Notti methods forward unchanged (API-01, 02, 11, 12, 14, 17)', () => {
  it.each([
    ['login', (n: ReturnType<typeof createNotti>) => n.login('user-42'), ['user-42']],
    ['logout', (n: ReturnType<typeof createNotti>) => n.logout(), []],
    ['setSubscription', (n: ReturnType<typeof createNotti>) => n.setSubscription(false), [false]],
    [
      'setLocationSharingEnabled',
      (n: ReturnType<typeof createNotti>) => n.setLocationSharingEnabled(true),
      [true],
    ],
    [
      'trackEvent',
      (n: ReturnType<typeof createNotti>) => n.trackEvent('cart_viewed'),
      ['cart_viewed'],
    ],
  ] as const)('%s', (method, call, args) => {
    const { native, calls } = fakeNative();
    call(createNotti(native));
    expect(calls).toEqual([[method, args]]);
  });

  it('forwards empty strings too; the native SDK decides (API-17)', () => {
    const { native, calls } = fakeNative();
    createNotti(native).login('');
    expect(calls).toEqual([['login', ['']]]);
  });
});

describe('Notti.requestPermission and getDeviceId (API-08, 13)', () => {
  it('returns the native permission promise result', async () => {
    const { native } = fakeNative({ requestPermission: () => Promise.resolve(false) });
    await expect(createNotti(native).requestPermission()).resolves.toBe(false);
  });

  it('returns the native device id, including null', () => {
    expect(createNotti(fakeNative().native).getDeviceId()).toBe('device-1');
    expect(createNotti(fakeNative({ getDeviceId: () => null }).native).getDeviceId()).toBeNull();
  });
});

describe('Notti.User (API-03..07, 18)', () => {
  it.each([
    [
      'addTag',
      (u: ReturnType<typeof createNotti>['User']) => u.addTag('plan', 'pro'),
      ['plan', 'pro'],
    ],
    ['removeTag', (u: ReturnType<typeof createNotti>['User']) => u.removeTag('plan'), ['plan']],
    ['setEmail', (u: ReturnType<typeof createNotti>['User']) => u.setEmail('a@b.c'), ['a@b.c']],
    ['clearEmail', (u: ReturnType<typeof createNotti>['User']) => u.clearEmail(), []],
    [
      'setPhone',
      (u: ReturnType<typeof createNotti>['User']) => u.setPhone('+5511999999999'),
      ['+5511999999999'],
    ],
    ['clearPhone', (u: ReturnType<typeof createNotti>['User']) => u.clearPhone(), []],
  ] as const)('%s forwards unchanged', (method, call, args) => {
    const { native, calls } = fakeNative();
    call(createNotti(native).User);
    expect(calls).toEqual([[method, args]]);
  });

  it('addTags forwards string entries in one call', () => {
    const { native, calls } = fakeNative();
    createNotti(native).User.addTags({ plan: 'pro', city: 'sp' });
    expect(calls).toEqual([['addTags', [{ plan: 'pro', city: 'sp' }]]]);
  });

  it('addTags drops non-string values with a warning that names the key but not the value (AD-010)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { native, calls } = fakeNative();
    createNotti(native).User.addTags({ plan: 'pro', age: 42 as unknown as string });
    expect(calls).toEqual([['addTags', [{ plan: 'pro' }]]]);
    expect(warn).toHaveBeenCalledOnce();
    const message = String(warn.mock.calls[0]![0]);
    expect(message).toContain('"age"');
    expect(message).not.toContain('42');
  });

  it('removeTags forwards string keys in order and drops others without logging them (AD-010)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { native, calls } = fakeNative();
    createNotti(native).User.removeTags(['b', 7 as unknown as string, 'a']);
    expect(calls).toEqual([['removeTags', [['b', 'a']]]]);
    expect(warn).toHaveBeenCalledOnce();
    expect(String(warn.mock.calls[0]![0])).not.toContain('7');
  });

  it('forwards empty batches once, so the native SDK decides (API-07)', () => {
    const { native, calls } = fakeNative();
    const { User } = createNotti(native);
    User.addTags({});
    User.removeTags([]);
    expect(calls).toEqual([
      ['addTags', [{}]],
      ['removeTags', [[]]],
    ]);
  });

  it('works when methods are destructured (API-18)', () => {
    const { native, calls } = fakeNative();
    const { login } = createNotti(native);
    const { addTag } = createNotti(native).User;
    login('u');
    addTag('k', 'v');
    expect(calls).toEqual([
      ['login', ['u']],
      ['addTag', ['k', 'v']],
    ]);
  });
});
