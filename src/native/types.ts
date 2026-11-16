/**
 * Seam between the TS facade and the native SDKs. One implementation per platform
 * (`native.ios.ts`, `native.android.ts`); tests use a fake.
 */
export interface NottiNative {
  /**
   * Calls the native wrapper initializer. The adapters fix `sdkName` to "nativescript"
   * (AD-001) and turn off In-App link opening (AD-004); callers cannot change either.
   */
  initialize(appId: string, clientKey: string, baseUrl: string | null, sdkVersion: string): void;
}
