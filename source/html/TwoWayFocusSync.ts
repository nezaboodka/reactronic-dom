// The below copyright notice and the license permission notice
// shall be included in all copies or substantial portions.
// Copyright (C) 2019-2022 Yury Chetyrko <ychetyrko@gmail.com>
// MIT License: https://raw.githubusercontent.com/nezaboodka/reactronic-dom/master/LICENSE
// By contributing, you agree that your contributions will be
// automatically licensed under the license referred above.

import { Ref, ToggleRef } from 'reactronic'
import { RxNode } from '../core/api'

export function TwoWayFocusSync(
  name: string,
  target: HTMLElement,
  focusToggle: ToggleRef<any>,
  setNativeFocus?: (() => void)
): void {
  target.dataForSensor.focus = focusToggle
  if (setNativeFocus === undefined)
    setNativeFocus = () => target.focus()
  RxNode.Reaction(name, { focusToggle }, () => {
    const f = focusToggle.value
    const f1 = focusToggle.valueOn
    const active = f === focusToggle.valueOn || (
      f instanceof Ref && f1 instanceof Ref && Ref.sameRefs(f, f1))
    // console.log(`${(entity as any).constructor.name}.${member.toString()} === ${entity[member]} => ${member}:${activeValue}.setFocused(${active}) // ${Reactronic.why()}`)
    if (active && setNativeFocus)
      setNativeFocus()
  })
}

export function RxFocus(name: string, target: HTMLElement, focusToggle: ToggleRef<any>): void {
  RxNode.Reaction(name, { target, focusToggle }, () => {
    target.dataForSensor.focus = focusToggle
    const value = focusToggle.value
    const valueOn = focusToggle.valueOn
    const active = value === valueOn ||
      (value instanceof Ref && valueOn instanceof Ref && Ref.sameRefs(value, valueOn))
    if (active)
      target.focus()
  })
}
