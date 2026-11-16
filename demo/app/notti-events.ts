import { Notti, type EventSubscription, type NotificationPayload } from 'nativescript-notti'

const log = (message: string) => console.log(`[notti-demo] ${message}`)

// Logs field names only: payloads may carry personal data.
const describe = (payload: NotificationPayload | null) =>
  payload ? `{ title: ${payload.title === null ? 'null' : 'set'}, data keys: [${Object.keys(payload.data ?? {}).join(', ')}] }` : 'null'

let subscriptions: EventSubscription[] = []

export function addListeners() {
  if (subscriptions.length > 0) return
  subscriptions = [
    Notti.addEventListener('notificationReceived', (p) => log(`notificationReceived ${describe(p)}`)),
    Notti.addEventListener('notificationClicked', (p) => log(`notificationClicked ${describe(p)}`)),
    Notti.addEventListener('deviceIdChanged', () => log('deviceIdChanged')),
    Notti.InAppMessages.addClickListener((click) => log(`inAppClick action: ${click.action?.type ?? 'null'}`)),
  ]
  log(`listeners added (${subscriptions.length})`)
}

export function removeListeners() {
  subscriptions.forEach((subscription) => {
    subscription.remove()
    subscription.remove() // idempotent (EVT-02)
  })
  log(`listeners removed (${subscriptions.length})`)
  subscriptions = []
}

/** Startup pattern from the README: take the launch tap, then listen for the next ones. */
export async function startEvents() {
  log(`getInitialNotificationClick -> ${describe(await Notti.getInitialNotificationClick())}`)
  addListeners()
}
