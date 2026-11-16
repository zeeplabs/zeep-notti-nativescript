import type {
  NativeSubscription,
  NotificationPayload,
  NottiInAppClick,
  NottiNative,
} from './native/types';
import { SDK_VERSION } from './version';

export interface InitializeOptions {
  /** Backend host (`https://...`). Omit to use the Notti default host. */
  baseUrl?: string;
}

/**
 * The user's tags, email and phone, used for Notti Segments.
 * Before `initialize`, tags are dropped by the native SDK (one warning); email and phone are kept
 * and sent at registration.
 */
export type NottiEventName = 'notificationReceived' | 'notificationClicked' | 'deviceIdChanged';

/** Returned by every listener registration. `remove()` detaches it; extra calls do nothing. */
export interface EventSubscription {
  remove(): void;
}

export interface NottiInAppMessagesApi {
  /**
   * Called when the user taps an In-App message button or image. The SDK never opens the link:
   * handle `action` yourself (`url` or `deeplink`). `action` is `null` for buttons with nothing for
   * the app to do, including `push_permission`, which the SDK runs itself.
   */
  addClickListener(callback: (click: NottiInAppClick) => void): EventSubscription;
}

export interface NottiUserApi {
  /** Adds or replaces one tag. */
  addTag(key: string, value: string): void;
  /** Adds or replaces several tags in one call. Entries whose value is not a string are ignored with a warning. */
  addTags(tags: { [key: string]: string }): void;
  /** Removes one tag. */
  removeTag(key: string): void;
  /** Removes several tags in one call. Items that are not strings are ignored with a warning. */
  removeTags(keys: string[]): void;
  /** Sets the user's email (personal data: collect it only with the user's consent). */
  setEmail(email: string): void;
  clearEmail(): void;
  /** Sets the user's phone (personal data: collect it only with the user's consent). */
  setPhone(phone: string): void;
  clearPhone(): void;
}

/**
 * Notti for NativeScript. Call `initialize` once, as early as possible. Calls made before it are
 * forwarded to the native SDK, which keeps email, phone and `logout`, drops `login`, tags and
 * `setSubscription` (one warning each), and ignores `trackEvent` (same as react-native-notti).
 */
export interface NottiApi {
  /** Starts the SDK and registers the device. */
  initialize(appId: string, clientKey: string, options?: InitializeOptions): void;
  /**
   * Asks for the OS notification permission. Resolves `true` when granted, `false` when denied
   * (and on Android when called before `initialize`, with no dialog). Never rejects on denial.
   */
  requestPermission(): Promise<boolean>;
  /** Links this device to your user id. */
  login(externalUserId: string): void;
  /** Unlinks the user from this device. */
  logout(): void;
  /** Opts the device in (`true`) or out (`false`) of push notifications. */
  setSubscription(enabled: boolean): void;
  /**
   * Opt-in toggle for country-based segment targeting. Defaults to `false`. The SDK never asks for
   * the OS location permission itself; it reads the country only when the app already has it.
   * `false` clears any previously synced country.
   */
  setLocationSharingEnabled(enabled: boolean): void;
  /** The Notti device id, or `null` until the backend assigns one. */
  getDeviceId(): string | null;
  /**
   * Reports an app event that can trigger an In-App message. The name is matched on the device
   * and never sent to the Notti server.
   */
  trackEvent(name: string): void;
  /**
   * Listens for a Notti event. Each listener is attached to the native SDK when added and detached
   * on `remove()`; the plugin keeps no events of its own.
   *
   * - `notificationReceived`: a push arrived while the app runs. On iOS the first listener also gets
   *   pushes received before it was added; Android does not replay them.
   * - `notificationClicked`: the user tapped a notification while a clicked listener was attached.
   *   A tap that arrives with none attached (usually the one that launched the app) is kept for
   *   `getInitialNotificationClick()` instead. Each tap reaches the app exactly once, by one path.
   * - `deviceIdChanged`: the backend assigned a new Notti device id.
   *
   * A callback that throws is logged with `console.error` and never breaks other listeners.
   */
  addEventListener(
    eventName: 'notificationReceived' | 'notificationClicked',
    callback: (payload: NotificationPayload) => void
  ): EventSubscription;
  addEventListener(
    eventName: 'deviceIdChanged',
    callback: (deviceId: string) => void
  ): EventSubscription;
  /**
   * The notification tap kept while no `notificationClicked` listener was attached (normally the one
   * that launched the app), once; `null` when there is none. Call it at startup and also listen for
   * `notificationClicked`, so a launch tap is handled whichever path it takes.
   */
  getInitialNotificationClick(): Promise<NotificationPayload | null>;
  InAppMessages: NottiInAppMessagesApi;
  User: NottiUserApi;
}

const LOG_PREFIX = '[nativescript-notti]';

/**
 * Keeps entries whose value is a string (AD-010). On Android a non-string would reach
 * Kotlin's Map<String, String> as another JVM type. The warning names the key, never the value.
 */
function stringEntries(tags: { [key: string]: unknown }): Record<string, string> {
  const kept: Record<string, string> = {};
  for (const [key, value] of Object.entries(tags)) {
    if (typeof value === 'string') {
      kept[key] = value;
    } else {
      console.warn(`${LOG_PREFIX} addTags: ignored tag "${key}": value is not a string`);
    }
  }
  return kept;
}

/** Keeps string items in order (AD-010); the warning names the index, never the item. */
function stringItems(keys: unknown[]): string[] {
  const kept: string[] = [];
  keys.forEach((key, index) => {
    if (typeof key === 'string') {
      kept.push(key);
    } else {
      console.warn(`${LOG_PREFIX} removeTags: ignored item at index ${index}: not a string`);
    }
  });
  return kept;
}

type PayloadCallback = (payload: NotificationPayload) => void;

const EVENT_NAMES = 'notificationReceived, notificationClicked or deviceIdChanged';

/**
 * Runs an app callback without letting its exception reach the native SDK's listener loop
 * (EVT-16). Logs the label and the error only, never the payload (it may hold personal data).
 */
function guard<T>(label: string, callback: (value: T) => void): (value: T) => void {
  return (value) => {
    try {
      callback(value);
    } catch (error) {
      console.error(`${LOG_PREFIX} ${label} listener threw`, error);
    }
  };
}

/** Makes `remove()` idempotent without keeping any registry (AD-012). */
function once(subscription: NativeSubscription): EventSubscription {
  let removed = false;
  return {
    remove: () => {
      if (!removed) {
        removed = true;
        subscription.remove();
      }
    },
  };
}

export function createNotti(native: NottiNative): NottiApi {
  const User: NottiUserApi = {
    addTag: (key, value) => native.addTag(key, value),
    addTags: (tags) => native.addTags(stringEntries(tags)),
    removeTag: (key) => native.removeTag(key),
    removeTags: (keys) => native.removeTags(stringItems(keys)),
    setEmail: (email) => native.setEmail(email),
    clearEmail: () => native.clearEmail(),
    setPhone: (phone) => native.setPhone(phone),
    clearPhone: () => native.clearPhone(),
  };
  return {
    initialize: (appId, clientKey, options) =>
      native.initialize(appId, clientKey, options?.baseUrl ?? null, SDK_VERSION),
    requestPermission: () => native.requestPermission(),
    login: (externalUserId) => native.login(externalUserId),
    logout: () => native.logout(),
    setSubscription: (enabled) => native.setSubscription(enabled),
    setLocationSharingEnabled: (enabled) => native.setLocationSharingEnabled(enabled),
    getDeviceId: () => native.getDeviceId(),
    trackEvent: (name) => native.trackEvent(name),
    addEventListener: ((eventName: NottiEventName, callback: (value: never) => void) => {
      switch (eventName) {
        case 'notificationReceived':
          return once(native.addReceivedListener(guard(eventName, callback as PayloadCallback)));
        case 'notificationClicked':
          return once(native.addClickedListener(guard(eventName, callback as PayloadCallback)));
        case 'deviceIdChanged':
          return once(
            native.addDeviceIdChangedListener(guard(eventName, callback as (id: string) => void))
          );
        default:
          throw new TypeError(
            `${LOG_PREFIX} unknown event "${String(eventName)}"; expected ${EVENT_NAMES}`
          );
      }
    }) as NottiApi['addEventListener'],
    getInitialNotificationClick: async () => native.takeInitialClick(),
    InAppMessages: {
      addClickListener: (callback) =>
        once(native.addInAppClickListener(guard('inAppClick', callback))),
    },
    User,
  };
}
