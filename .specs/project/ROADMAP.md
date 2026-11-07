# Roadmap

**Current Milestone:** M1 (development) / M0 gates the release
**Status:** In Progress

---

## M0 - Backend accepts the NativeScript SDK

**Goal:** `zeep-notti` accepts `sdk_name: "nativescript"` so the plugin's first release is attributed correctly (AD-001).
**Target:** merged and deployed before `nativescript-notti` 0.1.0 is published. Work happens in `../../saas/zeep-notti` (its own `.specs`), tracked here as a dependency.

### Features

**backend-sdk-name-nativescript** - PLANNED (in `zeep-notti`)

- Add `"nativescript"` to `sdkNameValues` (`internal/api/devices_handlers.go`); today any other value gets a 422 on the device PATCH
- Decide the `MinSDKVersionPushPermission` entry for `nativescript` (`internal/inapp/sdkversion.go`) and mirror it in `web/src/screens/inapp/sdkRequirements.ts` (a Go test keeps both in sync). Open: `android` has no entry yet, and a NativeScript device on Android runs the Android engine, so the entry may need to wait for the Android confirmation
- Swagger/docs mention of the new value; dashboard wizard keeps "in development" until M1 ships

---

## M1 - NativeScript SDK on the native SDKs (v0.1.0)

**Goal:** A NativeScript app integrates Notti on iOS and Android with the same JS contract as `react-native-notti`, with all behavior coming from `NottiSDK` 0.2.x and `notti-android` 0.2.x.
**Target:** demo app passes the device checklist on both platforms; CI green; `nativescript-notti@0.1.0` on npm; dashboard wizard links the docs.

### Features

**package-foundation** - IN PROGRESS (2026-11-07; 15/17 tasks, branch `feat/package-foundation`; Android runtime + google-services spike blocked by B-001)

- Single-package repo (AD-003): `src/` (TS API), `platforms/ios` (Podfile + Swift shim), `platforms/android` (`include.gradle`), `demo/` NativeScript Core app, pnpm, TS strict, lint, lefthook, commitlint
- Risk spikes before any API work: Swift shim with `@_spi(Wrapper) import NottiSDK` compiles in a NativeScript iOS build; `-package-name` flag survives the NativeScript Podfile merge (static and `use_frameworks!`); `notti-android` 0.2.0 (Kotlin 2.0, compileSdk 36, AGP 9 built) builds inside a NativeScript 9 Android app; `google-services` plugin applied from the app's `App_Resources`
- Minimum NativeScript version, iOS deployment target and Android min/compile SDK fixed
- CI skeleton (lint, typecheck, unit tests, demo build iOS and Android)

**public-api** - SPECIFY (2026-11-07, `.specs/features/public-api/spec.md`, API-01..18)

- `Notti.initialize` through the wrapper entry points (`sdkName: "nativescript"`, `sdkVersion` = package version, `opensInAppURLs: false`)
- `requestPermission`, `login`/`logout`, `setSubscription`, `setLocationSharingEnabled`, `getDeviceId`, `trackEvent`; `User` tags/email/phone
- TS types and argument mapping behind a native seam, unit-tested on both platform adapters

**events-and-in-app** - PLANNED

- `notificationReceived`, `notificationClicked`, `deviceIdChanged` listeners with removable subscriptions
- Cold-start initial click (take-then-listen semantics, as in RN), reload/HMR safe
- `InAppMessages.addClickListener` (unknown action types map to `null`; host opens URLs)
- Payload normalization identical on both platforms (null vs undefined rules of RN)

**push-integration** - PLANNED

- iOS: swizzling default; `NottiDisableSwizzling` + manual forwarding documented for apps with another push plugin; `aps-environment` entitlement via `App_Resources/iOS`; NSE guide using `NottiSDKExtension`
- Android: SDK-provided `FirebaseMessagingService`; coexistence with `@nativescript/firebase-messaging` (`tools:node="remove"` + `NottiBridge`); notification icon and color via `App_Resources/Android`

**example-and-release** - PLANNED

- Demo app exercising every public method and event; device checklist (`docs/DEVICE_CHECKLIST.md`)
- README, CHANGELOG (Keep a Changelog + upgrade notes), release workflow (npm trusted publishing, tag `vX.Y.Z`)
- `zeep-notti` dashboard: wizard NativeScript entry from "in development" to available, with `docsPath` and a public docs page

---

## Future Considerations

- Flavor helpers (Angular service, Vue composable) if integrators ask
- NSE target automation through a NativeScript hook
- ZeepLabs CocoaPods spec repo as the iOS source after the trunk turns read-only (follows iOS SDK AD-022)
- Native SDK M3 items (LGPD wipe, Keychain, resilient queue) through version bumps
