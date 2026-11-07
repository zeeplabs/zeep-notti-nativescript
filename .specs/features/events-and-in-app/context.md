# Events and In-App Context

**Gathered:** 2026-11-07
**Spec:** `.specs/features/events-and-in-app/spec.md`
**Status:** Ready for design

---

## Feature Boundary

JS listeners for notification received, notification clicked and device id changed; the launch
click (`getInitialNotificationClick`); and the In-App click listener. Same contract as
`react-native-notti` `origin/main`, all behavior from the native SDKs.

---

## Implementation Decisions

### When native listeners are attached (Julio, 2026-11-07: "Sob demanda")

- The plugin attaches a native listener only when the app adds a JS listener, and detaches it when
  that JS subscription is removed. No listener is attached at import or at `initialize`.
- `getInitialNotificationClick()` calls the native `takeInitialClick()` directly. The plugin keeps no
  click slot or buffer in TypeScript.
- Consequence, documented in README (same as the native SDK docs): a tap reaches the app exactly once,
  either live through a `notificationClicked` listener (when one was attached when the tap arrived) or
  through `getInitialNotificationClick()` (when none was). Apps should handle both paths at startup.

### Facts this decision relies on [Certo, native source at tag 0.2.0]

- iOS `Notti.Notifications.addClickedListener`: "A tap that arrives with none attached is not replayed:
  it is kept for `takeInitialClick()`. On UIKit the launch tap arrives after `didFinishLaunching`
  returns". `takeInitialClick()`: "The latest tap that arrived while no clicked listener was attached
  ..., once".
- Android `Notti.Notifications.addClickedListener`: "While no clicked listener exists, the last tap is
  kept for `takeInitialClick` instead". `takeInitialClick()`: "once".
- iOS `addReceivedListener`: "The first listener also gets the ones buffered before it was added".
  Android `addReceivedListener`: "Not replayed". The plugin passes this asymmetry through (AD-009 style:
  the native SDK decides) and documents it.
- The `react-native-notti` iOS adapter comment (`ios/NottiImpl.swift:34`) says the SDK "replays a buffered
  click to the first listener"; the iOS SDK source says it does not. The SDK source wins; the RN comment is
  stale (worth fixing in that repo, out of scope here).

### Agent's Discretion

- Event API shape: RN parity (`Notti.addEventListener(name, cb)` returning `{ remove() }`,
  `Notti.InAppMessages.addClickListener(cb)`), no NativeScript `Observable` events.
- Payload normalization details, error isolation of app callbacks, idempotent `remove()`.

---

## Specific References

- `react-native-notti` `origin/main`: `src/index.tsx` (event API), `src/NativeNotti.ts` (payload types,
  A1 null rule), `ios/NottiImpl.swift` (payload shapes).
- `NottiSDK` 0.2.0 `Sources/NottiSDK/Public/ObjC/NottiObjC.swift`: notification `NSDictionary` with `title`
  and `body` absent when the push has none, `data` string map; In-App click `NSDictionary` with exactly
  `messageId`, `buttonId`, `action` (`{type, value}` or `NSNull`).

---

## Deferred Ideas

- Fix the stale replay comment in `react-native-notti` `ios/NottiImpl.swift` (other repo).
