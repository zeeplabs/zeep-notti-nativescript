import { Notti } from 'nativescript-notti'

import { addListeners, removeListeners } from './notti-events'

const log = (message: string) => console.log(`[notti-demo] ${message}`)

/** One entry per public method, used by the buttons and by the launch smoke run. */
export const actions: { label: string; run: () => void | Promise<void> }[] = [
  { label: 'login', run: () => Notti.login('demo-user') },
  { label: 'logout', run: () => Notti.logout() },
  { label: 'addTag', run: () => Notti.User.addTag('plan', 'pro') },
  { label: 'addTags', run: () => Notti.User.addTags({ plan: 'pro', city: 'sp' }) },
  { label: 'removeTag', run: () => Notti.User.removeTag('plan') },
  { label: 'removeTags', run: () => Notti.User.removeTags(['plan', 'city']) },
  { label: 'setEmail', run: () => Notti.User.setEmail('demo@example.com') },
  { label: 'clearEmail', run: () => Notti.User.clearEmail() },
  { label: 'setPhone', run: () => Notti.User.setPhone('+5511900000000') },
  { label: 'clearPhone', run: () => Notti.User.clearPhone() },
  { label: 'setSubscription(true)', run: () => Notti.setSubscription(true) },
  { label: 'setLocationSharingEnabled(false)', run: () => Notti.setLocationSharingEnabled(false) },
  { label: 'trackEvent', run: () => Notti.trackEvent('demo_event') },
  { label: 'getDeviceId', run: () => log(`getDeviceId -> ${Notti.getDeviceId()}`) },
  { label: 'removeListeners', run: () => removeListeners() },
  { label: 'addListeners', run: () => addListeners() },
  {
    label: 'requestPermission',
    run: async () => log(`requestPermission -> ${await Notti.requestPermission()}`),
  },
]

export async function runAction(action: (typeof actions)[number]) {
  try {
    await action.run()
    log(`${action.label} ok`)
  } catch (e) {
    console.error(`[notti-demo] ${action.label} threw`, e)
  }
}

/** Launch smoke run: proves every method reaches the native SDK without a JS error. */
export async function runAll() {
  for (const action of actions) {
    await runAction(action)
  }
  log('smoke run done')
}
