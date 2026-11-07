# Events and In-App Specification

**Status**: Approved (2026-11-07; AD-012; EVT-16 and EVT-19 confirmed by Julio)

## Problem Statement

`nativescript-notti` can identify users and ask for permission (`public-api`), but the app cannot react to
pushes: it does not learn when a notification arrives in the foreground, when the user taps one (including the
tap that launched the app), when the Notti device id changes, or when the user taps an In-App message button.
`react-native-notti` exposes all four; this feature brings the same contract, with the native SDKs owning
delivery, buffering and replay.

## Goals

- [ ] `Notti.addEventListener` for `notificationReceived`, `notificationClicked`, `deviceIdChanged`,
      `Notti.getInitialNotificationClick()` and `Notti.InAppMessages.addClickListener` exist with the RN names,
      callback signatures and payload shapes.
- [ ] Payloads are identical on iOS and Android (same keys, `null` rules, `action` values).
- [ ] The plugin keeps no event state: every JS listener maps to one native listener (context.md).

## Out of Scope

| Feature | Reason |
| --- | --- |
| Opening In-App links | Host's job (AD-004) |
| Background/killed-state `received` events | Native SDKs report `received` only while the app runs |
| Notification action buttons | Not in the RN public API |
| A TS buffer or replay for clicks or received events | Julio's decision (context.md); native SDKs own buffering |
| Removing all listeners at once (`removeAllListeners`) | Not in the RN public API |

---

## Public contract (RN parity)

```typescript
interface NotificationPayload {
  title?: string | null;   // always present on delivery; null when the push has none
  body?: string | null;    // same
  data?: { [key: string]: string }; // always present on delivery; {} when empty
}
interface NottiInAppAction { type: 'url' | 'deeplink'; value: string }
interface NottiInAppClick { messageId: string; buttonId: string; action: NottiInAppAction | null }
interface EventSubscription { remove(): void }
type NottiEventName = 'notificationReceived' | 'notificationClicked' | 'deviceIdChanged';

Notti.addEventListener('notificationReceived' | 'notificationClicked', (p: NotificationPayload) => void): EventSubscription;
Notti.addEventListener('deviceIdChanged', (deviceId: string) => void): EventSubscription;
Notti.getInitialNotificationClick(): Promise<NotificationPayload | null>;
Notti.InAppMessages.addClickListener((click: NottiInAppClick) => void): EventSubscription;
```

Types keep RN's optional markers (`?`) so code written against RN compiles unchanged; delivery always fills
`title`, `body` and `data` (RN A1 rule).

---

## User Stories

### P1: Notification clicked and the launch click ⭐ MVP

**User Story**: As an app developer, I want to know when the user taps a Notti notification, including the tap
that opened the app, so that I can navigate to the right screen.

**Acceptance Criteria**:

1. WHEN the app calls `addEventListener('notificationClicked', cb)` THEN the plugin SHALL attach one native clicked
   listener for that callback, and `cb` SHALL receive each tap the native SDK delivers to it, as a `NotificationPayload`.
2. WHEN the returned subscription's `remove()` is called THEN the plugin SHALL remove that native listener; further
   calls to `remove()` SHALL do nothing.
3. WHEN no JS clicked listener exists THEN the plugin SHALL have no native clicked listener attached, so the native
   SDK keeps the tap for `takeInitialClick()` (context.md).
4. WHEN the app calls `getInitialNotificationClick()` THEN the plugin SHALL resolve with the native
   `takeInitialClick()` result mapped to `NotificationPayload`, or `null` when there is none; a second call SHALL
   resolve `null` unless a new tap was kept (native "once" rule).
5. WHEN `getInitialNotificationClick()` is called before `initialize` THEN it SHALL still return what the native SDK
   kept (the native API has no initialize requirement for this call).

**Independent Test**: unit tests with stubs; device: kill the app, tap a push, launch → `getInitialNotificationClick()`
returns it when no clicked listener was added before the tap; with a listener added in `app.ts`, the listener gets it
and `getInitialNotificationClick()` returns `null`.

---

### P1: Notification received in the foreground ⭐ MVP

**User Story**: As an app developer, I want a callback when a Notti push arrives while the app is open, so that I can
refresh in-app content.

**Acceptance Criteria**:

1. WHEN the app calls `addEventListener('notificationReceived', cb)` THEN the plugin SHALL attach one native received
   listener and `cb` SHALL receive each notification the native SDK delivers to it.
2. WHEN the first JS received listener is added on iOS THEN it MAY receive notifications buffered before it (native
   iOS behavior); on Android it SHALL NOT (native "Not replayed"). The plugin SHALL NOT add or suppress replay; README
   documents the difference.
3. `remove()` behaves as in the clicked story.

---

### P1: Device id changed ⭐ MVP

**Acceptance Criteria**:

1. WHEN the app calls `addEventListener('deviceIdChanged', cb)` THEN `cb` SHALL receive the new device id string each
   time the native SDK reports one.
2. `remove()` behaves as in the clicked story.

---

### P1: In-App message click ⭐ MVP

**User Story**: As an app developer, I want a callback when the user taps an In-App message button or image, so that I
can open the link or deep link myself (AD-004).

**Acceptance Criteria**:

1. WHEN the app calls `InAppMessages.addClickListener(cb)` THEN the plugin SHALL attach one native In-App click
   listener and `cb` SHALL receive `{ messageId, buttonId, action }`.
2. WHEN the native action type is `url` or `deeplink` THEN `action` SHALL be `{ type, value }` with `type` lowercase
   (`url`/`deeplink`) on both platforms.
3. WHEN the native action is absent, null, or of any other type (including the `push_permission` button, which the SDK
   runs itself) THEN `action` SHALL be `null`, never `undefined`.
4. WHEN the listener is added before `initialize` THEN the plugin SHALL attach it anyway (Android keeps such listeners;
   iOS behavior is the native SDK's).
5. `remove()` behaves as in the clicked story.

---

### P1: Payload normalization ⭐ MVP

**Acceptance Criteria**:

1. WHEN a notification has no title or body THEN the payload SHALL carry `title: null` / `body: null` (iOS omits the
   keys; Android returns null), never `undefined` (RN A1).
2. WHEN a notification has no data THEN `data` SHALL be `{}`; otherwise a plain JS object with every native string
   entry (iOS `NSDictionary`, Android `java.util.Map`).
3. WHEN the payload reaches the callback THEN it SHALL be a plain JS object (no native proxy objects), so apps can
   store or serialize it.

---

### P2: App callback errors are isolated

**Acceptance Criteria**:

1. WHEN an app callback throws THEN the plugin SHALL catch it and report it with `console.error` (event name and error,
   no payload), so the exception never propagates into the native SDK's listener loop and other listeners still run.

**Why P2**: an uncaught JS exception inside a native callback can terminate the NativeScript app by default
(`discardUncaughtJsExceptions` is off); the risk is real but needs a buggy app callback.

---

### P2: Types and docs

1. `dist/index.d.ts` declares the contract above with JSDoc (exactly-once delivery across the two click paths, iOS vs
   Android received replay, AD-004 link handling).
2. README "Events" section with a startup example handling both click paths.

---

## Edge Cases

- WHEN `addEventListener` gets an unknown event name at runtime (plain JS) THEN it SHALL throw a `TypeError` naming the
  allowed names (programming error; RN's typed API rejects it at compile time).
- WHEN the same callback is added twice THEN it SHALL be attached twice and called twice per event (no dedupe; native
  semantics, matches RN emitter).
- WHEN `remove()` is called inside the callback being delivered THEN it SHALL not throw.
- `data` values are copied as the native SDK gives them: both SDKs guarantee string keys and values [Certo, iOS
  `NottiObjC.swift` header, Android `NottiNotification.data: Map<String, String>`]; no conversion in the plugin.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| EVT-01 | P1 clicked: one native listener per JS listener | Tasks | In Tasks |
| EVT-02 | P1 clicked: idempotent remove detaches native | Tasks | In Tasks |
| EVT-03 | P1 clicked: no native listener when none in JS | Tasks | In Tasks |
| EVT-04 | P1 launch: getInitialNotificationClick → takeInitialClick, once | Tasks | In Tasks |
| EVT-05 | P1 launch: works before initialize | Tasks | In Tasks |
| EVT-06 | P1 received: attach/deliver | Tasks | In Tasks |
| EVT-07 | P1 received: native replay asymmetry passed through | Tasks | In Tasks |
| EVT-08 | P1 deviceIdChanged | Tasks | In Tasks |
| EVT-09 | P1 In-App: attach/deliver | Tasks | In Tasks |
| EVT-10 | P1 In-App: action url/deeplink lowercase | Tasks | In Tasks |
| EVT-11 | P1 In-App: other/absent action → null | Tasks | In Tasks |
| EVT-12 | P1 In-App: listener before initialize attached | Tasks | In Tasks |
| EVT-13 | P1 payload: title/body null, never undefined | Tasks | In Tasks |
| EVT-14 | P1 payload: data plain object, {} when empty | Tasks | In Tasks |
| EVT-15 | P1 payload: plain JS objects | Tasks | In Tasks |
| EVT-16 | P2 callback errors isolated | Tasks | In Tasks |
| EVT-17 | P2 types + JSDoc | Tasks | In Tasks |
| EVT-18 | P2 README events section | Tasks | In Tasks |
| EVT-19 | Edge: unknown event name → TypeError | Tasks | In Tasks |
| EVT-20 | Edge: duplicate callbacks not deduped; remove inside callback safe | Tasks | In Tasks |

**Coverage:** 20 total, 20 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] Unit tests cover every EVT requirement on the facade and both adapters.
- [ ] iOS simulator: listeners attach/remove without JS errors; `getInitialNotificationClick()` resolves `null` with no
      tap. Real push delivery and the launch tap need a device and a real `appId` (device checklist, later).
- [ ] Android: build; runtime pending B-001.
