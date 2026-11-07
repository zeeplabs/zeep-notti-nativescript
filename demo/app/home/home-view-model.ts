import { EventData, Observable } from '@nativescript/core'

import { actions, runAction, runAll } from '../notti-actions'

let smokeRan = false

export class HomeViewModel extends Observable {
  actions = actions

  constructor() {
    super()
    if (!smokeRan) {
      smokeRan = true
      setTimeout(() => runAll(), 0)
    }
  }

  onAction(args: EventData) {
    const action = (args.object as unknown as { bindingContext: (typeof actions)[number] }).bindingContext
    runAction(action)
  }
}
