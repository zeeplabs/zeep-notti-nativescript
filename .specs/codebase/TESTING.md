# Testing

**Source:** `package-foundation` design (2026-11-07). Greenfield; update when the layout changes.

## Test Coverage Matrix

| Code layer | Location | Required test | Runner | Parallel-Safe |
| --- | --- | --- | --- | --- |
| Facade (pure TS) | `src/notti.ts` | unit | Vitest (Node) | Yes |
| Platform adapters | `src/native/native.{ios,android}.ts` | unit, native globals stubbed | Vitest (Node) | Yes |
| Version literal | `src/version.ts` | unit (drift vs package.json) | Vitest | Yes |
| Repo scripts | `scripts/*.js` | unit (fixtures) | Vitest | Yes |
| Swift shim | `platforms/ios/src/*.swift` | build (demo iOS) | `ns build ios` | No (one Xcode build at a time) |
| Native manifests | `platforms/ios/Podfile`, `platforms/android/include.gradle` | build (demo) + drift script | `ns build`, `check-native-versions` | No |
| Native runtime paths | listeners, push, In-App | device checklist (later features) | manual, `docs/DEVICE_CHECKLIST.md` | No |

## Gate Check Commands

| Gate | Command |
| --- | --- |
| quick | `pnpm lint && pnpm typecheck && pnpm test` |
| build | quick + `pnpm build` (tsc to `dist/`) + `node scripts/check-native-versions.js` |
| ios | build + `cd demo && pnpm exec ns build ios` (simulator) |
| android | build + `cd demo && JAVA_HOME=$(/usr/libexec/java_home -v 17) pnpm exec ns build android` |

## Rules

- Tests are co-located in the task that creates the code (no separate test tasks).
- Unit tests never import `@nativescript/core` or touch real native globals; adapters receive stubs.
- iOS builds on a Homebrew-CocoaPods Mac need (L-001):
  `export PATH=/opt/homebrew/opt/ruby/bin:$PATH`
  `export GEM_PATH=/opt/homebrew/Cellar/cocoapods/1.17.0/libexec:$(ruby -e 'puts Gem.default_path.join(":")')`
- Simulator console: `xcrun simctl spawn <udid> log show --last 5m --predicate 'process == "demo"'` (NativeScript logs as `CONSOLE LOG:`).
- Android builds need JDK 17 (default JDK 25 does not run Gradle 8.14.3).
- Never commit real `appId`/`clientKey` or a real `google-services.json`.
