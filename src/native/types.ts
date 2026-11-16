/**
 * Seam between the TS facade and the native SDKs. One implementation per platform
 * (`native.ios.ts`, `native.android.ts`); tests use a fake. Flat on purpose: grouping
 * (`Notti.User`) is a public-API concern of the facade.
 */
export interface NottiNative {
  /**
   * Calls the native wrapper initializer. The adapters fix `sdkName` to "nativescript"
   * (AD-001) and turn off In-App link opening (AD-004); callers cannot change either.
   */
  initialize(appId: string, clientKey: string, baseUrl: string | null, sdkVersion: string): void;
  /** Resolves the native answer; rejects only when the native call throws (AD-011). */
  requestPermission(): Promise<boolean>;
  login(externalUserId: string): void;
  logout(): void;
  setSubscription(enabled: boolean): void;
  setLocationSharingEnabled(enabled: boolean): void;
  /** `null` when the native SDK has no device id yet, never `undefined`. */
  getDeviceId(): string | null;
  trackEvent(name: string): void;
  addTag(key: string, value: string): void;
  addTags(tags: Record<string, string>): void;
  removeTag(key: string): void;
  removeTags(keys: string[]): void;
  setEmail(email: string): void;
  clearEmail(): void;
  setPhone(phone: string): void;
  clearPhone(): void;
}
