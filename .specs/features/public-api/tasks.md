# Public API Tasks

**Design**: `.specs/features/public-api/design.md`
**Testing**: `.specs/codebase/TESTING.md`
**Status**: Done (2026-11-07), Android runtime pending B-001

## Progress

| Task | Status | Commit | Evidence |
| --- | --- | --- | --- |
| T1 | Done | `d70c4d3` | 22 facade tests (forwarding, AD-010 filter + warn without values, empty batches, destructuring) |
| T2 | Done | `07c5c1a` | 14 iOS adapter tests |
| T3 | Done | `85e1557` | 13 Android adapter tests; quick gate green (56 tests) |
| T4 | Done | `1b27cec` | `dist/index.d.ts` exports `NottiApi`, `NottiUserApi`; build `lib` gained `DOM` for `console` (NativeScript template does the same) |
| T5 | Done (iOS run, Android build) | `b707307` | iOS 27.1 simulator: all 15 methods ran with no JS error; `getDeviceId -> null`, `requestPermission -> false` (SDK not initialized with empty keys). Android APK bundle contains the adapter; runtime and the `NottiPermissionCallback` interface proxy unproven (B-001) |
| T6 | Done | `3e50bbb` | README API table, pre-initialize rule, tag filter note |

---

## Execution Plan

```
T1 ──┬→ T2 [P] ─┬→ T4 → T5 → T6
     └→ T3 [P] ─┘
```

---

### T1: Seam and facade for every method

**What**: extend `NottiNative` (design) and `createNotti` with all methods, `User` group, AD-010 helpers.
**Where**: `src/native/types.ts`, `src/notti.ts`, `test/notti.test.ts`
**Depends on**: None (package-foundation T10 done)
**Requirement**: API-01..API-07, API-11..API-14, API-17, API-18

**Done when**:

- [ ] RED first: facade tests for each method, filter + warn (asserts the warn text has no value), empty batches, destructuring
- [ ] `pnpm lint && pnpm test` green. `pnpm typecheck` is expected red until T3 (the adapters do not implement the
      wider seam yet); T1, T2, T3 run back to back and the full quick gate must be green at T3. No stub methods.

**Tests**: unit · **Gate**: quick
**Commit**: `feat: add the public API facade`

---

### T2: iOS adapter [P]

**What**: implement every seam method in `native.ios.ts` per the design table.
**Where**: `src/native/native.ios.ts`, `test/native.ios.test.ts`
**Depends on**: T1
**Requirement**: API-01..API-05, API-08..API-14

**Done when**:

- [ ] Tests: each Obj-C call; `NSMutableDictionary`/`NSArray` built; resolve true/false; reject on throw; `deviceId` `undefined`/`null` → `null`
- [ ] Quick gate green

**Tests**: unit · **Gate**: quick
**Commit**: `feat(ios): map the public API to the NottiSDK Obj-C facade`

---

### T3: Android adapter [P]

**What**: implement every seam method in `native.android.ts` per the design table.
**Where**: `src/native/native.android.ts`, `test/native.android.test.ts`
**Depends on**: T1
**Requirement**: API-01..API-05, API-08..API-14

**Done when**:

- [ ] Tests: each Kotlin call; `HashMap`/`ArrayList` built; callback resolve; reject on throw; `null` → `null`
- [ ] Quick gate green

**Tests**: unit · **Gate**: quick
**Commit**: `feat(android): map the public API to notti-android`

---

### T4: Public types and JSDoc

**What**: `src/index.d.ts` exports `NottiApi`, `NottiUserApi`, `InitializeOptions`; JSDoc on members (API-17, location, trackEvent notes).
**Where**: `src/notti.ts` (JSDoc), `src/index.d.ts`
**Depends on**: T2, T3
**Requirement**: API-15

**Done when**:

- [ ] Build gate green; `dist/index.d.ts` declares every method

**Tests**: none · **Gate**: build
**Commit**: `docs: document the public API types`

---

### T5: Demo exercises every method

**What**: demo home screen buttons for each method (login/logout, tags, email/phone, subscription, location,
permission, deviceId, trackEvent) logging `[notti-demo]` lines; iOS simulator run checking each call logs without a JS error.
**Where**: `demo/app/home/`
**Depends on**: T4
**Requirement**: success criteria (demo)

**Done when**:

- [ ] iOS build + simulator launch with no JS error; an automatic "smoke" sequence on launch (as in the spikes) logs each method's return
- [ ] Android build green (runtime pending B-001)

**Tests**: build · **Gate**: ios + android
**Commit**: `chore(demo): exercise the public API`

---

### T6: README

**What**: README "Usage" section with every method, pre-initialize rule (AD-009), tag filter note (AD-010).
**Where**: `README.md`
**Depends on**: T5
**Requirement**: API-16

**Done when**:

- [ ] Every parity-table method documented

**Tests**: none · **Gate**: build
**Commit**: `docs(readme): document the public API`

---

## Validation

| Task | Depends (body) | Diagram | Status |
| --- | --- | --- | --- |
| T1 | — | start | ✅ |
| T2 | T1 | T1 → T2 | ✅ |
| T3 | T1 | T1 → T3 | ✅ |
| T4 | T2, T3 | T2/T3 → T4 | ✅ |
| T5 | T4 | T4 → T5 | ✅ |
| T6 | T5 | T5 → T6 | ✅ |

Test co-location: T1-T3 unit (facade/adapters require unit) ✅; T5 build (native paths) ✅.
Coverage: API-01..18 all mapped (API-15 T4, API-16 T6, API-17/18 T1). Tools: no MCP; no extra skill.
