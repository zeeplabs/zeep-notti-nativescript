# zeep-notti-nativescript

**Vision:** NativeScript plugin (`nativescript-notti`) for Notti push notifications and In-App Messages. It holds no business logic: it is a thin TypeScript layer over the native SDKs `NottiSDK` (iOS) and `notti-android` (Android), the same model `react-native-notti` adopted in its M2 (iOS PR #50, Android on `notti-android` 0.2.0).
**For:** NativeScript developers (Core, Angular, Vue, Svelte, React flavors) who integrate Notti into iOS and Android apps.
**Solves:** NativeScript apps cannot use Notti today. The dashboard SDK wizard already lists NativeScript as "in development" (`zeep-notti` PR #228). With the native SDKs published (iOS 0.2.0 on CocoaPods trunk and SPM, Android 0.2.0 on Maven Central), a wrapper adds the platform without a third copy of the push, queue and In-App logic.

## Goals

- **JS API parity with `react-native-notti` (main, 0.9.0 unreleased).** Same methods, events, payload shapes and initial-click semantics, adapted to NativeScript idioms only where RN-specific (no Turbo Module, no `NativeEventEmitter`). Success: every RN public symbol has a documented NativeScript equivalent, and the demo app exercises each one on both platforms.
- **Zero business logic in this repo.** Success: no HTTP, retry, queue, storage or In-App rendering code here; only argument/DTO mapping and event fan-out. Behavior fixes land in the native SDKs and reach NativeScript through a version bump.
- **Correct attribution in the backend.** Success: devices report `sdk_name: "nativescript"` and `sdk_version` equal to this package's version (needs the backend change in M0).
- **Integration in minutes.** Success: a fresh `ns create` app receives and clicks a push on both platforms following only the README (plugin install, `initialize`, Firebase config on Android, Push capability on iOS).

## Tech Stack

**Core:**

- Runtime: NativeScript 9.x (`@nativescript/core` 9.1, CLI 9.1, `@nativescript/ios` 9.1, `@nativescript/android` 9.1); minimum supported version decided in Design
- Language: TypeScript (strict), plus a small Swift shim on iOS (the wrapper entry point is `@_spi(Wrapper)` Swift-only, not visible to the NativeScript Obj-C metadata)
- Package manager: pnpm

**Native dependencies:**

- iOS: CocoaPods `NottiSDK ~> 0.2.0` (iOS 15.0+, needs `OTHER_SWIFT_FLAGS = -package-name NottiSDK` from its podspec); `NottiSDKExtension ~> 0.2.0` for the Notification Service Extension
- Android: `br.com.zeeplabs:notti-android:0.2.0` (minSdk 24, compileSdk 36, Kotlin 2.0+ on the host, brings `firebase-messaging` and its own `FirebaseMessagingService`)

**Testing:** unit tests for the TS mapping layer with the native layer behind a seam (framework decided in Design); demo app plus a device checklist for the native paths.

**Reference implementations:**

- `../zeep-notti-react-native` `origin/main` (API contract, adapter/seam pattern, initial-click handling, docs structure)
- `../zeep-notti-ios-sdk` and `../zeep-notti-android-sdk` (public and wrapper APIs)

## Scope

**v1 includes (parity with `react-native-notti` on the native SDKs):**

- `initialize(appId, clientKey, options?)` through the wrapper entry points (`sdkName: "nativescript"`, `sdkVersion` = package version, `opensInAppURLs: false`)
- `requestPermission`, `login`/`logout`, `setSubscription`, `setLocationSharingEnabled`, `getDeviceId`, `trackEvent`
- `User`: tags (add/remove, single and batch), email and phone set/clear
- Events: notification received, notification clicked, device id changed; cold-start initial click; `InAppMessages` click listener (host opens URLs and deep links)
- iOS: swizzling by default, `NottiDisableSwizzling` opt-out with documented manual forwarding; NSE rich media guide through `NottiSDKExtension`
- Android: SDK-provided `FirebaseMessagingService`, documented coexistence with other FCM plugins (`tools:node="remove"` + `NottiBridge`)
- Demo app, README, CHANGELOG, CI, npm publishing

**Explicitly out of scope (v1):**

- Any push, queue, storage or In-App logic (lives in the native SDKs)
- Flavor-specific helpers (Angular services, Vue composables); the core API works in every flavor
- Backend changes beyond accepting `sdk_name: "nativescript"` (M0, done in `zeep-notti`)
- NSE target automation (hooks that create the extension); v1 documents the manual setup
- SPM as the iOS install path (NativeScript plugins resolve native iOS dependencies through CocoaPods)
- Live Activities, location beyond opt-in country, LGPD wipe/Keychain (native SDK M3 items arrive by version bump)

## Constraints

- **Technical:** one engine per app. The plugin owns `initialize` and the native listeners; an app that also calls the native SDK directly overwrites `sdk_name` and can steal the initial click (same limitation as RN).
- **Technical:** identity calls before `initialize` are dropped on iOS (`login`, tags, `setSubscription`); the JS layer must not hide that behind a silent queue unless Design decides so for both platforms.
- **Technical:** `@_spi(Wrapper)` sits outside the native SDK's semver. Pin native versions exactly enough that a minor native release cannot break the shim unnoticed.
- **Distribution:** CocoaPods trunk is expected to turn read-only around 2026-12-02 (third-party source, unconfirmed). Native iOS releases after that go to a ZeepLabs spec repo (iOS SDK AD-022, proposed). The plugin's Podfile must support that source.
- **Privacy/LGPD:** email, phone and country are personal data. This layer adds no collection, logs no PII or tokens, and stores nothing.
- **Resources:** solo maintainer (Julio). Every native SDK release needs a deliberate bump here.
