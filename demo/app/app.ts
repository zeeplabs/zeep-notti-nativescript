import { Application } from '@nativescript/core'
import { Notti } from 'nativescript-notti'

import { startEvents } from './notti-events'
import { NOTTI_APP_ID, NOTTI_BASE_URL, NOTTI_CLIENT_KEY } from './config.local'

// Initialize as early as possible, before the app starts, like a real integration.
Notti.initialize(NOTTI_APP_ID, NOTTI_CLIENT_KEY, NOTTI_BASE_URL ? { baseUrl: NOTTI_BASE_URL } : undefined)
console.log('[notti-demo] Notti.initialize returned')
startEvents()

Application.run({ moduleName: 'app-root' })

/*
Do not place any code after the application has been started as it will not
be executed on iOS.
*/
