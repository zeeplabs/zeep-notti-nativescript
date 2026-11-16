import type { NotificationPayload, NottiInAppAction, NottiInAppClick, NottiNative } from './types';

const SDK_NAME = 'nativescript';

function toRecord(map: java.util.Map<string, string> | null): { [key: string]: string } {
  const record: { [key: string]: string } = {};
  if (!map) return record;
  const iterator = map.entrySet().iterator();
  while (iterator.hasNext()) {
    const entry = iterator.next();
    record[entry.getKey()] = entry.getValue();
  }
  return record;
}

function toPayload(notification: com.zeeplabs.notti.NottiNotification): NotificationPayload {
  return {
    title: notification.getTitle() ?? null,
    body: notification.getBody() ?? null,
    data: toRecord(notification.getData()),
  };
}

function toAction(action: com.zeeplabs.notti.NottiInAppAction | null): NottiInAppAction | null {
  if (!action) return null;
  const type = action.getType().name().toLowerCase();
  return type === 'url' || type === 'deeplink' ? { type, value: action.getValue() } : null;
}

function toInAppClick(click: com.zeeplabs.notti.NottiInAppClick): NottiInAppClick {
  return {
    messageId: click.getMessageId(),
    buttonId: click.getButtonId(),
    action: toAction(click.getAction()),
  };
}

function notificationListener(listener: (payload: NotificationPayload) => void) {
  return new com.zeeplabs.notti.NottiNotificationListener({
    onNotification: (notification) => listener(toPayload(notification)),
  });
}

/**
 * Calls `notti-android` directly; no Kotlin source is needed in the plugin.
 * `getContext` is injected so this module never imports `@nativescript/core` (unit-tested in Node).
 */
export function createAndroidNative(getContext: () => globalAndroid.content.Context): NottiNative {
  const Notti = () => com.zeeplabs.notti.Notti;
  const User = () => com.zeeplabs.notti.Notti.User;
  return {
    initialize(appId, clientKey, baseUrl, sdkVersion) {
      // The host app opens In-App links itself (AD-004).
      const options = new com.zeeplabs.notti.NottiOptions(baseUrl, false);
      Notti().initializeForWrapper(getContext(), appId, clientKey, options, SDK_NAME, sdkVersion);
    },
    requestPermission() {
      return new Promise<boolean>((resolve, reject) => {
        try {
          com.zeeplabs.notti.Notti.Notifications.requestPermission(
            new com.zeeplabs.notti.NottiPermissionCallback({
              onResult: (granted) => resolve(!!granted),
            })
          );
        } catch (error) {
          reject(error);
        }
      });
    },
    login: (externalUserId) => Notti().login(externalUserId),
    logout: () => Notti().logout(),
    setSubscription: (enabled) => Notti().setSubscription(enabled),
    setLocationSharingEnabled: (enabled) => Notti().setLocationSharingEnabled(enabled),
    getDeviceId: () => Notti().getDeviceId() ?? null,
    trackEvent: (name) => Notti().trackEvent(name),
    addTag: (key, value) => User().addTag(key, value),
    addTags(tags) {
      const map = new java.util.HashMap<string, string>();
      for (const [key, value] of Object.entries(tags)) {
        map.put(key, value);
      }
      User().addTags(map);
    },
    removeTag: (key) => User().removeTag(key),
    removeTags(keys) {
      const list = new java.util.ArrayList<string>();
      for (const key of keys) {
        list.add(key);
      }
      User().removeTags(list);
    },
    setEmail: (email) => User().setEmail(email),
    clearEmail: () => User().clearEmail(),
    setPhone: (phone) => User().setPhone(phone),
    clearPhone: () => User().clearPhone(),
    addReceivedListener: (listener) =>
      com.zeeplabs.notti.Notti.Notifications.addReceivedListener(notificationListener(listener)),
    addClickedListener: (listener) =>
      com.zeeplabs.notti.Notti.Notifications.addClickedListener(notificationListener(listener)),
    addDeviceIdChangedListener: (listener) =>
      Notti().addDeviceIdChangedListener(
        new com.zeeplabs.notti.NottiDeviceIdListener({
          onDeviceIdChanged: (deviceId) => listener(deviceId),
        })
      ),
    addInAppClickListener: (listener) =>
      com.zeeplabs.notti.Notti.InAppMessages.addClickListener(
        new com.zeeplabs.notti.NottiInAppClickListener({
          onClick: (click) => listener(toInAppClick(click)),
        })
      ),
    takeInitialClick() {
      const click = com.zeeplabs.notti.Notti.Notifications.takeInitialClick();
      return click ? toPayload(click) : null;
    },
  };
}
