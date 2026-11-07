import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { SDK_VERSION } from '../src/version';

describe('SDK_VERSION', () => {
  it('matches package.json, so the backend receives the released version as sdk_version', () => {
    const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
    expect(SDK_VERSION).toBe(pkg.version);
  });
});
