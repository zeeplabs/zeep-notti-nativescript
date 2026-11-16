# Package Foundation Tasks

**Design**: `.specs/features/package-foundation/design.md`
**Testing**: `.specs/codebase/TESTING.md`
**Status**: Merged into `main` via PR #1 (2026-11-16); 15/17 done; T7 and the Android runtime part of T6/T14 blocked by B-001

## Progress

| Task | Status | Commit | Evidence |
| --- | --- | --- | --- |
| T1 | Done | `2aab57e` | `pnpm install` ok |
| T2 | Done | `3c200f4` | pack lists Podfile + include.gradle |
| T3 | Done | `3ec19d4` | proved in T5 |
| T4 | Done | `ad3f889` | AD-005 (`link:..`, pinned runtimes) |
| T5 | Done | `3e1858c` | AD-006, AD-007: simulator log reached `NottiSDK`, dynamic + static |
| T6 | Partial | `9dc6e69`, `a87a37b` | AD-008 build + deps + typings; emulator run blocked (B-001); typings from ABI (L-002) |
| T7 | Blocked | - | needs a device (B-001) and a test Firebase project |
| T8 | Done | `df4dc13` | lint + typecheck |
| T9 | Done | `e8554ac` | 1 test |
| T10 | Done | `873973e` | 3 tests |
| T11 | Done | `ae43ab8` | 2 tests |
| T12 | Done | `a87a37b` | 2 tests |
| T13 | Done | `8cf43a4` | build + pack contents |
| T14 | Partial | `bba94aa` | iOS simulator through `Notti.initialize`; Android APK bundle has the adapter, runtime blocked (B-001) |
| T15 | Done | `fa41d5f` | 6 tests incl. drift fixtures |
| T16 | Done (CI proven, actionlint not run) | `a0a7159`, `8c3a47c` | First real run failed on `build-android` (NativeScript doctor rejected the runner: emulator SDK component missing, exit 127); fixed in PR #4 with `sdkmanager emulator platform-tools`; PR #4 run `43979354198` 6/6 green. actionlint still not run |
| T17 | Done | `f323663` | commitlint rejected a non-conventional message |

Gate at `f323663`: lint, typecheck, 14 tests, build, native-versions green.

Risk first: Phase 1 proves the native integration with the smallest possible code (spikes S1-S5) before
any tooling or TS layering. If T5 (S1) fails both ways, STOP for Julio's decision (design, S1 row).

---

## Execution Plan

### Phase 1: Skeleton and spikes (Sequential)

```
T1 → T2 → T3 → T4 → T5 → T6 → T7
```

### Phase 2: TS layers and tooling

```
T7 → T8 → T9 → T10 ──┬→ T11 [P] ─┬→ T13 → T14
                     └→ T12 [P] ─┘
T9 → T15
```

### Phase 3: CI and docs (Sequential)

```
T14, T15 → T16 → T17
```

---

## Task Breakdown

### T1: Repo skeleton

**What**: `git init` (local only, no remote) and root files: `package.json` (name `nativescript-notti`,
version `0.0.0`, `packageManager: pnpm@10.15.0`, `files`, `main`/`types`, peer `@nativescript/core >=9.0.0 <10`,
private demo excluded), `pnpm-workspace.yaml` (root + `demo`), `.nvmrc`, `.gitignore` (dist, node_modules,
demo platforms/hooks, `demo/app/config.local.ts`, `google-services.json`), `.editorconfig`, `LICENSE` (MIT, as siblings),
`tsconfig.json` (strict, `outDir dist`).
**Where**: repo root
**Depends on**: None
**Reuses**: RN `package.json`, `.editorconfig`, `.gitignore`, `.nvmrc`
**Requirement**: PKG-01, PKG-02

**Done when**:

- [ ] `pnpm install` succeeds on a clean clone
- [ ] `pnpm exec tsc --noEmit` runs (no sources yet is fine)

**Tests**: none
**Gate**: `pnpm install`
**Commit**: `chore: initialize the nativescript-notti package`

---

### T2: Native dependency manifests

**What**: `platforms/ios/Podfile` (`platform :ios, '15.0'`, `pod 'NottiSDK', '~> 0.2.0'`),
`platforms/android/include.gradle` (`implementation 'br.com.zeeplabs:notti-android:0.2.0'`),
`package.json` `"notti": { "ios": "0.2.0", "android": "0.2.0" }`.
**Where**: `platforms/`, `package.json`
**Depends on**: T1
**Reuses**: firebase-messaging plugin layout
**Requirement**: PKG-03

**Done when**:

- [ ] Both files exist with the versions above; `npm pack --dry-run` lists them

**Tests**: none (drift check comes in T15)
**Gate**: `npm pack --dry-run`
**Commit**: `build: declare the NottiSDK pod and notti-android dependency`

---

### T3: Swift shim

**What**: `NottiNativeScript.swift` with `@_spi(Wrapper) import NottiSDK` and the `@objc` static
`initialize(appId:clientKey:baseUrl:sdkVersion:)` from the design (sdkName `"nativescript"`, `opensInAppURLs: false`).
**Where**: `platforms/ios/src/NottiNativeScript.swift`
**Depends on**: T2
**Reuses**: RN `ios/DefaultNottiNativeSDK.swift` (SPI call shape)
**Requirement**: PKG-06

**Done when**:

- [ ] File matches the design; only Obj-C representable types in the `@objc` signature

**Tests**: build (proved in T5)
**Gate**: none alone (T5)
**Commit**: `feat(ios): add the Swift shim for the wrapper initializer`

---

### T4: Demo app and local plugin consumption (S5)

**What**: `demo/` from `@nativescript/template-blank-ts` 9.1.x with `nativescript` CLI `~9.1.0` as devDependency,
consuming the plugin locally; `config.example.ts` committed, `config.local.ts` gitignored; one button that calls
the native layer directly (`NottiNativeScript.initialize…` on iOS, `com.zeeplabs.notti.Notti.initializeForWrapper` on Android)
and logs the result. Try `link:..` first, then `file:..`, then `npm pack` tarball; keep the first that picks up a change
to plugin native files after reinstall/rebuild.
**Where**: `demo/`
**Depends on**: T3
**Reuses**: template-blank-ts
**Requirement**: PKG-01 (demo), spike S5

**Done when**:

- [ ] `pnpm install` at root installs the demo with the plugin
- [ ] Chosen consumption form recorded as AD-005 in STATE.md, with the rejected forms and why

**Tests**: none
**Gate**: `pnpm install`
**Commit**: `chore(demo): add the NativeScript demo app`

---

### T5: iOS spike (S1 + S2) and iOS typings

**What**: build and run the demo on an iOS simulator; tap Initialize; confirm the shim is reached. Build
again with `demo/App_Resources/iOS/Podfile` containing `use_frameworks! :linkage => :static`. If the shim fails
under `SWIFT_VERSION 4.2`, retry with `SWIFT_VERSION = 5.0` in `demo/App_Resources/iOS/build.xcconfig`. Generate
`ns typings ios` and commit only the shim and `NottiSDK` declarations under `typings/ios/`.
**Where**: `demo/App_Resources/iOS/`, `typings/ios/`, STATE.md
**Depends on**: T4
**Requirement**: PKG-06, PKG-07, PKG-08, PKG-09

**Done when**:

- [ ] Simulator log shows the shim call returning (dev `appId`, backend traffic not required)
- [ ] Dynamic and static-linkage builds both green, or the failing mode recorded
- [ ] AD-006 (Swift version result) and AD-007 (linkage result) in STATE.md
- [ ] If both Swift modes fail: STOP, report to Julio with the alternatives

**Tests**: build
**Gate**: ios
**Commit**: `chore(ios): prove the shim build and commit iOS typings`

---

### T6: Android spike (S3) and Android typings

**What**: build and run the demo on an emulator with JDK 17; tap Initialize; confirm
`initializeForWrapper` is reached with no crash. Generate `ns typings android --aar` for `notti-android-0.2.0.aar`
and commit the `com.zeeplabs.notti` declarations under `typings/android/`. Confirm JVM names for
`Notti`, `Notti.User`, `NottiOptions` constructor.
**Where**: `typings/android/`, STATE.md
**Depends on**: T5
**Requirement**: PKG-10, PKG-11, PKG-12

**Done when**:

- [ ] Emulator run without crash; `./gradlew :app:dependencies` (or equivalent) lists `notti-android:0.2.0`
- [ ] AD-008 records the Android result (overrides needed, if any; minSdk 24)

**Tests**: build
**Gate**: android
**Commit**: `chore(android): prove the notti-android build and commit Android typings`

---

### T7: google-services spike (S4)

**What**: with a placeholder or personal test Firebase project (never committed), find the working JSON location
and apply-plugin setup for a NativeScript 9 app; also build and launch with no JSON and record the behavior.
**Where**: STATE.md, notes for the README (T17)
**Depends on**: T6
**Requirement**: PKG-13

**Done when**:

- [ ] the next free AD documents the exact setup and the no-JSON behavior
- [ ] No Firebase file tracked by git (`git status` clean of it)

**Tests**: build
**Gate**: android
**Commit**: none unless docs notes change (`docs: ...`)

---

### T8: Lint and format

**What**: ESLint flat config + Prettier, `pnpm lint` script, `typecheck` script.
**Where**: `eslint.config.mjs`, `.prettierrc`, `package.json`
**Depends on**: T7
**Reuses**: RN `eslint.config.mjs` minus RN presets
**Requirement**: PKG-04

**Done when**:

- [ ] `pnpm lint && pnpm typecheck` pass with `strict` on

**Tests**: none
**Gate**: quick (no tests yet: `pnpm test` absent is fine)
**Commit**: `chore: add eslint, prettier and typecheck`

---

### T9: Vitest, SDK_VERSION and its sync script

**What**: Vitest config and `test` script; `src/version.ts` literal; `scripts/sync-sdk-version.js`;
`test/version.test.ts` (literal equals `package.json.version`).
**Where**: `vitest.config.ts`, `src/version.ts`, `scripts/sync-sdk-version.js`, `test/version.test.ts`
**Depends on**: T8
**Reuses**: RN `src/version.ts`, `scripts/sync-sdk-version.js`
**Requirement**: PKG-15

**Done when**:

- [ ] Gate passes; 1 test

**Tests**: unit
**Gate**: quick
**Commit**: `chore: add vitest and the SDK_VERSION literal`

---

### T10: Seam and facade

**What**: `NottiNative` interface and `createNotti(native)` with `initialize`; unit tests with a fake seam
(forwards appId/clientKey, `baseUrl` → `null` when absent, passes `SDK_VERSION`).
**Where**: `src/native/types.ts`, `src/notti.ts`, `test/notti.test.ts`
**Depends on**: T9
**Requirement**: PKG-14, PKG-15

**Done when**:

- [ ] Gate passes; ≥3 facade tests

**Tests**: unit
**Gate**: quick
**Commit**: `feat: add the native seam and the initialize facade`

---

### T11: iOS adapter [P]

**What**: `native.ios.ts` calling the shim selector from `typings/ios`; test stubbing `globalThis.NottiNativeScript`.
**Where**: `src/native/native.ios.ts`, `test/native.ios.test.ts`
**Depends on**: T10
**Requirement**: PKG-14, PKG-16

**Done when**:

- [ ] Gate passes; test asserts forwarded args

**Tests**: unit
**Gate**: quick
**Commit**: `feat(ios): add the iOS native adapter`

---

### T12: Android adapter [P]

**What**: `native.android.ts` calling `initializeForWrapper` with app context, `NottiOptions(baseUrl, false)`,
`'nativescript'`, `sdkVersion`; test stubbing `globalThis.com.zeeplabs.notti` and the context provider.
**Where**: `src/native/native.android.ts`, `test/native.android.test.ts`
**Depends on**: T10
**Requirement**: PKG-14, PKG-16

**Done when**:

- [ ] Gate passes; test asserts `'nativescript'` and `opensInAppUrls === false`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(android): add the Android native adapter`

---

### T13: Platform entry points and build

**What**: `src/index.ios.ts`, `src/index.android.ts`, `src/index.d.ts`; `pnpm build` (tsc → `dist/`),
`prepare` hook; `npm pack --dry-run` shows `dist/index.ios.js`, `dist/index.android.js`, `dist/index.d.ts`, `platforms/**`.
**Where**: `src/index.*`, `package.json`, `tsconfig.build.json`
**Depends on**: T11, T12
**Requirement**: PKG-02

**Done when**:

- [ ] Build gate passes; pack contents as above

**Tests**: none beyond existing
**Gate**: build
**Commit**: `feat: expose Notti.initialize through platform entry points`

---

### T14: Demo uses the plugin API

**What**: demo button calls `Notti.initialize` from `nativescript-notti` instead of native globals; both
platform builds and runs re-checked (platform-suffix `main` resolution, rest of S5).
**Where**: `demo/app/`
**Depends on**: T13
**Requirement**: PKG-07, PKG-11

**Done when**:

- [ ] iOS simulator and Android emulator runs reach the native initializer through the plugin

**Tests**: build
**Gate**: ios + android
**Commit**: `chore(demo): call the plugin API`

---

### T15: Native version drift check

**What**: `scripts/check-native-versions.js` (Podfile `~>`, `include.gradle` coordinate, `version.ts`) with a
fixture-based unit test including a deliberate drift case.
**Where**: `scripts/check-native-versions.js`, `test/check-native-versions.test.ts`
**Depends on**: T9
**Requirement**: PKG-18

**Done when**:

- [ ] Gate passes; drift fixture fails the check, aligned fixture passes

**Tests**: unit
**Gate**: build
**Commit**: `chore: check native SDK versions for drift`

---

### T16: CI workflow

**What**: `.github/workflows/ci.yml` with jobs lint, test, native-versions, build-android (Temurin 17),
build-ios (macos; dynamic + static linkage); shared setup action; no secrets.
**Where**: `.github/`
**Depends on**: T14, T15
**Reuses**: RN `.github/actions/setup/action.yml`, `ci.yml`
**Requirement**: PKG-17, PKG-19

**Done when**:

- [ ] `actionlint` (or equivalent) clean; jobs mirror the local gates
- [x] Workflow run proof: GitHub repo exists since 2026-11-16; PR #4 CI run 6/6 green (see the progress table)

**Tests**: none
**Gate**: build
**Commit**: `ci: add lint, test and demo build jobs`

---

### T17: README stub, lefthook and commitlint

**What**: README stub (install, iOS 15+/minSdk 24, JDK 17 for builds, google-services ownership from AD-009,
"API in development"); `lefthook.yml` (pre-commit lint + typecheck; commit-msg commitlint) and commitlint config.
**Where**: `README.md`, `lefthook.yml`, `package.json`
**Depends on**: T16
**Reuses**: RN `lefthook.yml`, commitlint config
**Requirement**: PKG-05, PKG-13

**Done when**:

- [ ] A non-conventional commit message is rejected locally; gate passes

**Tests**: none
**Gate**: build
**Commit**: `chore: add the README stub and git hooks`

---

## Validation

### Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | root config files, one concern (skeleton) | ⚠️ several files, cohesive and trivial |
| T2 | 2 manifest files + 1 field | ⚠️ cohesive (one version pair) |
| T3 | 1 file | ✅ |
| T4 | demo scaffold (generated) | ⚠️ generated template, one concern |
| T5 | 1 spike | ✅ |
| T6 | 1 spike | ✅ |
| T7 | 1 spike | ✅ |
| T8 | lint config | ✅ |
| T9 | version literal + its test + sync script | ⚠️ cohesive |
| T10 | seam + facade + test | ⚠️ cohesive (facade is one function over the seam) |
| T11 | 1 adapter + test | ✅ |
| T12 | 1 adapter + test | ✅ |
| T13 | entry points + build | ⚠️ cohesive |
| T14 | demo call site | ✅ |
| T15 | 1 script + test | ✅ |
| T16 | 1 workflow | ✅ |
| T17 | README stub + hooks | ⚠️ two small concerns, both repo hygiene |

### Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram | Status |
| --- | --- | --- | --- |
| T1 | None | start | ✅ |
| T2 | T1 | T1 → T2 | ✅ |
| T3 | T2 | T2 → T3 | ✅ |
| T4 | T3 | T3 → T4 | ✅ |
| T5 | T4 | T4 → T5 | ✅ |
| T6 | T5 | T5 → T6 | ✅ |
| T7 | T6 | T6 → T7 | ✅ |
| T8 | T7 | T7 → T8 | ✅ |
| T9 | T8 | T8 → T9 | ✅ |
| T10 | T9 | T9 → T10 | ✅ |
| T11 | T10 | T10 → T11 [P] | ✅ |
| T12 | T10 | T10 → T12 [P] | ✅ |
| T13 | T11, T12 | T11/T12 → T13 | ✅ |
| T14 | T13 | T13 → T14 | ✅ |
| T15 | T9 | T9 → T15 | ✅ |
| T16 | T14, T15 | T14, T15 → T16 | ✅ |
| T17 | T16 | T16 → T17 | ✅ |

### Test Co-location Validation

| Task | Layer | Matrix requires | Task Tests | Status |
| --- | --- | --- | --- | --- |
| T3 | Swift shim | build | build (T5) | ✅ |
| T2 | native manifests | build + drift | none here; build T5/T6, drift T15 | ✅ |
| T9 | version literal | unit | unit | ✅ |
| T10 | facade | unit | unit | ✅ |
| T11 | iOS adapter | unit | unit | ✅ |
| T12 | Android adapter | unit | unit | ✅ |
| T15 | repo script | unit | unit | ✅ |
| T5, T6, T7, T14 | native paths | build | build | ✅ |

### Requirement Coverage

PKG-01 T1/T4 · PKG-02 T1/T13 · PKG-03 T2 · PKG-04 T8 · PKG-05 T17 · PKG-06 T3/T5 · PKG-07 T5/T14 ·
PKG-08 T5 · PKG-09 T5 · PKG-10 T6 · PKG-11 T6/T14 · PKG-12 T6 · PKG-13 T7/T17 · PKG-14 T10-T12 ·
PKG-15 T9/T10 · PKG-16 T11/T12 · PKG-17 T16 · PKG-18 T15 · PKG-19 T16. **19/19 mapped.**

### Tools

MCP: none needed (filesystem + shell). Skills: none required; `superpowers:verification-before-completion`
before marking tasks done.
