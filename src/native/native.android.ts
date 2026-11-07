import type { NottiNative } from './types';

const SDK_NAME = 'nativescript';

/**
 * Calls `notti-android` directly; no Kotlin source is needed in the plugin.
 * `getContext` is injected so this module never imports `@nativescript/core` (unit-tested in Node).
 */
export function createAndroidNative(getContext: () => globalAndroid.content.Context): NottiNative {
  return {
    initialize(appId, clientKey, baseUrl, sdkVersion) {
      // The host app opens In-App links itself (AD-004).
      const options = new com.zeeplabs.notti.NottiOptions(baseUrl, false);
      com.zeeplabs.notti.Notti.initializeForWrapper(
        getContext(),
        appId,
        clientKey,
        options,
        SDK_NAME,
        sdkVersion
      );
    },
  };
}
