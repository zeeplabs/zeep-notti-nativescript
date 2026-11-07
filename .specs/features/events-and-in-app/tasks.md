# Events and In-App Tasks

**Design**: `.specs/features/events-and-in-app/design.md`
**Testing**: `.specs/codebase/TESTING.md`
**Status**: Draft

---

## Execution Plan

```
T1 ──┬→ T2 [P] ─┬→ T4 → T5 → T6
     └→ T3 [P] ─┘
```

T1-T3 run back to back: `pnpm typecheck` is red between T1 and T3 (adapters miss the new seam methods); the full
quick gate must be green at T3. Commits stay one per task (lefthook typechecks the working tree).

---

### T1: Seam types and facade events

**What**: payload types + listener methods in `NottiNative`; facade `addEventListener` (overloads, `TypeError`),
`getInitialNotificationClick`, `InAppMessages.addClickListener`, `guard` and `once` helpers.
**Where**: `src/native/types.ts`, `src/notti.ts`, `test/notti.test.ts`
**Depends on**: None (public-api done)
**Requirement**: EVT-01..05, EVT-06, EVT-08, EVT-09, EVT-16, EVT-19, EVT-20

**Done when**:

- [ ] RED first: dispatch per name, TypeError, error isolation (log without payload; second listener still runs),
      idempotent remove (also inside callback), no dedupe, launch click resolve/null/reject, In-App path
- [ ] `pnpm lint && pnpm test` green (typecheck red until T3)

**Tests**: unit · **Gate**: quick (completed at T3)
**Commit**: `feat: add the event listener facade`

---

### T2: iOS adapter events [P]

**What**: listener methods, `takeInitialClick` and `NSDictionary` mapping in `native.ios.ts`.
**Where**: `src/native/native.ios.ts`, `test/native.ios.test.ts`
**Depends on**: T1
**Requirement**: EVT-01, EVT-04, EVT-06..15

**Done when**:

- [ ] Tests per design table (fake `NSDictionary`, NSNull-like values, actions, subscriptions passthrough)
- [ ] Quick gate green after T3

**Tests**: unit · **Gate**: quick
**Commit**: `feat(ios): map NottiSDK events to JS payloads`

---

### T3: Android adapter events [P]

**What**: listener methods, `takeInitialClick`, getter/`java.util.Map` mapping and listener interfaces in `native.android.ts`.
**Where**: `src/native/native.android.ts`, `test/native.android.test.ts`
**Depends on**: T1
**Requirement**: EVT-01, EVT-04, EVT-06..15

**Done when**:

- [ ] Tests per design table (fake notification/map/enum, interfaces wired)
- [ ] Full quick gate green (lint, typecheck, test)

**Tests**: unit · **Gate**: quick
**Commit**: `feat(android): map notti-android events to JS payloads`

---

### T4: Public exports and JSDoc

**What**: export the event types from the platform entry points and `index.d.ts`; JSDoc for exactly-once across the
two click paths (AD-012), iOS/Android received replay difference, AD-004.
**Where**: `src/notti.ts`, `src/native/types.ts`, `src/index.*`
**Depends on**: T2, T3
**Requirement**: EVT-17

**Done when**:

- [ ] Build gate green; `dist/index.d.ts` declares the event API

**Tests**: none · **Gate**: build
**Commit**: `docs: document the event API types`

---

### T5: Demo exercises events

**What**: demo adds all four listeners at startup (logging labels only, never payload contents beyond field names),
logs `getInitialNotificationClick()`, has buttons to remove/re-add listeners; iOS simulator run; Android build.
**Where**: `demo/app/`
**Depends on**: T4
**Requirement**: success criteria (simulator), EVT-02 live check

**Done when**:

- [ ] iOS simulator: listeners attach, `getInitialNotificationClick -> null`, remove/re-add without JS error
- [ ] Android build green (runtime pending B-001)

**Tests**: build · **Gate**: ios + android
**Commit**: `chore(demo): exercise the event API`

---

### T6: README events section

**What**: "Events" section: startup example handling both click paths (AD-012), received replay difference, In-App
click example opening the link with `Utils.openUrl` (AD-004), error isolation note.
**Where**: `README.md`
**Depends on**: T5
**Requirement**: EVT-18

**Done when**:

- [ ] Every event API documented; example compiles against the published types (copy into demo temporarily or typecheck snippet)

**Tests**: none · **Gate**: build
**Commit**: `docs(readme): document events and In-App clicks`

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

Test co-location: T1-T3 unit ✅; T5 build ✅. Coverage: EVT-01..20 all mapped (EVT-17 T4, EVT-18 T6). Tools: none extra.
