import { createIosNative } from './native/native.ios';
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

export const Notti = createNotti(createIosNative());
