import type { NottiNative } from './types';

/** Calls the plugin's Swift shim (`platforms/ios/src/NottiNativeScript.swift`). */
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
  };
}
