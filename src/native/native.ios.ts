import type { NottiNative } from './types';

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
  };
}
