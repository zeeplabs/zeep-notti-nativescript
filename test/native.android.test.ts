import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAndroidNative } from '../src/native/native.android';

const g = globalThis as Record<string, unknown>;

class FakeNottiOptions {
  constructor(
    readonly baseUrl: string | null,
    readonly opensInAppUrls: boolean
  ) {}
}

class FakePermissionCallback {
  constructor(readonly implementation: { onResult(granted: boolean): void }) {}
}

class FakeNotificationListener {
  constructor(readonly implementation: { onNotification(n: unknown): void }) {}
}

class FakeDeviceIdListener {
  constructor(readonly implementation: { onDeviceIdChanged(id: string): void }) {}
}

class FakeInAppClickListener {
  constructor(readonly implementation: { onClick(c: unknown): void }) {}
}

class FakeHashMap {
  readonly entries: [unknown, unknown][] = [];
  put(key: unknown, value: unknown) {
    this.entries.push([key, value]);
    return null;
  }
}

class FakeArrayList {
  readonly items: unknown[] = [];
  add(item: unknown) {
    this.items.push(item);
    return true;
  }
}

function makeNotti() {
  return {
    initializeForWrapper: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    setSubscription: vi.fn(),
    setLocationSharingEnabled: vi.fn(),
    trackEvent: vi.fn(),
    getDeviceId: vi.fn((): string | null => 'device-1'),
    addDeviceIdChangedListener: vi.fn(),
    User: {
      addTag: vi.fn(),
      addTags: vi.fn(),
      removeTag: vi.fn(),
      removeTags: vi.fn(),
      setEmail: vi.fn(),
      clearEmail: vi.fn(),
      setPhone: vi.fn(),
      clearPhone: vi.fn(),
    },
    Notifications: {
      requestPermission: vi.fn(),
      addReceivedListener: vi.fn(),
      addClickedListener: vi.fn(),
      takeInitialClick: vi.fn(),
    },
    InAppMessages: { addClickListener: vi.fn() },
  };
}

let notti: ReturnType<typeof makeNotti>;

beforeEach(() => {
  notti = makeNotti();
  g.com = {
    zeeplabs: {
      notti: {
        Notti: notti,
        NottiOptions: FakeNottiOptions,
        NottiPermissionCallback: FakePermissionCallback,
        NottiNotificationListener: FakeNotificationListener,
        NottiDeviceIdListener: FakeDeviceIdListener,
        NottiInAppClickListener: FakeInAppClickListener,
      },
    },
  };
  g.java = { util: { HashMap: FakeHashMap, ArrayList: FakeArrayList } };
});

afterEach(() => {
  delete g.com;
  delete g.java;
});

const native = () => createAndroidNative(() => ({ app: true }) as never);

describe('Android adapter: initialize', () => {
  it('calls initializeForWrapper as "nativescript" with the app context and the package version', () => {
    const context = { app: true };

    createAndroidNative(() => context as never).initialize(
      'app',
      'key',
      'https://notti.example',
      '1.2.3'
    );

    expect(notti.initializeForWrapper).toHaveBeenCalledOnce();
    const [ctx, appId, clientKey, options, sdkName, sdkVersion] =
      notti.initializeForWrapper.mock.calls[0]!;
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
    native().initialize('app', 'key', null, '1.2.3');

    const options = notti.initializeForWrapper.mock.calls[0]![3];
    expect(options.opensInAppUrls).toBe(false);
    expect(options.baseUrl).toBeNull();
  });
});

describe('Android adapter: Notti calls', () => {
  it('login, logout, subscription, location sharing and trackEvent go to Notti', () => {
    const n = native();
    n.login('user-42');
    n.logout();
    n.setSubscription(false);
    n.setLocationSharingEnabled(true);
    n.trackEvent('cart_viewed');

    expect(notti.login).toHaveBeenCalledExactlyOnceWith('user-42');
    expect(notti.logout).toHaveBeenCalledOnce();
    expect(notti.setSubscription).toHaveBeenCalledExactlyOnceWith(false);
    expect(notti.setLocationSharingEnabled).toHaveBeenCalledExactlyOnceWith(true);
    expect(notti.trackEvent).toHaveBeenCalledExactlyOnceWith('cart_viewed');
  });

  it('getDeviceId returns the device id', () => {
    expect(native().getDeviceId()).toBe('device-1');
  });

  it.each([null, undefined])('getDeviceId maps %s to null (API-13)', (value) => {
    notti.getDeviceId.mockReturnValue(value as never);
    expect(native().getDeviceId()).toBeNull();
  });
});

describe('Android adapter: Notti.User calls', () => {
  it('single-value user methods map to Notti.User', () => {
    const n = native();
    n.addTag('plan', 'pro');
    n.removeTag('plan');
    n.setEmail('a@b.c');
    n.clearEmail();
    n.setPhone('+5511999999999');
    n.clearPhone();

    expect(notti.User.addTag).toHaveBeenCalledExactlyOnceWith('plan', 'pro');
    expect(notti.User.removeTag).toHaveBeenCalledExactlyOnceWith('plan');
    expect(notti.User.setEmail).toHaveBeenCalledExactlyOnceWith('a@b.c');
    expect(notti.User.clearEmail).toHaveBeenCalledOnce();
    expect(notti.User.setPhone).toHaveBeenCalledExactlyOnceWith('+5511999999999');
    expect(notti.User.clearPhone).toHaveBeenCalledOnce();
  });

  it('addTags builds a java.util.HashMap with every entry (API-04)', () => {
    native().addTags({ plan: 'pro', city: 'sp' });

    const map = notti.User.addTags.mock.calls[0]![0] as FakeHashMap;
    expect(map).toBeInstanceOf(FakeHashMap);
    expect(map.entries).toEqual([
      ['plan', 'pro'],
      ['city', 'sp'],
    ]);
  });

  it('removeTags builds a java.util.ArrayList in the same order (API-05)', () => {
    native().removeTags(['b', 'a']);

    const list = notti.User.removeTags.mock.calls[0]![0] as FakeArrayList;
    expect(list).toBeInstanceOf(FakeArrayList);
    expect(list.items).toEqual(['b', 'a']);
  });
});

describe('Android adapter: requestPermission (API-08..10)', () => {
  it.each([true, false])('resolves the native answer %s', async (granted) => {
    notti.Notifications.requestPermission.mockImplementation((cb: FakePermissionCallback) =>
      cb.implementation.onResult(granted)
    );
    await expect(native().requestPermission()).resolves.toBe(granted);
  });

  it('resolves once even if the callback fires twice', async () => {
    notti.Notifications.requestPermission.mockImplementation((cb: FakePermissionCallback) => {
      cb.implementation.onResult(true);
      cb.implementation.onResult(false);
    });
    await expect(native().requestPermission()).resolves.toBe(true);
  });

  it('rejects when the native call throws, so a broken install surfaces', async () => {
    const error = new Error('com is not defined');
    notti.Notifications.requestPermission.mockImplementation(() => {
      throw error;
    });
    await expect(native().requestPermission()).rejects.toBe(error);
  });
});

/** A java.util.Map<String, String> as NativeScript exposes it (entrySet().iterator()). */
function javaMap(values: Record<string, string>) {
  return {
    entrySet: () => {
      const entries = Object.entries(values);
      let index = 0;
      return {
        iterator: () => ({
          hasNext: () => index < entries.length,
          next: () => {
            const [key, value] = entries[index++]!;
            return { getKey: () => key, getValue: () => value };
          },
        }),
      };
    },
  };
}

function notification(
  title: string | null,
  body: string | null,
  data: Record<string, string> | null
) {
  return {
    getTitle: () => title,
    getBody: () => body,
    getData: () => (data ? javaMap(data) : null),
  };
}

function inAppClick(type: string | null, value = 'target') {
  return {
    getMessageId: () => 'm1',
    getButtonId: () => 'b1',
    getAction: () =>
      type ? { getType: () => ({ name: () => type }), getValue: () => value } : null,
  };
}

const subscription = { remove: vi.fn() };

describe('Android adapter: notification listeners (EVT-01, 06, 13..15)', () => {
  it.each(['addReceivedListener', 'addClickedListener'] as const)(
    '%s wires a NottiNotificationListener, returns its subscription and maps the payload',
    (method) => {
      notti.Notifications[method].mockReturnValue(subscription);
      const listener = vi.fn();

      expect(native()[method](listener)).toBe(subscription);
      const wired = notti.Notifications[method].mock.calls[0]![0] as FakeNotificationListener;
      expect(wired).toBeInstanceOf(FakeNotificationListener);
      wired.implementation.onNotification(notification('Hi', 'There', { screen: 'home' }));

      expect(listener).toHaveBeenCalledExactlyOnceWith({
        title: 'Hi',
        body: 'There',
        data: { screen: 'home' },
      });
    }
  );

  it('maps a notification without title, body or data to null, null, {}', () => {
    const listener = vi.fn();
    native().addReceivedListener(listener);
    const wired = notti.Notifications.addReceivedListener.mock
      .calls[0]![0] as FakeNotificationListener;
    wired.implementation.onNotification(notification(null, null, null));

    const delivered = listener.mock.calls[0]![0];
    expect(delivered).toEqual({ title: null, body: null, data: {} });
    expect(Object.getPrototypeOf(delivered)).toBe(Object.prototype);
  });
});

describe('Android adapter: device id and launch click (EVT-04, 08)', () => {
  it('addDeviceIdChangedListener wires a NottiDeviceIdListener', () => {
    notti.addDeviceIdChangedListener.mockReturnValue(subscription);
    const listener = vi.fn();

    expect(native().addDeviceIdChangedListener(listener)).toBe(subscription);
    const wired = notti.addDeviceIdChangedListener.mock.calls[0]![0] as FakeDeviceIdListener;
    expect(wired).toBeInstanceOf(FakeDeviceIdListener);
    wired.implementation.onDeviceIdChanged('device-2');

    expect(listener).toHaveBeenCalledExactlyOnceWith('device-2');
  });

  it('takeInitialClick maps the native launch click', () => {
    notti.Notifications.takeInitialClick.mockReturnValue(notification('Hi', null, { a: 'b' }));
    expect(native().takeInitialClick()).toEqual({ title: 'Hi', body: null, data: { a: 'b' } });
  });

  it.each([null, undefined])('takeInitialClick returns null when native returns %s', (value) => {
    notti.Notifications.takeInitialClick.mockReturnValue(value);
    expect(native().takeInitialClick()).toBeNull();
  });
});

describe('Android adapter: In-App clicks (EVT-09..11)', () => {
  function deliver(click: ReturnType<typeof inAppClick>) {
    notti.InAppMessages.addClickListener.mockReturnValue(subscription);
    const listener = vi.fn();
    expect(native().addInAppClickListener(listener)).toBe(subscription);
    const wired = notti.InAppMessages.addClickListener.mock.calls[0]![0] as FakeInAppClickListener;
    expect(wired).toBeInstanceOf(FakeInAppClickListener);
    wired.implementation.onClick(click);
    return listener.mock.calls[0]![0];
  }

  it.each([
    ['URL', 'url'],
    ['DEEPLINK', 'deeplink'],
  ])('maps enum %s to lowercase %s', (name, type) => {
    expect(deliver(inAppClick(name))).toEqual({
      messageId: 'm1',
      buttonId: 'b1',
      action: { type, value: 'target' },
    });
  });

  it.each([
    ['no action', null],
    ['an unknown enum value', 'PUSH_PERMISSION'],
  ])('maps %s to action null', (_, type) => {
    expect(deliver(inAppClick(type)).action).toBeNull();
  });
});
