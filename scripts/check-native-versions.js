#!/usr/bin/env node
// Fails when the native SDK versions in platforms/ drift from package.json "notti",
// or when src/version.ts drifts from package.json "version".
const fs = require('fs');
const path = require('path');

function read(root, ...segments) {
  return fs.readFileSync(path.join(root, ...segments), 'utf8');
}

function checkNativeVersions(root) {
  const pkg = JSON.parse(read(root, 'package.json'));
  const errors = [];

  const pod = read(root, 'platforms', 'ios', 'Podfile').match(
    /pod\s+'NottiSDK',\s*'~>\s*([0-9.]+)'/
  );
  if (!pod) {
    errors.push("platforms/ios/Podfile: no `pod 'NottiSDK', '~> X.Y.Z'` line");
  } else if (pod[1] !== pkg.notti.ios) {
    errors.push(
      `platforms/ios/Podfile: NottiSDK ~> ${pod[1]}, package.json notti.ios ${pkg.notti.ios}`
    );
  }

  const aar = read(root, 'platforms', 'android', 'include.gradle').match(
    /br\.com\.zeeplabs:notti-android:([0-9.]+)/
  );
  if (!aar) {
    errors.push('platforms/android/include.gradle: no br.com.zeeplabs:notti-android dependency');
  } else if (aar[1] !== pkg.notti.android) {
    errors.push(
      `platforms/android/include.gradle: notti-android ${aar[1]}, package.json notti.android ${pkg.notti.android}`
    );
  }

  const sdk = read(root, 'src', 'version.ts').match(/export const SDK_VERSION = '([^']*)';/);
  if (!sdk || sdk[1] !== pkg.version) {
    errors.push(
      `src/version.ts: SDK_VERSION ${sdk ? sdk[1] : 'missing'}, package.json version ${pkg.version}`
    );
  }

  return errors;
}

module.exports = { checkNativeVersions };

if (require.main === module) {
  const errors = checkNativeVersions(path.resolve(__dirname, '..'));
  for (const error of errors) console.error(error);
  if (errors.length > 0) process.exit(1);
  console.log('native versions in step');
}
