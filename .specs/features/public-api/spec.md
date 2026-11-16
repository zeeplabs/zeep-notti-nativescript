# Public API Specification

**Status**: Approved (2026-11-07; decisions AD-009, AD-010, AD-011)

## Problem Statement

`nativescript-notti` exposes only `Notti.initialize` (package-foundation). A NativeScript app still cannot
identify a user, segment with tags, ask for push permission, opt in or out, or report In-App trigger events.
`react-native-notti` (`origin/main`, `src/index.tsx`) already defines that contract on top of the same native
SDKs, so this feature brings the same calls to NativeScript, with every behavior coming from `NottiSDK` 0.2.x
and `notti-android` 0.2.x and none implemented in TypeScript (PROJECT goal "zero business logic").

## Goals

- [ ] Every non-event method of the RN public API exists in `nativescript-notti` with the same name,
      arguments, return type and documented behavior (parity table below).
- [ ] Both platform adapters call only public native API: the iOS Obj-C facade (`NottiSDKFacade`, `NottiUser`,
      `NottiNotifications`) and the Android public API (`com.zeeplabs.notti.Notti`, `Notti.User`,
      `Notti.Notifications`). No new Swift or Kotlin source.
- [ ] Each method is unit-tested at the facade and in both adapters (Node, native globals stubbed).

## Out of Scope

| Feature | Reason |
| --- | --- |
| `addEventListener` (received, clicked, deviceIdChanged), `getInitialNotificationClick`, `InAppMessages.addClickListener` | `events-and-in-app` feature |
| Log level API | Not in the RN public API; native SDKs keep their own default (off in release) |
| Manual APNs/FCM forwarding API | `push-integration` feature (docs for apps that disable swizzling or own the FCM service) |
| A TS queue for calls made before `initialize` | Would be business logic in TS and diverge from RN; native behavior is kept (API-17) |
| Argument validation beyond type safety (email format, tag key rules) | Native SDKs validate and log; duplicating rules here would drift |

---

## Parity table (RN `origin/main` → NativeScript → native)

| RN API | NativeScript API | iOS call | Android call |
| --- | --- | --- | --- |
| `requestPermission(): Promise<boolean>` | same | `NottiNotifications.requestPermission(completion)` | `Notti.Notifications.requestPermission(NottiPermissionCallback)` |
| `login(externalUserId: string)` | same | `NottiSDKFacade.login` | `Notti.login` |
| `logout()` | same | `NottiSDKFacade.logout` | `Notti.logout` |
| `setSubscription(enabled: boolean)` | same | `NottiUser.setSubscription` | `Notti.setSubscription` |
| `setLocationSharingEnabled(enabled: boolean)` | same | `NottiSDKFacade.setLocationSharingEnabled` | `Notti.setLocationSharingEnabled` |
| `getDeviceId(): string \| null` (sync) | same | `NottiSDKFacade.deviceId` | `Notti.getDeviceId()` |
| `trackEvent(name: string)` | same | `NottiSDKFacade.trackEvent` | `Notti.trackEvent` |
| `User.addTag(key, value)` | same | `NottiUser.addTagValue` | `Notti.User.addTag` |
| `User.addTags({ [key]: value })` | same | `NottiUser.addTags(NSDictionary)` | `Notti.User.addTags(java.util.Map)` |
| `User.removeTag(key)` | same | `NottiUser.removeTag` | `Notti.User.removeTag` |
| `User.removeTags(keys: string[])` | same | `NottiUser.removeTags(NSArray)` | `Notti.User.removeTags(java.util.List)` |
| `User.setEmail` / `clearEmail` | same | `NottiUser.setEmail` / `clearEmail` | `Notti.User.setEmail` / `clearEmail` |
| `User.setPhone` / `clearPhone` | same | `NottiUser.setPhone` / `clearPhone` | `Notti.User.setPhone` / `clearPhone` |

Notes [Certo, read in source]: the RN facade sends `baseUrl ?? 'https://app.zeepnotti.app'`; both native SDKs use the
same host when `baseUrl` is null (`NottiFacade.defaultBaseUrl`, `Notti.DEFAULT_BASE_URL`), so this plugin keeps
passing `null` (no change to `initialize`). RN's `User.addTag`/`removeTag` call the plural native methods; here the
native SDKs have singular methods, so they are used directly (same effect).

---

## User Stories

### P1: Identify the user ⭐ MVP

**User Story**: As an app developer, I want `Notti.login(externalUserId)` and `Notti.logout()`, so that pushes and
segments target my own user id across devices.

**Acceptance Criteria**:

1. WHEN the app calls `Notti.login(id)` THEN the plugin SHALL call the native login with `id` unchanged on both platforms.
2. WHEN the app calls `Notti.logout()` THEN the plugin SHALL call the native logout on both platforms.

**Independent Test**: unit tests on both adapters; demo button calls login/logout and the native SDK log shows the call (verbose log not required).

---

### P1: Tags, email and phone ⭐ MVP

**User Story**: As an app developer, I want `Notti.User` tag, email and phone methods, so that I can build Notti Segments.

**Acceptance Criteria**:

1. WHEN the app calls `User.addTag(key, value)`, `removeTag(key)`, `setEmail`, `clearEmail`, `setPhone` or `clearPhone`
   THEN the plugin SHALL call the matching native method with the same arguments.
2. WHEN the app calls `User.addTags(tags)` THEN the plugin SHALL convert the JS object to an `NSDictionary` (iOS) or a
   `java.util.HashMap<String, String>` (Android) with the same entries and call the native batch method once.
3. WHEN the app calls `User.removeTags(keys)` THEN the plugin SHALL convert the array to an `NSArray` (iOS) or a
   `java.util.ArrayList<String>` (Android) in the same order and call the native batch method once.
4. WHEN `addTags` receives an entry whose value is not a string at runtime (plain-JS caller) THEN the plugin SHALL
   leave that entry out of the native call and log one `console.warn` naming the key, never the value; on Android a
   non-string would otherwise reach Kotlin's `Map<String, String>` as another type.
5. WHEN `removeTags` receives a non-string item at runtime THEN the plugin SHALL leave it out the same way.
6. WHEN `addTags({})` or `removeTags([])` is called THEN the plugin SHALL still call the native method once (the native
   SDK decides it is a no-op), so behavior matches RN.

**Independent Test**: adapter tests assert the converted native collections; facade test for the non-string filter.

---

### P1: Push permission ⭐ MVP

**User Story**: As an app developer, I want `await Notti.requestPermission()`, so that I can ask for notification
permission at the right moment and know the result.

**Acceptance Criteria**:

1. WHEN the app calls `requestPermission()` THEN the plugin SHALL return a `Promise<boolean>` that resolves with the
   native callback's value exactly once.
2. WHEN the native SDK answers `false` (denied, or called before `initialize` on Android) THEN the promise SHALL resolve
   `false`, never reject.
3. WHEN the native call throws synchronously (SDK not linked) THEN the promise SHALL reject with that error (an install
   problem must surface, per package-foundation error strategy).

**Independent Test**: adapter tests with a stub that invokes the callback with `true`/`false`; demo shows the OS dialog on a device.

---

### P1: Subscription and location sharing ⭐ MVP

**User Story**: As an app developer, I want `setSubscription(enabled)` and `setLocationSharingEnabled(enabled)`, so that
users can opt out of pushes and opt in to country targeting.

**Acceptance Criteria**:

1. WHEN the app calls `setSubscription(b)` THEN the plugin SHALL call `NottiUser.setSubscription(b)` on iOS and
   `Notti.setSubscription(b)` on Android.
2. WHEN the app calls `setLocationSharingEnabled(b)` THEN the plugin SHALL call the native method with `b`. The plugin
   SHALL NOT request OS location permission (native behavior, documented in README as in RN).

**Independent Test**: adapter unit tests.

---

### P1: Device id and In-App trigger events ⭐ MVP

**User Story**: As an app developer, I want `getDeviceId()` and `trackEvent(name)`, so that I can correlate support
tickets with the Notti device and trigger In-App messages from app events.

**Acceptance Criteria**:

1. WHEN the app calls `getDeviceId()` THEN the plugin SHALL return the native value synchronously, as `string`, or
   `null` when the native SDK has none (iOS `nil`/`undefined` and Android `null` both map to `null`, never `undefined`).
2. WHEN the app calls `trackEvent(name)` THEN the plugin SHALL call the native `trackEvent` with `name` unchanged.

**Independent Test**: adapter tests for both null shapes; facade test that `undefined` never leaks.

---

### P2: Public types and docs

**User Story**: As an app developer, I want typed exports and README docs for every method, so that I can integrate
without reading the RN docs.

**Acceptance Criteria**:

1. WHEN the package is built THEN `dist/index.d.ts` SHALL declare `Notti` with every method above and `Notti.User`,
   with JSDoc carrying the behavior notes (pre-initialize rules, location note, trackEvent never sent to the server).
2. WHEN a developer reads README THEN each method SHALL have a one-line description and the pre-initialize rule (API-17)
   SHALL be stated once.

---

## Edge Cases

- **API-17 (pre-initialize)** WHEN a method is called before `initialize` THEN the plugin SHALL forward it unchanged and
  the native SDK decides [Certo, native docs]: iOS and Android keep email, phone and `logout`, drop `login`, tags and
  `setSubscription` with one warning log; Android `requestPermission` answers `false` without a dialog; `trackEvent` is
  ignored before `initialize`. No TS queue (Out of Scope).
- WHEN `login('')` or an empty tag key is passed THEN the plugin SHALL forward it; native SDKs log and ignore.
- WHEN `Notti.User` methods are destructured (`const { addTag } = Notti.User`) THEN they SHALL still work (no `this`).
- WHEN the app calls any method many times quickly THEN the plugin SHALL keep call order (synchronous forwarding).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| API-01 | P1: login | Execute | Verified |
| API-02 | P1: logout | Execute | Verified |
| API-03 | P1: User single-value methods (addTag, removeTag, email, phone) | Execute | Verified |
| API-04 | P1: addTags → NSDictionary / HashMap | Execute | Verified |
| API-05 | P1: removeTags → NSArray / ArrayList | Execute | Verified |
| API-06 | P1: non-string tag values/keys filtered with a warning (no values logged) | Execute | Verified |
| API-07 | P1: empty batches still forwarded | Execute | Verified |
| API-08 | P1: requestPermission resolves native boolean once | Execute | Verified (unit + iOS run; Android runtime B-001) |
| API-09 | P1: requestPermission resolves false, never rejects on denial | Execute | Verified (unit + iOS run; Android runtime B-001) |
| API-10 | P1: requestPermission rejects on synchronous native throw | Execute | Verified (unit + iOS run; Android runtime B-001) |
| API-11 | P1: setSubscription | Execute | Verified |
| API-12 | P1: setLocationSharingEnabled, no permission request | Execute | Verified |
| API-13 | P1: getDeviceId sync, null normalization | Execute | Verified |
| API-14 | P1: trackEvent | Execute | Verified |
| API-15 | P2: typed exports with JSDoc | Execute | Verified |
| API-16 | P2: README section | Execute | Verified |
| API-17 | Edge: pre-initialize calls forwarded, native decides | Execute | Verified |
| API-18 | Edge: destructured User methods work | Execute | Verified |

**Coverage:** 18 total, 18 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] Parity table fully implemented; each row has a facade test and an adapter test on both platforms.
- [ ] Demo app exercises every method on the iOS simulator; Android device run when B-001 is resolved.
- [ ] No Swift or Kotlin added; `typings/` unchanged except if a native signature was missing.
