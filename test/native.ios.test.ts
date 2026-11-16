import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createIosNative } from '../src/native/native.ios';

const g = globalThis as Record<string, unknown>;

class FakeMutableDictionary {
  readonly entries: [unknown, unknown][] = [];
  static new() {
    return new FakeMutableDictionary();
  }
  setObjectForKey(value: unknown, key: unknown) {
    this.entries.push([key, value]);
  }
}

class FakeArray {
  constructor(readonly items: unknown[]) {}
  static arrayWithArray(items: unknown[]) {
    return new FakeArray([...items]);
  }
}

function makeFacade() {
  return {
    login: vi.fn(),
    logout: vi.fn(),
    setLocationSharingEnabled: vi.fn(),
    trackEvent: vi.fn(),
    deviceId: 'device-1' as string | null | undefined,
  };
}

function makeUser() {
  return {
    setSubscription: vi.fn(),
    addTagValue: vi.fn(),
    addTags: vi.fn(),
    removeTag: vi.fn(),
    removeTags: vi.fn(),
    setEmail: vi.fn(),
    clearEmail: vi.fn(),
    setPhone: vi.fn(),
    clearPhone: vi.fn(),
  };
}

let facade: ReturnType<typeof makeFacade>;
let user: ReturnType<typeof makeUser>;
let notifications: { requestPermission: ReturnType<typeof vi.fn> };

beforeEach(() => {
  facade = makeFacade();
  user = makeUser();
  notifications = { requestPermission: vi.fn() };
  g.NottiSDKFacade = facade;
  g.NottiUser = user;
  g.NottiNotifications = notifications;
  g.NSMutableDictionary = FakeMutableDictionary;
  g.NSArray = FakeArray;
});

afterEach(() => {
  for (const name of [
    'NottiNativeScript',
    'NottiSDKFacade',
    'NottiUser',
    'NottiNotifications',
    'NSMutableDictionary',
    'NSArray',
  ]) {
    delete g[name];
  }
});

describe('iOS adapter: initialize', () => {
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

describe('iOS adapter: NottiSDKFacade calls', () => {
  it('login, logout, location sharing and trackEvent go to NottiSDKFacade', () => {
    const native = createIosNative();
    native.login('user-42');
    native.logout();
    native.setLocationSharingEnabled(true);
    native.trackEvent('cart_viewed');

    expect(facade.login).toHaveBeenCalledExactlyOnceWith('user-42');
    expect(facade.logout).toHaveBeenCalledOnce();
    expect(facade.setLocationSharingEnabled).toHaveBeenCalledExactlyOnceWith(true);
    expect(facade.trackEvent).toHaveBeenCalledExactlyOnceWith('cart_viewed');
  });

  it('getDeviceId returns the device id', () => {
    expect(createIosNative().getDeviceId()).toBe('device-1');
  });

  it.each([undefined, null])('getDeviceId maps %s to null (API-13)', (value) => {
    facade.deviceId = value;
    expect(createIosNative().getDeviceId()).toBeNull();
  });
});

describe('iOS adapter: NottiUser calls', () => {
  it('setSubscription goes to NottiUser, where iOS keeps it', () => {
    createIosNative().setSubscription(false);
    expect(user.setSubscription).toHaveBeenCalledExactlyOnceWith(false);
  });

  it('single-value user methods map to NottiUser', () => {
    const native = createIosNative();
    native.addTag('plan', 'pro');
    native.removeTag('plan');
    native.setEmail('a@b.c');
    native.clearEmail();
    native.setPhone('+5511999999999');
    native.clearPhone();

    expect(user.addTagValue).toHaveBeenCalledExactlyOnceWith('plan', 'pro');
    expect(user.removeTag).toHaveBeenCalledExactlyOnceWith('plan');
    expect(user.setEmail).toHaveBeenCalledExactlyOnceWith('a@b.c');
    expect(user.clearEmail).toHaveBeenCalledOnce();
    expect(user.setPhone).toHaveBeenCalledExactlyOnceWith('+5511999999999');
    expect(user.clearPhone).toHaveBeenCalledOnce();
  });

  it('addTags builds an NSMutableDictionary with every entry (API-04)', () => {
    createIosNative().addTags({ plan: 'pro', city: 'sp' });

    expect(user.addTags).toHaveBeenCalledOnce();
    const dict = user.addTags.mock.calls[0]![0] as FakeMutableDictionary;
    expect(dict).toBeInstanceOf(FakeMutableDictionary);
    expect(dict.entries).toEqual([
      ['plan', 'pro'],
      ['city', 'sp'],
    ]);
  });

  it('removeTags builds an NSArray in the same order (API-05)', () => {
    createIosNative().removeTags(['b', 'a']);

    const array = user.removeTags.mock.calls[0]![0] as FakeArray;
    expect(array).toBeInstanceOf(FakeArray);
    expect(array.items).toEqual(['b', 'a']);
  });
});

describe('iOS adapter: requestPermission (API-08..10)', () => {
  it.each([true, false])('resolves the native answer %s', async (granted) => {
    notifications.requestPermission.mockImplementation((done: (g: boolean) => void) =>
      done(granted)
    );
    await expect(createIosNative().requestPermission()).resolves.toBe(granted);
  });

  it('resolves once even if the native callback fires twice', async () => {
    notifications.requestPermission.mockImplementation((done: (g: boolean) => void) => {
      done(true);
      done(false);
    });
    await expect(createIosNative().requestPermission()).resolves.toBe(true);
  });

  it('rejects when the native call throws, so a broken install surfaces', async () => {
    const error = new Error('NottiNotifications is not defined');
    notifications.requestPermission.mockImplementation(() => {
      throw error;
    });
    await expect(createIosNative().requestPermission()).rejects.toBe(error);
  });
});
