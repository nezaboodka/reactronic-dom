// The below copyright notice and the license permission notice
// shall be included in all copies or substantial portions.
// Copyright (C) 2019-2024 Nezaboodka Software <contact@nezaboodka.com>
// License: https://raw.githubusercontent.com/nezaboodka/verstak/master/LICENSE
// By contributing, you agree that your contributions will be
// automatically licensed under the license referred above.

import { Mode } from "reactronic"
import { SyntheticElement } from "./Elements.js"
import { FocusModel } from "./sensors/FocusSensor.js"

export function OnClick(target: HTMLElement, action: (() => void) | undefined, key?: string): void {

  if (action) {
    SyntheticElement({
      key,
      mode: Mode.IndependentUpdate,
      triggers: { target },
      update() {
        const pointer = target.sensors.pointer
        if (pointer.clicked) {
          action()
        }
      },
    })
  }

}

export function OnFocus(
  target: HTMLElement, model: FocusModel,
  switchEditMode: ((model?: FocusModel) => void) | undefined = undefined,
  key?: string): void {

  SyntheticElement({
    key,
    mode: Mode.IndependentUpdate,
    triggers: { target, model },
    initialize(b) {
      b.node.configureReactronic({ throttling: 0 })
    },
    update() {
      if (switchEditMode !== undefined) {
        switchEditMode(model)
      }
      else {
        model.isEditMode ? target.focus() : target.blur()
        // console.log(`${model.isEditMode ? '🟢' : '🔴'} RxFocuser [${name}]: ${model.isEditMode ? 'focus()' : 'blur()'}`)
      }
    },
  })

}
