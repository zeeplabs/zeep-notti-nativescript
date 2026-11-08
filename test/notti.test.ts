import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  NativeSubscription,
  NotificationPayload,
  NottiInAppClick,
  NottiNative,
} from '../src/native/types';
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
    addReceivedListener: () => ({ remove: () => {} }),
    addClickedListener: () => ({ remove: () => {} }),
    addDeviceIdChangedListener: () => ({ remove: () => {} }),
    addInAppClickListener: () => ({ remove: () => {} }),
    takeInitialClick: () => null,
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

/** A native listener method stub that keeps the attached listener and counts removals. */
function listenerStub<T>() {
  const attached: ((value: T) => void)[] = [];
  let removals = 0;
  const add = (listener: (value: T) => void): NativeSubscription => {
    attached.push(listener);
    return {
      remove: () => {
        removals += 1;
      },
    };
  };
  return {
    add,
    attached,
    emit: (value: T) => attached.forEach((listener) => listener(value)),
    removals: () => removals,
  };
}

const payload: NotificationPayload = { title: 'Hi', body: null, data: { screen: 'home' } };
const click: NottiInAppClick = {
  messageId: 'm1',
  buttonId: 'b1',
  action: { type: 'url', value: 'https://notti.example' },
};

describe('Notti.addEventListener (EVT-01, 06, 08, 19)', () => {
  it.each([
    ['notificationReceived', 'addReceivedListener'],
    ['notificationClicked', 'addClickedListener'],
  ] as const)('%s attaches one native listener and delivers payloads', (event, method) => {
    const stub = listenerStub<NotificationPayload>();
    const { native } = fakeNative({ [method]: stub.add });
    const callback = vi.fn();

    createNotti(native).addEventListener(event, callback);
    stub.emit(payload);

    expect(stub.attached).toHaveLength(1);
    expect(callback).toHaveBeenCalledExactlyOnceWith(payload);
  });

  it('deviceIdChanged delivers the device id string', () => {
    const stub = listenerStub<string>();
    const { native } = fakeNative({ addDeviceIdChangedListener: stub.add });
    const callback = vi.fn();

    createNotti(native).addEventListener('deviceIdChanged', callback);
    stub.emit('device-2');

    expect(callback).toHaveBeenCalledExactlyOnceWith('device-2');
  });

  it('attaches nothing until a listener is added (EVT-03)', () => {
    const stub = listenerStub<NotificationPayload>();
    createNotti(fakeNative({ addClickedListener: stub.add }).native);
    expect(stub.attached).toHaveLength(0);
  });

  it('throws a TypeError naming the allowed events for an unknown name (EVT-19)', () => {
    const notti = createNotti(fakeNative().native);
    expect(() => notti.addEventListener('notificationOpened' as never, () => {})).toThrow(
      TypeError
    );
    expect(() => notti.addEventListener('notificationOpened' as never, () => {})).toThrow(
      /notificationReceived, notificationClicked or deviceIdChanged/
    );
  });

  it('does not dedupe the same callback added twice (EVT-20)', () => {
    const stub = listenerStub<NotificationPayload>();
    const notti = createNotti(fakeNative({ addReceivedListener: stub.add }).native);
    const callback = vi.fn();

    notti.addEventListener('notificationReceived', callback);
    notti.addEventListener('notificationReceived', callback);
    stub.emit(payload);

    expect(callback).toHaveBeenCalledTimes(2);
  });
});

describe('subscriptions (EVT-02, 20)', () => {
  it('remove() detaches the native listener once, however often it is called', () => {
    const stub = listenerStub<NotificationPayload>();
    const subscription = createNotti(
      fakeNative({ addClickedListener: stub.add }).native
    ).addEventListener('notificationClicked', () => {});

    subscription.remove();
    subscription.remove();

    expect(stub.removals()).toBe(1);
  });

  it('remove() is safe inside the callback being delivered', () => {
    const stub = listenerStub<NotificationPayload>();
    const notti = createNotti(fakeNative({ addClickedListener: stub.add }).native);
    const subscription = notti.addEventListener('notificationClicked', () => subscription.remove());

    expect(() => stub.emit(payload)).not.toThrow();
    expect(stub.removals()).toBe(1);
  });
});

describe('callback errors are isolated (EVT-16)', () => {
  it('catches a throwing callback, logs it without the payload, and keeps other listeners running', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const stub = listenerStub<NotificationPayload>();
    const notti = createNotti(fakeNative({ addReceivedListener: stub.add }).native);
    const healthy = vi.fn();

    notti.addEventListener('notificationReceived', () => {
      throw new Error('app bug');
    });
    notti.addEventListener('notificationReceived', healthy);

    expect(() => stub.emit(payload)).not.toThrow();
    expect(healthy).toHaveBeenCalledOnce();
    expect(error).toHaveBeenCalledOnce();
    const logged = error.mock.calls[0]!.map(String).join(' ');
    expect(logged).toContain('notificationReceived');
    expect(logged).not.toContain('home');
    expect(logged).not.toContain('Hi');
  });

  it('isolates In-App click callbacks too', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const stub = listenerStub<NottiInAppClick>();
    const notti = createNotti(fakeNative({ addInAppClickListener: stub.add }).native);

    notti.InAppMessages.addClickListener(() => {
      throw new Error('app bug');
    });

    expect(() => stub.emit(click)).not.toThrow();
  });
});

describe('Notti.getInitialNotificationClick (EVT-04, 05)', () => {
  it('resolves the native launch click', async () => {
    const { native } = fakeNative({ takeInitialClick: () => payload });
    await expect(createNotti(native).getInitialNotificationClick()).resolves.toEqual(payload);
  });

  it('resolves null when there is none', async () => {
    await expect(
      createNotti(fakeNative().native).getInitialNotificationClick()
    ).resolves.toBeNull();
  });

  it('rejects when the native call throws', async () => {
    const failure = new Error('not linked');
    const { native } = fakeNative({
      takeInitialClick: () => {
        throw failure;
      },
    });
    await expect(createNotti(native).getInitialNotificationClick()).rejects.toBe(failure);
  });
});

describe('Notti.InAppMessages.addClickListener (EVT-09)', () => {
  it('attaches one native listener and delivers the click', () => {
    const stub = listenerStub<NottiInAppClick>();
    const callback = vi.fn();
    const subscription = createNotti(
      fakeNative({ addInAppClickListener: stub.add }).native
    ).InAppMessages.addClickListener(callback);

    stub.emit(click);
    subscription.remove();
    subscription.remove();

    expect(callback).toHaveBeenCalledExactlyOnceWith(click);
    expect(stub.removals()).toBe(1);
  });
});
