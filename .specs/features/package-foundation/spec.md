# Package Foundation Specification

## Problem Statement

`zeep-notti-nativescript` is an empty directory. Before any API work, the plugin needs a package that a
NativeScript 9 app can install and build on both platforms with the native Notti SDKs linked. Four
integration points have never been proven in a NativeScript build, and each one can force a different
architecture: a Swift shim importing `@_spi(Wrapper)` from `NottiSDK`, the `-package-name NottiSDK`
compiler flag coming from the pod's `pod_target_xcconfig`, `notti-android` 0.2.0 (Kotlin 2.0 API,
compileSdk 36, built with AGP 9) inside the NativeScript Android runtime's Gradle setup, and the
`google-services` plugin applied to a NativeScript app. This feature builds the skeleton and proves
those four points first, so `public-api` starts on known ground.

## Goals

- [ ] `pnpm add nativescript-notti` (local path or tarball) in the `demo/` app builds and launches on an
      iOS simulator and an Android emulator, with `NottiSDK` and `notti-android` linked.
- [ ] Each of the four integration risks has a recorded result (works / works with a documented
      workaround / does not work plus the alternative), as an AD in `STATE.md`.
- [ ] CI runs lint, typecheck, unit tests and both demo builds on every PR.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Public API beyond a smoke call | `public-api` feature |
| Listeners, initial click, In-App click | `events-and-in-app` feature |
| NSE target, entitlements, FCM coexistence docs | `push-integration` feature |
| npm publishing, release workflow, README beyond a stub | `example-and-release` feature |
| Angular/Vue/Svelte demo apps | AD-003; core flavor demo only |
| Creating the GitHub repo or pushing | Julio's call (STATE todo) |

---

## User Stories

### P1: Installable plugin skeleton ⭐ MVP

**User Story**: As the maintainer, I want a single-package NativeScript plugin with its native
dependency manifests, so that every later feature adds code to a layout that already builds.

**Why P1**: Nothing else can start without it.

**Acceptance Criteria**:

1. WHEN the repo is cloned and `pnpm install` runs THEN it SHALL succeed with no global tooling other
   than Node (version pinned in `.nvmrc`), pnpm and the NativeScript CLI.
2. WHEN the package is inspected THEN it SHALL be named `nativescript-notti` (AD-002), declare
   `@nativescript/core` as a peer dependency with the minimum version fixed in Design, and ship `src/`
   compiled output plus `platforms/` in the published files list.
3. WHEN an app installs the plugin THEN `platforms/ios/Podfile` SHALL declare `NottiSDK` with a version
   constraint and `platforms/android/include.gradle` SHALL declare `br.com.zeeplabs:notti-android`
   with a version, both matching one source of truth checked in CI.
4. WHEN `pnpm lint` and `pnpm typecheck` run THEN they SHALL pass with TypeScript `strict` on.
5. WHEN a commit is created THEN lefthook SHALL run lint, typecheck and commitlint (Conventional
   Commits), as in `react-native-notti`.

**Independent Test**: fresh clone, `pnpm install && pnpm lint && pnpm typecheck` passes; `npm pack`
contents list `platforms/ios/Podfile`, `platforms/android/include.gradle` and the compiled entry point.

---

### P1: iOS wrapper entry point reachable from JS ⭐ MVP

**User Story**: As the maintainer, I want a Swift shim in the plugin that imports `NottiSDK` with
`@_spi(Wrapper)` and exposes an `@objc` class, so that TypeScript can call the wrapper initializer.

**Why P1**: `Notti.initialize(appId:clientKey:options:sdkName:sdkVersion:)` is Swift-only and SPI; the
NativeScript runtime only sees Obj-C metadata. Without a shim, `sdk_name`/`sdk_version` cannot be
reported (AD-001).

**Acceptance Criteria**:

1. WHEN the demo app builds for the iOS simulator THEN the Swift shim in `platforms/ios` SHALL compile
   with `@_spi(Wrapper) import NottiSDK` and link against the `NottiSDK` pod.
2. WHEN the demo app runs THEN TS code SHALL call one `@objc` shim method that reaches
   `Notti.initialize(..., sdkName:sdkVersion:)` and SHALL get a typed result (proved by a log line or a
   returned value, not by backend traffic).
3. WHEN the demo builds with the NativeScript default `use_frameworks!` (dynamic) AND with
   `use_frameworks! :linkage => :static` THEN both SHALL compile with the `-package-name NottiSDK` flag
   applied to the `NottiSDK` target. (NativeScript always emits `use_frameworks!`; see design.)
4. WHEN Swift sources in a plugin are not supported by the NativeScript 9 build THEN the spike SHALL
   record the fallback (for example a prebuilt xcframework or a separate pod for the shim) as an AD and
   stop for Julio's decision before `public-api`.

**Independent Test**: demo app on a simulator prints the shim's return value after a button tap;
CI builds both linkage modes.

---

### P1: Android native SDK linked in a NativeScript app ⭐ MVP

**User Story**: As the maintainer, I want `notti-android` 0.2.0 resolved and callable from TS, so that
the Android adapter can be written against the real artifact.

**Why P1**: The artifact needs Kotlin 2.0+ on the host and compileSdk 36; a NativeScript 9 app may ship
older Gradle/Kotlin defaults.

**Acceptance Criteria**:

1. WHEN the demo app builds for Android THEN Gradle SHALL resolve `br.com.zeeplabs:notti-android` from
   Maven Central with no local repository.
2. WHEN the demo app runs THEN TS SHALL call `com.zeeplabs.notti.Notti.initializeForWrapper(...)`
   through the NativeScript Java/Kotlin metadata and SHALL not crash (opt-in annotation does not apply
   to non-Kotlin callers).
3. WHEN the host defaults are too old (Kotlin, AGP, compileSdk) THEN the plugin SHALL set the minimum it
   needs from `include.gradle` or document the exact `App_Resources/Android/app.gradle` /
   `before-plugins.gradle` lines, recorded as an AD.
4. WHEN the app has `google-services.json` in `App_Resources/Android` THEN the documented setup SHALL
   apply the `com.google.gms.google-services` plugin to the app module only, never from the plugin
   (native SDK README rule).

**Independent Test**: demo app on an emulator logs the device id listener firing, or the initialize
call returning, without a crash; `./gradlew :app:dependencies` shows `notti-android`.

---

### P1: Native seam for testable TS ⭐ MVP

**User Story**: As the maintainer, I want the TS layer to talk to the native SDKs through a typed seam
with one iOS and one Android implementation, so that mapping logic is unit-tested without a device.

**Why P1**: Same pattern as RN (`NottiNativeSDK` / `NottiNativeApi`); the testing strategy of every later
feature depends on it.

**Acceptance Criteria**:

1. WHEN `src/` is inspected THEN it SHALL contain a seam interface, an iOS adapter and an Android adapter
   selected by platform files (`*.ios.ts` / `*.android.ts`) or an equivalent decided in Design.
2. WHEN `pnpm test` runs THEN it SHALL execute unit tests against a fake seam in Node, with no simulator.
3. WHEN a test imports platform adapters THEN native globals SHALL be stubbed so the suite runs in CI.

**Independent Test**: `pnpm test` runs one passing test that drives the facade through a fake seam.

---

### P2: CI on every PR

**User Story**: As the maintainer, I want CI that proves lint, types, unit tests and both demo builds,
so that a broken native integration is caught before merge.

**Why P2**: Local proof is enough to start `public-api`; CI must exist before the first release.

**Acceptance Criteria**:

1. WHEN a PR is opened THEN GitHub Actions SHALL run lint, typecheck, unit tests, a demo iOS simulator
   build (macOS runner) and a demo Android debug build.
2. WHEN the Podfile and `include.gradle` native versions disagree with the source of truth THEN CI SHALL
   fail (version drift check, as in the native SDK repos).
3. WHEN CI runs THEN it SHALL use no secrets for the build jobs (no real `appId`/`clientKey`, no
   `google-services.json` with real credentials committed; a placeholder file only if the build needs one).

**Independent Test**: a PR with a deliberate version drift fails the drift job.

---

## Edge Cases

- WHEN the host app already pins an older `firebase-messaging` THEN Gradle resolution SHALL be observed and
  the result recorded (the native SDK exposes it as `api`, 25.1.2).
- WHEN the host's iOS deployment target is below 15.0 THEN `pod install` SHALL fail with the pod's own
  message; the README stub SHALL state iOS 15.0+.
- WHEN the demo has no `google-services.json` THEN the Android build SHALL still succeed (FCM disabled at
  runtime) or the failure SHALL be documented; never commit a real file.
- WHEN `NottiSDK` releases 0.3.0 THEN the Podfile constraint SHALL not pick it up automatically if the
  `@_spi(Wrapper)` surface is outside semver (constraint chosen in Design).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| PKG-01 | P1: Skeleton - install with Node/pnpm/ns only | Execute | Verified |
| PKG-02 | P1: Skeleton - package name, peer dep, files list | Execute | Verified |
| PKG-03 | P1: Skeleton - Podfile + include.gradle, one version source | Execute | Verified |
| PKG-04 | P1: Skeleton - lint/typecheck strict | Execute | Verified |
| PKG-05 | P1: Skeleton - lefthook + commitlint | Execute | Verified |
| PKG-06 | P1: iOS shim - compiles with `@_spi(Wrapper)` | Execute | Verified |
| PKG-07 | P1: iOS shim - TS reaches wrapper initialize | Execute | Verified |
| PKG-08 | P1: iOS shim - both linkage modes with `-package-name` | Execute | Verified |
| PKG-09 | P1: iOS shim - fallback recorded if unsupported | Execute | Verified (not needed) |
| PKG-10 | P1: Android - resolves from Maven Central | Execute | Verified |
| PKG-11 | P1: Android - TS calls `initializeForWrapper` | Execute | Implementing (build only, B-001) |
| PKG-12 | P1: Android - Kotlin/AGP/compileSdk minimums handled | Execute | Verified |
| PKG-13 | P1: Android - google-services on the app module only | Execute | Implementing (S4 blocked, B-001) |
| PKG-14 | P1: Seam - interface + platform adapters | Execute | Verified |
| PKG-15 | P1: Seam - Node unit tests with a fake | Execute | Verified |
| PKG-16 | P1: Seam - native globals stubbed | Execute | Verified |
| PKG-17 | P2: CI - lint/types/tests/demo builds | Execute | Implementing (no repo/run yet) |
| PKG-18 | P2: CI - native version drift check | Execute | Verified |
| PKG-19 | P2: CI - no secrets, no real Firebase config | Execute | Verified |

**Coverage:** 19 total, 19 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] Demo app launches on an iOS simulator and an Android emulator and reaches both wrapper
      initializers from TS.
- [ ] Four spike results recorded as ADs (Swift shim, `-package-name`, Android toolchain, google-services).
- [ ] `pnpm lint && pnpm typecheck && pnpm test` green locally and in CI.
