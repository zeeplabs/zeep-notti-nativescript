/**
 * SDK package version, forwarded to the native wrapper initializers as `sdk_version`.
 *
 * A literal on purpose (same as react-native-notti): a bundler-resolved self-require of
 * package.json can be dropped silently. `test/version.test.ts` fails when this drifts from
 * package.json; `scripts/sync-sdk-version.js` rewrites it on release.
 */
export const SDK_VERSION = '0.0.0';
