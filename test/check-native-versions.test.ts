import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { checkNativeVersions } from '../scripts/check-native-versions.js';

interface Fixture {
  version?: string;
  notti?: { ios: string; android: string };
  podfile?: string;
  gradle?: string;
  sdkVersion?: string;
}

function fixture(f: Fixture = {}): string {
  const root = mkdtempSync(join(tmpdir(), 'notti-versions-'));
  mkdirSync(join(root, 'platforms', 'ios'), { recursive: true });
  mkdirSync(join(root, 'platforms', 'android'), { recursive: true });
  mkdirSync(join(root, 'src'));
  const version = f.version ?? '0.1.0';
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({ version, notti: f.notti ?? { ios: '0.2.0', android: '0.2.0' } })
  );
  writeFileSync(
    join(root, 'platforms', 'ios', 'Podfile'),
    f.podfile ?? "platform :ios, '15.0'\npod 'NottiSDK', '~> 0.2.0'\n"
  );
  writeFileSync(
    join(root, 'platforms', 'android', 'include.gradle'),
    f.gradle ?? "dependencies {\n    implementation 'br.com.zeeplabs:notti-android:0.2.0'\n}\n"
  );
  writeFileSync(
    join(root, 'src', 'version.ts'),
    `export const SDK_VERSION = '${f.sdkVersion ?? version}';\n`
  );
  return root;
}

describe('checkNativeVersions', () => {
  it('passes when Podfile, include.gradle and version.ts agree with package.json', () => {
    expect(checkNativeVersions(fixture())).toEqual([]);
  });

  it('fails when the NottiSDK pod drifts from package.json notti.ios', () => {
    const errors = checkNativeVersions(fixture({ podfile: "pod 'NottiSDK', '~> 0.3.0'\n" }));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('NottiSDK');
  });

  it('fails when notti-android drifts from package.json notti.android', () => {
    const errors = checkNativeVersions(
      fixture({ gradle: "implementation 'br.com.zeeplabs:notti-android:0.1.0'\n" })
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('notti-android');
  });

  it('fails when a dependency line is missing instead of passing silently', () => {
    const errors = checkNativeVersions(fixture({ podfile: "platform :ios, '15.0'\n" }));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('NottiSDK');
  });

  it('fails when SDK_VERSION drifts from package.json version', () => {
    const errors = checkNativeVersions(fixture({ sdkVersion: '0.0.9' }));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('SDK_VERSION');
  });

  it('passes on this repository', () => {
    expect(checkNativeVersions(join(__dirname, '..'))).toEqual([]);
  });
});
