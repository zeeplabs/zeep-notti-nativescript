import { Observable } from '@nativescript/core'

import { initializeNative } from '../notti-spike'

export class HomeViewModel extends Observable {
  status = 'Not initialized'

  constructor() {
    super()
    // Spike (T5-T7): run once on launch so the console proves the native path without a tap.
    setTimeout(() => this.onInitialize(), 0)
  }

  onInitialize() {
    try {
      initializeNative()
      this.set('status', 'initialize returned')
      console.log('[notti-demo] initialize returned')
    } catch (e) {
      this.set('status', `initialize threw: ${e}`)
      console.error('[notti-demo] initialize threw', e)
    }
  }
}
