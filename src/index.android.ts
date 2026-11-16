import { Utils } from '@nativescript/core';

import { createAndroidNative } from './native/native.android';
import { createNotti } from './notti';

export type { InitializeOptions, NottiApi, NottiUserApi } from './notti';

export const Notti = createNotti(createAndroidNative(() => Utils.android.getApplicationContext()));
