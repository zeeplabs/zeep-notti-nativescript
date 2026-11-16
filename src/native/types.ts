/** A native listener registration; `remove()` detaches it. */
export interface NativeSubscription {
  remove(): void;
}

/**
 * A notification as the app receives it. Delivery always fills `title`, `body` (null when the push
 * has none) and `data` ({} when empty); the optional markers keep react-native-notti code compiling.
 */
export interface NotificationPayload {
  title?: string | null;
  body?: string | null;
  data?: { [key: string]: string };
}

/** The link of an In-App button. Any other action (including `push_permission`) arrives as `null`. */
export interface NottiInAppAction {
  type: 'url' | 'deeplink';
  value: string;
}

/** A tap on an In-App message button or image. */
export interface NottiInAppClick {
  messageId: string;
  buttonId: string;
  action: NottiInAppAction | null;
}

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
  /** Each call attaches one native listener (AD-012); adapters deliver final-shape plain objects. */
  addReceivedListener(listener: (payload: NotificationPayload) => void): NativeSubscription;
  addClickedListener(listener: (payload: NotificationPayload) => void): NativeSubscription;
  addDeviceIdChangedListener(listener: (deviceId: string) => void): NativeSubscription;
  addInAppClickListener(listener: (click: NottiInAppClick) => void): NativeSubscription;
  /** The native launch click (kept while no clicked listener was attached), once; `null` when none. */
  takeInitialClick(): NotificationPayload | null;
}
