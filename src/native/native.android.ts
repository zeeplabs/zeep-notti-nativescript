import type { NottiNative } from './types';

const SDK_NAME = 'nativescript';

/**
 * Calls `notti-android` directly; no Kotlin source is needed in the plugin.
 * `getContext` is injected so this module never imports `@nativescript/core` (unit-tested in Node).
 */
export function createAndroidNative(getContext: () => globalAndroid.content.Context): NottiNative {
  const Notti = () => com.zeeplabs.notti.Notti;
  const User = () => com.zeeplabs.notti.Notti.User;
  return {
    initialize(appId, clientKey, baseUrl, sdkVersion) {
      // The host app opens In-App links itself (AD-004).
      const options = new com.zeeplabs.notti.NottiOptions(baseUrl, false);
      Notti().initializeForWrapper(getContext(), appId, clientKey, options, SDK_NAME, sdkVersion);
    },
    requestPermission() {
      return new Promise<boolean>((resolve, reject) => {
        try {
          com.zeeplabs.notti.Notti.Notifications.requestPermission(
            new com.zeeplabs.notti.NottiPermissionCallback({
              onResult: (granted) => resolve(!!granted),
            })
          );
        } catch (error) {
          reject(error);
        }
      });
    },
    login: (externalUserId) => Notti().login(externalUserId),
    logout: () => Notti().logout(),
    setSubscription: (enabled) => Notti().setSubscription(enabled),
    setLocationSharingEnabled: (enabled) => Notti().setLocationSharingEnabled(enabled),
    getDeviceId: () => Notti().getDeviceId() ?? null,
    trackEvent: (name) => Notti().trackEvent(name),
    addTag: (key, value) => User().addTag(key, value),
    addTags(tags) {
      const map = new java.util.HashMap<string, string>();
      for (const [key, value] of Object.entries(tags)) {
        map.put(key, value);
      }
      User().addTags(map);
    },
    removeTag: (key) => User().removeTag(key),
    removeTags(keys) {
      const list = new java.util.ArrayList<string>();
      for (const key of keys) {
        list.add(key);
      }
      User().removeTags(list);
    },
    setEmail: (email) => User().setEmail(email),
    clearEmail: () => User().clearEmail(),
    setPhone: (phone) => User().setPhone(phone),
    clearPhone: () => User().clearPhone(),
  };
}
