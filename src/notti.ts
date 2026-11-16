import type { NottiNative } from './native/types';
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
    User,
  };
}
