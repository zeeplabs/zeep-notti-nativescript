import type { NotificationPayload, NottiInAppAction, NottiInAppClick, NottiNative } from './types';

/** The part of NSDictionary the mapping reads. */
interface DictionaryLike {
  objectForKey(key: string): unknown;
  allKeys: { count: number; objectAtIndex(index: number): unknown };
}

function isDictionary(value: unknown): value is DictionaryLike {
  return typeof (value as DictionaryLike | null | undefined)?.objectForKey === 'function';
}

/**
 * A string, or null for an absent key, null, or NSNull. Checking the type avoids depending on how
 * the runtime marshals NSNull.
 */
function str(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function toRecord(value: unknown): { [key: string]: string } {
  const record: { [key: string]: string } = {};
  if (!isDictionary(value)) return record;
  const keys = value.allKeys;
  for (let i = 0; i < keys.count; i++) {
    const key = keys.objectAtIndex(i);
    const entry = typeof key === 'string' ? value.objectForKey(key) : undefined;
    if (typeof key === 'string' && typeof entry === 'string') record[key] = entry;
  }
  return record;
}

/** NottiObjC.swift: `title`/`body` absent when the push has none, `data` a string map. */
function toPayload(dictionary: unknown): NotificationPayload {
  if (!isDictionary(dictionary)) return { title: null, body: null, data: {} };
  return {
    title: str(dictionary.objectForKey('title')),
    body: str(dictionary.objectForKey('body')),
    data: toRecord(dictionary.objectForKey('data')),
  };
}

function toAction(value: unknown): NottiInAppAction | null {
  if (!isDictionary(value)) return null;
  const type = value.objectForKey('type');
  const target = value.objectForKey('value');
  if ((type === 'url' || type === 'deeplink') && typeof target === 'string') {
    return { type, value: target };
  }
  return null;
}

/** NottiObjC.swift: exactly `messageId`, `buttonId` and `action` (`{type, value}` or NSNull). */
function toInAppClick(dictionary: DictionaryLike): NottiInAppClick {
  return {
    messageId: str(dictionary.objectForKey('messageId')) ?? '',
    buttonId: str(dictionary.objectForKey('buttonId')) ?? '',
    action: toAction(dictionary.objectForKey('action')),
  };
}

/**
 * iOS: the wrapper `initialize` goes through the plugin's Swift shim
 * (`platforms/ios/src/NottiNativeScript.swift`); everything else calls the Obj-C
 * facade of `NottiSDK` directly (`NottiSDKFacade`, `NottiUser`, `NottiNotifications`).
 */
export function createIosNative(): NottiNative {
  return {
    initialize(appId, clientKey, baseUrl, sdkVersion) {
      NottiNativeScript.initializeWithAppIdClientKeyBaseUrlSdkVersion(
        appId,
        clientKey,
        baseUrl,
        sdkVersion
      );
    },
    requestPermission() {
      return new Promise<boolean>((resolve, reject) => {
        try {
          NottiNotifications.requestPermission((granted) => resolve(!!granted));
        } catch (error) {
          reject(error);
        }
      });
    },
    login: (externalUserId) => NottiSDKFacade.login(externalUserId),
    logout: () => NottiSDKFacade.logout(),
    // On iOS the subscription flag lives in `NottiUser`.
    setSubscription: (enabled) => NottiUser.setSubscription(enabled),
    setLocationSharingEnabled: (enabled) => NottiSDKFacade.setLocationSharingEnabled(enabled),
    getDeviceId: () => NottiSDKFacade.deviceId ?? null,
    trackEvent: (name) => NottiSDKFacade.trackEvent(name),
    addTag: (key, value) => NottiUser.addTagValue(key, value),
    addTags(tags) {
      const dictionary = NSMutableDictionary.new<string, string>();
      for (const [key, value] of Object.entries(tags)) {
        dictionary.setObjectForKey(value, key);
      }
      NottiUser.addTags(dictionary);
    },
    removeTag: (key) => NottiUser.removeTag(key),
    removeTags: (keys) => NottiUser.removeTags(NSArray.arrayWithArray(keys)),
    setEmail: (email) => NottiUser.setEmail(email),
    clearEmail: () => NottiUser.clearEmail(),
    setPhone: (phone) => NottiUser.setPhone(phone),
    clearPhone: () => NottiUser.clearPhone(),
    addReceivedListener: (listener) =>
      NottiNotifications.addReceivedListener((d) => listener(toPayload(d))),
    addClickedListener: (listener) =>
      NottiNotifications.addClickedListener((d) => listener(toPayload(d))),
    addDeviceIdChangedListener: (listener) =>
      NottiSDKFacade.addDeviceIdChangedListener((deviceId) => listener(deviceId)),
    addInAppClickListener: (listener) =>
      NottiInAppMessages.addClickListener((d) => listener(toInAppClick(d as DictionaryLike))),
    takeInitialClick() {
      const click = NottiNotifications.takeInitialClick();
      return click ? toPayload(click) : null;
    },
  };
}
