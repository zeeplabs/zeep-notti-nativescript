// Public API of br.com.zeeplabs:notti-android 0.2.0, written from its ABI dump
// (zeep-notti-android-sdk tag 0.2.0, notti/api/notti.api) in the shape `ns typings android` emits.
// The generated file is not committed: the NativeScript 9.1 generator emits nameless
// `export module {` blocks for the SDK's Kotlin sealed/internal classes, which do not compile.
// Names below were checked against that generated output. Update on every native bump.

declare module com {
  export module zeeplabs {
    export module notti {
      export class Notti {
        public static class: java.lang.Class<com.zeeplabs.notti.Notti>;
        public static INSTANCE: com.zeeplabs.notti.Notti;
        public static initialize(
          context: globalAndroid.content.Context,
          appId: string | null,
          clientKey: string | null
        ): void;
        public static initialize(
          context: globalAndroid.content.Context,
          appId: string | null,
          clientKey: string | null,
          options: com.zeeplabs.notti.NottiOptions | null
        ): void;
        /** Wrapper SDKs only (`@NottiWrapperApi`, outside semver). */
        public static initializeForWrapper(
          context: globalAndroid.content.Context,
          appId: string | null,
          clientKey: string | null,
          options: com.zeeplabs.notti.NottiOptions | null,
          sdkName: string | null,
          sdkVersion: string | null
        ): void;
        public static login(externalUserId: string | null): void;
        public static logout(): void;
        public static setSubscription(enabled: boolean): void;
        public static setLocationSharingEnabled(enabled: boolean): void;
        public static trackEvent(name: string | null): void;
        public static getDeviceId(): string | null;
        public static addDeviceIdChangedListener(
          listener: com.zeeplabs.notti.NottiDeviceIdListener
        ): com.zeeplabs.notti.NottiSubscription;
        public static getLogLevel(): com.zeeplabs.notti.NottiLogLevel;
        public static setLogLevel(level: com.zeeplabs.notti.NottiLogLevel): void;
      }
      export module Notti {
        export class InAppMessages {
          public static class: java.lang.Class<com.zeeplabs.notti.Notti.InAppMessages>;
          public static INSTANCE: com.zeeplabs.notti.Notti.InAppMessages;
          public static addClickListener(
            listener: com.zeeplabs.notti.NottiInAppClickListener
          ): com.zeeplabs.notti.NottiSubscription;
        }
        export class Notifications {
          public static class: java.lang.Class<com.zeeplabs.notti.Notti.Notifications>;
          public static INSTANCE: com.zeeplabs.notti.Notti.Notifications;
          public static addClickedListener(
            listener: com.zeeplabs.notti.NottiNotificationListener
          ): com.zeeplabs.notti.NottiSubscription;
          public static addReceivedListener(
            listener: com.zeeplabs.notti.NottiNotificationListener
          ): com.zeeplabs.notti.NottiSubscription;
          public static requestPermission(callback: com.zeeplabs.notti.NottiPermissionCallback): void;
          public static takeInitialClick(): com.zeeplabs.notti.NottiNotification | null;
        }
        export class User {
          public static class: java.lang.Class<com.zeeplabs.notti.Notti.User>;
          public static INSTANCE: com.zeeplabs.notti.Notti.User;
          public static addTag(key: string | null, value: string | null): void;
          public static addTags(tags: java.util.Map<string, string> | null): void;
          public static removeTag(key: string | null): void;
          public static removeTags(keys: java.util.List<string> | null): void;
          public static setEmail(email: string | null): void;
          public static clearEmail(): void;
          public static setPhone(phone: string | null): void;
          public static clearPhone(): void;
        }
      }

      export class NottiBridge {
        public static class: java.lang.Class<com.zeeplabs.notti.NottiBridge>;
        public static INSTANCE: com.zeeplabs.notti.NottiBridge;
        public static onMessageReceived(message: any): void;
        public static onNewToken(token: string | null): void;
      }

      export class NottiOptions {
        public static class: java.lang.Class<com.zeeplabs.notti.NottiOptions>;
        public constructor();
        public constructor(baseUrl: string | null);
        public constructor(baseUrl: string | null, opensInAppUrls: boolean);
        public getBaseUrl(): string | null;
        public getOpensInAppUrls(): boolean;
      }

      export class NottiSubscription {
        public static class: java.lang.Class<com.zeeplabs.notti.NottiSubscription>;
        public remove(): void;
      }

      export class NottiNotification {
        public static class: java.lang.Class<com.zeeplabs.notti.NottiNotification>;
        public getTitle(): string | null;
        public getBody(): string | null;
        public getData(): java.util.Map<string, string>;
      }

      export class NottiInAppClick {
        public static class: java.lang.Class<com.zeeplabs.notti.NottiInAppClick>;
        public getMessageId(): string;
        public getButtonId(): string;
        public getAction(): com.zeeplabs.notti.NottiInAppAction | null;
      }

      export class NottiInAppAction {
        public static class: java.lang.Class<com.zeeplabs.notti.NottiInAppAction>;
        public getType(): com.zeeplabs.notti.NottiInAppAction.Type;
        public getValue(): string;
      }
      export module NottiInAppAction {
        export class Type extends java.lang.Enum<com.zeeplabs.notti.NottiInAppAction.Type> {
          public static class: java.lang.Class<com.zeeplabs.notti.NottiInAppAction.Type>;
          public static URL: com.zeeplabs.notti.NottiInAppAction.Type;
          public static DEEPLINK: com.zeeplabs.notti.NottiInAppAction.Type;
        }
      }

      export class NottiLogLevel extends java.lang.Enum<com.zeeplabs.notti.NottiLogLevel> {
        public static class: java.lang.Class<com.zeeplabs.notti.NottiLogLevel>;
        public static NONE: com.zeeplabs.notti.NottiLogLevel;
        public static ERROR: com.zeeplabs.notti.NottiLogLevel;
        public static WARN: com.zeeplabs.notti.NottiLogLevel;
        public static INFO: com.zeeplabs.notti.NottiLogLevel;
        public static DEBUG: com.zeeplabs.notti.NottiLogLevel;
        public static VERBOSE: com.zeeplabs.notti.NottiLogLevel;
      }

      export class NottiDeviceIdListener {
        public static class: java.lang.Class<com.zeeplabs.notti.NottiDeviceIdListener>;
        public constructor(implementation: { onDeviceIdChanged(deviceId: string): void });
        public onDeviceIdChanged(deviceId: string): void;
      }

      export class NottiNotificationListener {
        public static class: java.lang.Class<com.zeeplabs.notti.NottiNotificationListener>;
        public constructor(implementation: {
          onNotification(notification: com.zeeplabs.notti.NottiNotification): void;
        });
        public onNotification(notification: com.zeeplabs.notti.NottiNotification): void;
      }

      export class NottiInAppClickListener {
        public static class: java.lang.Class<com.zeeplabs.notti.NottiInAppClickListener>;
        public constructor(implementation: {
          onClick(click: com.zeeplabs.notti.NottiInAppClick): void;
        });
        public onClick(click: com.zeeplabs.notti.NottiInAppClick): void;
      }

      export class NottiPermissionCallback {
        public static class: java.lang.Class<com.zeeplabs.notti.NottiPermissionCallback>;
        public constructor(implementation: { onResult(granted: boolean): void });
        public onResult(granted: boolean): void;
      }
    }
  }
}
