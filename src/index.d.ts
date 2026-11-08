// Public type surface shared by index.ios.js and index.android.js.
import type { NottiApi } from './notti';

export type {
  EventSubscription,
  InitializeOptions,
  NottiApi,
  NottiEventName,
  NottiInAppMessagesApi,
  NottiUserApi,
} from './notti';
export type { NotificationPayload, NottiInAppAction, NottiInAppClick } from './native/types';

export declare const Notti: NottiApi;
