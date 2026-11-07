# State

**Last Updated:** 2026-11-07
**Current Work:** `events-and-in-app` spec approved; design + tasks (T1-T6) Draft, awaiting approval. `public-api` done; `package-foundation` 15/17 (B-001)

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

### AD-005: Demo consumes the plugin through `link:..` (2026-11-07)

**Decision:** `demo/package.json` depends on `"nativescript-notti": "link:.."`; the demo also pins `@nativescript/ios` 9.1.0 and `@nativescript/android` 9.1.1 as devDependencies.
**Reason:** the symlink (`demo/node_modules/nativescript-notti -> ../..`) let the CLI pick up `platforms/ios` (Podfile merged, Swift shim compiled) with no reinstall. Without the pinned runtimes the CLI runs `npm install @nativescript/ios` inside the pnpm workspace and fails (`Command npm failed with exit code 1`).
**Trade-off:** `file:` and tarball forms were not needed, so not tried.
**Impact:** T14 closed S5: with `main: "dist/index"` the webpack build resolves `dist/index.ios.js` on iOS (simulator run reached `NottiSDK` through `Notti.initialize`) and `dist/index.android.js` on Android (the APK bundle contains the `initializeForWrapper` adapter). The plugin must be built (`pnpm build`, also run by `prepare`) before a demo build.

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

### AD-009: Calls before `initialize` are forwarded; the native SDK decides (2026-11-07)

**Decision:** no TS queue; every method forwards as is (Julio: "igual o RN").
**Reason:** parity with `react-native-notti`; no business logic in TS. Native rule (iOS and Android): email, phone and `logout` kept; `login`, tags, `setSubscription` dropped with one warning; Android `requestPermission` answers `false` with no dialog; `trackEvent` ignored.
**Trade-off:** apps must call `initialize` first (documented).
**Impact:** public-api API-17; README.

### AD-010: Non-string tag entries are filtered in the facade (2026-11-07)

**Decision:** `User.addTags`/`removeTags` drop entries whose key or value is not a string, with one `console.warn` naming the key (never the value). Julio left it to the agent's judgment.
**Reason:** on Android a non-string would reach Kotlin's `Map<String, String>`/`List<String>` as another JVM type (risk of `ClassCastException` inside the SDK); iOS would send a non-string to the backend.
**Trade-off:** small divergence from RN, which forwards as is.
**Impact:** public-api API-06; facade logic, unit-tested.

### AD-011: `requestPermission` resolves the native boolean and never rejects on denial (2026-11-07)

**Decision:** `Promise<boolean>`, resolves `false` on denial or before `initialize`; rejects only when the native call throws synchronously (broken install).
**Reason:** RN contract; an install error must surface.
**Impact:** public-api API-08..10.

### AD-012: Native event listeners are attached on demand, one per JS listener (2026-11-07)

**Decision:** each `addEventListener`/`addClickListener` attaches its own native listener and `remove()` detaches it; nothing is attached at import or `initialize`; `getInitialNotificationClick()` calls native `takeInitialClick()` directly. No TS click slot or buffer (Julio: "Sob demanda").
**Reason:** both native SDKs keep the last tap for `takeInitialClick()` only while no clicked listener is attached and never replay clicks; mirroring that gives exactly-once delivery with zero plugin state.
**Trade-off:** a clicked listener added before the launch tap arrives (e.g. in `app.ts`) gets it live and `getInitialNotificationClick()` returns null; apps handle both paths (README), as the native docs say.
**Impact:** events-and-in-app design; README startup example.

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

- [x] `git init` done locally (2026-11-07); [ ] create `zeeplabs/zeep-notti-nativescript` on GitHub and push (Julio's call), then prove CI
- [ ] Run actionlint on `.github/` (download was denied in-session; needs Julio's OK or a local install)
- [ ] Confirm the CocoaPods trunk read-only date before relying on trunk for future `NottiSDK` releases
- [ ] Note: the local `zeep-notti-react-native` checkout is on `spike/ios-native-sdk` (0.8.0, dirty); read the RN reference from `origin/main`

---

## Preferences

**Model Guidance Shown:** never
