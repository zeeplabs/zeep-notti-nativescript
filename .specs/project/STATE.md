# State

**Last Updated:** 2026-11-07
**Current Work:** `package-foundation` design approved (2026-11-07); tasks.md Draft (T1-T17, spikes first), awaiting approval; next: Execute T1

---

## Recent Decisions (Last 60 days)

### AD-001: Backend accepts `nativescript` before the first release (2026-11-07)

**Decision:** M0 adds `"nativescript"` to the backend `sdk_name` allowlist (and the In-App `push_permission` minimum map when safe) before `nativescript-notti` 0.1.0 ships. The plugin always reports `sdkName: "nativescript"`.
**Reason:** `zeep-notti` (`develop` `5e84bf91`) only accepts `react-native`, `ios`, `android`; any other value gets a 422 on the device PATCH. Reporting `ios`/`android` would mix NativeScript devices into native metrics.
**Trade-off:** the release depends on a backend deploy.
**Impact:** M0 in ROADMAP; `public-api` sends `nativescript` unconditionally.

### AD-002: Package name `nativescript-notti` (2026-11-07)

**Decision:** npm package `nativescript-notti`, unscoped.
**Reason:** mirrors `react-native-notti`; no dependency on an npm org.
**Trade-off:** no scope grouping with other ZeepLabs packages.
**Impact:** package.json, README, dashboard wizard install snippet.

### AD-003: Single-package repo with a demo app (2026-11-07)

**Decision:** one package at the root (`src/`, `platforms/ios`, `platforms/android`) plus a `demo/` NativeScript Core app, pnpm. No Nx plugin workspace.
**Reason:** one plugin only; same shape as the RN repo; less tooling to maintain.
**Trade-off:** no `nx` focus/publish tooling from `@nativescript/plugin-tools`; no Angular demo out of the box.
**Impact:** `package-foundation` layout and CI.

### AD-004: The host opens In-App URLs and deep links (2026-11-07)

**Decision:** initialize the native SDKs with `opensInAppURLs` / `opensInAppUrls = false`; the plugin only emits the In-App click to JS.
**Reason:** parity with `react-native-notti` (its AD-004); the app owns routing.
**Trade-off:** apps must handle the click to open a link.
**Impact:** `public-api` initialize options; README In-App section.

### AD-005: Demo consumes the plugin through `link:..` (2026-11-07, partial)

**Decision:** `demo/package.json` depends on `"nativescript-notti": "link:.."`; the demo also pins `@nativescript/ios` 9.1.0 and `@nativescript/android` 9.1.1 as devDependencies.
**Reason:** the symlink (`demo/node_modules/nativescript-notti -> ../..`) let the CLI pick up `platforms/ios` (Podfile merged, Swift shim compiled) with no reinstall. Without the pinned runtimes the CLI runs `npm install @nativescript/ios` inside the pnpm workspace and fails (`Command npm failed with exit code 1`).
**Trade-off:** `file:` and tarball forms were not needed, so not tried.
**Impact:** Still open for T14: the bundler resolving `main: "dist/index"` to `index.ios.js`/`index.android.js` through the link.

### AD-006: Swift shim works under the template's `SWIFT_VERSION = 4.2` (2026-11-07)

**Decision:** no Swift version override is required from apps.
**Reason:** spike S1: demo built with `SWIFT_VERSION = 4.2` (checked with `-showBuildSettings`); `@_spi(Wrapper) import NottiSDK` compiled; the generated `demo-Swift.h` exposes `+[NottiNativeScript initializeWithAppId:clientKey:baseUrl:sdkVersion:]`; on an iOS 27.1 simulator JS reached `NottiSDK` (SDK log `Notti.initialize ignored: invalid appId, clientKey or baseUrl` with the empty dev keys, then `[notti-demo] initialize returned`).
**Trade-off:** none found. Xcode 27.2.
**Impact:** README needs no Swift version step. The Obj-C facade of `NottiSDK` (`NottiNotifications`, `NottiUser`, `NottiInAppMessages`, `NottiSubscription`, `NottiSDKFacade`, `NottiLogLevel`) is also visible to TS (`typings/ios/NottiSDK.d.ts`); `public-api` should call it directly and add Swift only where the Obj-C facade lacks a call.

### AD-007: Both CocoaPods linkage modes supported (2026-11-07)

**Decision:** support NativeScript's default `use_frameworks!` (dynamic) and `use_frameworks! :linkage => :static`.
**Reason:** spike S2: both built and ran on the simulator with the shim reaching `NottiSDK`; with static linkage `NottiSDK` is an `ar` archive. `-package-name NottiSDK` from the pod's `pod_target_xcconfig` needed no plugin `post_install`.
**Trade-off:** none.
**Impact:** CI `build-ios` covers both; the static variant writes `demo/App_Resources/iOS/Podfile` at job time.

### AD-008: `notti-android` 0.2.0 builds with NativeScript 9.1 defaults (2026-11-07, runtime pending)

**Decision:** the plugin sets no Kotlin, AGP or compileSdk override; apps need minSdk 24 (template default).
**Reason:** spike S3 build part: `ns build android` green with JDK 17 and the template defaults (compileSdk 36, minSdk 24; runtime AGP 8.12.1, Kotlin 2.4.10). `:app:dependencies` resolves `br.com.zeeplabs:notti-android:0.2.0` from Maven Central with `firebase-messaging:25.1.2`; Kotlin stdlib unified at 2.4.10. `ns typings android --aar` confirms the JVM names: `Notti.initializeForWrapper(...)` and `Notti.User.*` are static (`@JvmStatic` on nested objects), `NottiOptions(baseUrl, opensInAppUrls)` and `NottiOptions(baseUrl)` constructors.
**Trade-off:** runtime proof (call from TS on an emulator) not done: this Mac has no AVD, system image or `cmdline-tools` (B-001).
**Impact:** `public-api` can call `com.zeeplabs.notti.Notti.*` directly from TS, no Kotlin source in the plugin.

---

## Active Blockers

### B-001: No Android emulator or device on the dev Mac (2026-11-07)

**Discovered:** package-foundation T6 (spike S3).
**Impact:** S3 runtime proof, S4 no-JSON runtime behavior and T14 Android run cannot be checked; builds and typings are fine.
**Workaround:** keep going with build-level proof; run the Android checks when a device exists.
**Resolution:** Julio installs `cmdline-tools` + a system image and creates an AVD, or connects a physical device.

M0 (backend `sdk_name`) gates the 0.1.0 release, not development.

---

## Lessons Learned

### L-001: NativeScript CLI needs `xcodeproj` on the `ruby` in PATH (2026-11-07)

**Context:** first `ns build ios` on this Mac.
**Problem:** the CLI runs `ruby -e "require 'xcodeproj'"`; `/usr/bin/ruby` (2.6) has no gem, and Homebrew CocoaPods keeps its gems in its own `GEM_HOME`. Setting only `GEM_PATH` to that dir then broke `pod` (`Could not find 'base64'`).
**Solution:** `PATH=/opt/homebrew/opt/ruby/bin:$PATH` and `GEM_PATH=/opt/homebrew/Cellar/cocoapods/<ver>/libexec:<ruby default gem paths>` (see TESTING.md).
**Prevents:** losing time on the same env failure; CI runners use their own Ruby with the gems installed.

### L-002: `ns typings android` output for `notti-android` does not compile (2026-11-07)

**Context:** package-foundation T12, first typecheck against the generated `android.d.ts`.
**Problem:** the NativeScript 9.1 generator emits nameless `export module  {` blocks for 36 Kotlin sealed/internal types of the AAR (TS1437).
**Solution:** `typings/android/notti-android.d.ts` is written from the SDK's ABI dump (`notti/api/notti.api`, public classes only) in the generator's shape; names were cross-checked against the generated file.
**Prevents:** committing a broken generated file; on every native bump, diff `notti.api` and update the typings by hand.

---

## Deferred Ideas

- [ ] Flavor helpers (Angular service, Vue composable) — Captured during: project init
- [ ] NSE target creation through a NativeScript hook — Captured during: project init

---

## Todos

- [ ] `git init` the repo and create `zeeplabs/zeep-notti-nativescript` on GitHub (Julio's call)
- [ ] Confirm the CocoaPods trunk read-only date before relying on trunk for future `NottiSDK` releases
- [ ] Note: the local `zeep-notti-react-native` checkout is on `spike/ios-native-sdk` (0.8.0, dirty); read the RN reference from `origin/main`

---

## Preferences

**Model Guidance Shown:** never
