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

---

## Active Blockers

None yet. M0 (backend `sdk_name`) gates the 0.1.0 release, not development.

---

## Lessons Learned

None yet.

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
