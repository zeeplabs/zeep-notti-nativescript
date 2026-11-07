import type { NottiNative } from './native/types';
import { SDK_VERSION } from './version';

export interface InitializeOptions {
  /** Backend host (`https://...`). Omit to use the Notti default host. */
  baseUrl?: string;
}

export interface NottiUserApi {
  addTag(key: string, value: string): void;
  addTags(tags: { [key: string]: string }): void;
  removeTag(key: string): void;
  removeTags(keys: string[]): void;
  setEmail(email: string): void;
  clearEmail(): void;
  setPhone(phone: string): void;
  clearPhone(): void;
}

export interface NottiApi {
  initialize(appId: string, clientKey: string, options?: InitializeOptions): void;
  requestPermission(): Promise<boolean>;
  login(externalUserId: string): void;
  logout(): void;
  setSubscription(enabled: boolean): void;
  setLocationSharingEnabled(enabled: boolean): void;
  getDeviceId(): string | null;
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
