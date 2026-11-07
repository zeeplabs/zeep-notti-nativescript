// Spike-only (package-foundation T4-T7): reaches the native wrapper initializers
// directly. T14 replaces this with the nativescript-notti API.
import { isIOS, Utils } from '@nativescript/core'

import { NOTTI_APP_ID, NOTTI_BASE_URL, NOTTI_CLIENT_KEY } from './config.local'

declare const NottiNativeScript: any
declare const com: any

const SPIKE_SDK_VERSION = '0.0.0'

export function initializeNative() {
  if (isIOS) {
    NottiNativeScript.initializeWithAppIdClientKeyBaseUrlSdkVersion(
      NOTTI_APP_ID,
      NOTTI_CLIENT_KEY,
      NOTTI_BASE_URL ?? null,
      SPIKE_SDK_VERSION,
    )
  } else {
    const options = new com.zeeplabs.notti.NottiOptions(NOTTI_BASE_URL ?? null, false)
    com.zeeplabs.notti.Notti.initializeForWrapper(
      Utils.android.getApplicationContext(),
      NOTTI_APP_ID,
      NOTTI_CLIENT_KEY,
      options,
      'nativescript',
      SPIKE_SDK_VERSION,
    )
  }
}
