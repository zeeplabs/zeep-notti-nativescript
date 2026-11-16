import type { NottiNative } from './native/types';
import { SDK_VERSION } from './version';

export interface InitializeOptions {
  /** Backend host (`https://...`). Omit to use the Notti default host. */
  baseUrl?: string;
}

export interface NottiApi {
  initialize(appId: string, clientKey: string, options?: InitializeOptions): void;
}

export function createNotti(native: NottiNative): NottiApi {
  return {
    initialize(appId, clientKey, options) {
      native.initialize(appId, clientKey, options?.baseUrl ?? null, SDK_VERSION);
    },
  };
}
