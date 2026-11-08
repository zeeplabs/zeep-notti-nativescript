import { Utils } from '@nativescript/core';

import { createAndroidNative } from './native/native.android';
import { createNotti } from './notti';

export type {
  EventSubscription,
  InitializeOptions,
  NottiApi,
  NottiEventName,
  NottiInAppMessagesApi,
  NottiUserApi,
} from './notti';
export type { NotificationPayload, NottiInAppAction, NottiInAppClick } from './native/types';

export const Notti = createNotti(createAndroidNative(() => Utils.android.getApplicationContext()));
