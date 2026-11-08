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
    addDeviceIdChangedListener: vi.fn(),
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
let notifications: {
  requestPermission: ReturnType<typeof vi.fn>;
  addReceivedListener: ReturnType<typeof vi.fn>;
  addClickedListener: ReturnType<typeof vi.fn>;
  takeInitialClick: ReturnType<typeof vi.fn>;
};
let inApp: { addClickListener: ReturnType<typeof vi.fn> };

beforeEach(() => {
  facade = makeFacade();
  user = makeUser();
  notifications = {
    requestPermission: vi.fn(),
    addReceivedListener: vi.fn(),
    addClickedListener: vi.fn(),
    takeInitialClick: vi.fn(),
  };
  inApp = { addClickListener: vi.fn() };
  g.NottiInAppMessages = inApp;
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
    'NottiInAppMessages',
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

/** Stands in for an NSDictionary as the NativeScript runtime exposes it. */
class FakeDictionary {
  constructor(private readonly values: Record<string, unknown>) {}
  objectForKey(key: string) {
    return this.values[key];
  }
  get allKeys() {
    const keys = Object.keys(this.values);
    return { count: keys.length, objectAtIndex: (i: number) => keys[i] };
  }
}

/** Stands in for NSNull if the runtime hands it to JS as an object. */
class FakeNSNull {}

const subscription = { remove: vi.fn() };

describe('iOS adapter: notification listeners (EVT-01, 06, 13..15)', () => {
  it.each(['addReceivedListener', 'addClickedListener'] as const)(
    '%s attaches one native listener, returns its subscription and maps the payload',
    (method) => {
      notifications[method].mockReturnValue(subscription);
      const listener = vi.fn();

      const returned = createIosNative()[method](listener);
      const nativeHandler = notifications[method].mock.calls[0]![0] as (d: unknown) => void;
      nativeHandler(
        new FakeDictionary({
          title: 'Hi',
          body: 'There',
          data: new FakeDictionary({ screen: 'home', id: '7' }),
        })
      );

      expect(notifications[method]).toHaveBeenCalledOnce();
      expect(returned).toBe(subscription);
      expect(listener).toHaveBeenCalledExactlyOnceWith({
        title: 'Hi',
        body: 'There',
        data: { screen: 'home', id: '7' },
      });
    }
  );

  it.each([
    ['absent keys', new FakeDictionary({})],
    ['null values', new FakeDictionary({ title: null, body: null, data: null })],
    ['NSNull values', new FakeDictionary({ title: new FakeNSNull(), body: new FakeNSNull() })],
  ])('maps %s to title/body null and data {}', (_, dictionary) => {
    const listener = vi.fn();
    createIosNative().addReceivedListener(listener);
    (notifications.addReceivedListener.mock.calls[0]![0] as (d: unknown) => void)(dictionary);

    const delivered = listener.mock.calls[0]![0];
    expect(delivered).toEqual({ title: null, body: null, data: {} });
    expect(Object.getPrototypeOf(delivered)).toBe(Object.prototype);
  });
});

describe('iOS adapter: device id and launch click (EVT-04, 08)', () => {
  it('addDeviceIdChangedListener forwards the id from NottiSDKFacade', () => {
    facade.addDeviceIdChangedListener.mockReturnValue(subscription);
    const listener = vi.fn();

    expect(createIosNative().addDeviceIdChangedListener(listener)).toBe(subscription);
    (facade.addDeviceIdChangedListener.mock.calls[0]![0] as (id: string) => void)('device-2');

    expect(listener).toHaveBeenCalledExactlyOnceWith('device-2');
  });

  it('takeInitialClick maps the native launch click', () => {
    notifications.takeInitialClick.mockReturnValue(
      new FakeDictionary({ title: 'Hi', data: new FakeDictionary({ screen: 'home' }) })
    );
    expect(createIosNative().takeInitialClick()).toEqual({
      title: 'Hi',
      body: null,
      data: { screen: 'home' },
    });
  });

  it.each([null, undefined])('takeInitialClick returns null when native returns %s', (value) => {
    notifications.takeInitialClick.mockReturnValue(value);
    expect(createIosNative().takeInitialClick()).toBeNull();
  });
});

describe('iOS adapter: In-App clicks (EVT-09..11)', () => {
  function deliver(dictionary: FakeDictionary) {
    inApp.addClickListener.mockReturnValue(subscription);
    const listener = vi.fn();
    expect(createIosNative().addInAppClickListener(listener)).toBe(subscription);
    (inApp.addClickListener.mock.calls[0]![0] as (d: unknown) => void)(dictionary);
    return listener.mock.calls[0]![0];
  }

  it.each(['url', 'deeplink'])('keeps a %s action', (type) => {
    const click = deliver(
      new FakeDictionary({
        messageId: 'm1',
        buttonId: 'b1',
        action: new FakeDictionary({ type, value: 'target' }),
      })
    );
    expect(click).toEqual({ messageId: 'm1', buttonId: 'b1', action: { type, value: 'target' } });
  });

  it.each([
    ['NSNull', new FakeNSNull()],
    ['null', null],
    ['another type', new FakeDictionary({ type: 'push_permission', value: 'x' })],
    ['a missing value', new FakeDictionary({ type: 'url' })],
  ])('maps %s to action null', (_, action) => {
    const click = deliver(new FakeDictionary({ messageId: 'm1', buttonId: 'b1', action }));
    expect(click.action).toBeNull();
  });
});
