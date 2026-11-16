# nativescript-notti

Notti push notifications and In-App Messages for NativeScript, on top of the native Notti SDKs
(`NottiSDK` for iOS, `notti-android` for Android). All push, queue and In-App logic lives in the
native SDKs; this plugin is a thin TypeScript layer.

> **In development.** Initialization, identity, tags, email/phone, permission, subscription, location
> sharing, device id and `trackEvent` are available. Listeners (notification received/clicked, device id
> changed, initial click) and the In-App click listener follow the `react-native-notti` contract and land
> next. Not published to npm yet.

## Requirements

| | Minimum |
| --- | --- |
| NativeScript | 9.0 (`@nativescript/core`, CLI, iOS and Android runtimes) |
| iOS | 15.0 (the NativeScript 9 app template targets 16.0) |
| Android | minSdk 24 (the template default); compileSdk 34 or later |

Native dependencies, added by the plugin:

- iOS: CocoaPods `NottiSDK ~> 0.2.0`. Dynamic frameworks (NativeScript's default) and
  `use_frameworks! :linkage => :static` are both supported.
- Android: `br.com.zeeplabs:notti-android:0.2.0` from Maven Central. It brings `firebase-messaging`
  and registers its own `FirebaseMessagingService`.

## Install

```bash
ns plugin add nativescript-notti
```

## Usage

Call `initialize` once, as early as possible (for example in `app.ts`, before `Application.run`):

```ts
import { Notti } from 'nativescript-notti';

Notti.initialize('<your app id>', '<your client key>');
// Optional: a different backend host (self-hosted Notti or a sandbox)
// Notti.initialize(appId, clientKey, { baseUrl: 'https://...' });
```

The device reports itself to Notti as `sdk_name: "nativescript"`.

### API

| Call | What it does |
| --- | --- |
| `await Notti.requestPermission()` | Asks for the notification permission. `true` when granted, `false` when denied; never rejects on denial. |
| `Notti.login(userId)` / `Notti.logout()` | Links this device to your user id / unlinks it. |
| `Notti.setSubscription(enabled)` | Opts the device in or out of pushes. |
| `Notti.setLocationSharingEnabled(enabled)` | Opt-in country targeting (default off). The SDK never asks for location permission; it reads the country only when your app already has it. `false` clears the synced country. |
| `Notti.getDeviceId()` | The Notti device id, or `null` until assigned. |
| `Notti.trackEvent(name)` | Reports an app event that can trigger an In-App message. Matched on the device, never sent to the server. |
| `Notti.User.addTag(key, value)` / `addTags({ ... })` | Adds or replaces tags for Notti Segments. |
| `Notti.User.removeTag(key)` / `removeTags([...])` | Removes tags. |
| `Notti.User.setEmail(email)` / `clearEmail()` | User email (personal data: collect it with consent). |
| `Notti.User.setPhone(phone)` / `clearPhone()` | User phone (personal data: collect it with consent). |

**Before `initialize`** (same as react-native-notti): email, phone and `logout` are kept and sent at
registration; `login`, tags and `setSubscription` are dropped by the native SDK with one warning;
`trackEvent` is ignored; on Android `requestPermission` answers `false` without a dialog. Call `initialize`
first.

**Tags:** `addTags`/`removeTags` ignore entries that are not strings, with a console warning that names the
key (never the value).

In-App Message links are never opened by the SDK: your app handles them (listener API coming next).

## Android: Firebase setup

The plugin never applies the `com.google.gms.google-services` Gradle plugin, so it does not clash
with `@nativescript/firebase-core`, which applies it itself. Your app (or firebase-core) owns the
`google-services.json` and the Gradle plugin. The exact setup for apps without firebase-core is
being validated and will be documented here.

## Contributing

- `pnpm install` (also builds the plugin into `dist/`), then `pnpm lint`, `pnpm typecheck`,
  `pnpm test`.
- Demo app: copy `demo/app/config.example.ts` to `demo/app/config.local.ts` (gitignored, never commit
  real keys), then `cd demo && pnpm exec ns run ios` or `ns run android`.
- Android builds need JDK 17. On a Mac with Homebrew CocoaPods, the NativeScript CLI needs
  `xcodeproj` on the `ruby` in `PATH`; see `.specs/codebase/TESTING.md`.
- Commits follow Conventional Commits (checked by commitlint through lefthook).

## License

MIT
