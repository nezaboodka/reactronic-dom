// The below copyright notice and the license permission notice
// shall be included in all copies or substantial portions.
// Copyright (C) 2019-2021 Yury Chetyrko <ychetyrko@gmail.com>
// MIT License: https://raw.githubusercontent.com/nezaboodka/reactronic-front-web/master/LICENSE
// By contributing, you agree that your contributions will be
// automatically licensed under the license referred above.

import { Reactronic } from 'reactronic'
import { render, unmount, Declaration, Rtti, forAll } from '../core/api'

export abstract class AbstractHtmlRtti<E extends Element> implements Rtti<E, any> {
  static isDebugAttributeEnabled: boolean = false

  constructor(
    readonly name: string,
    readonly sorting: boolean = false) {
  }

  render(d: Declaration<E, any>): void {
    const self = d.instance! // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const native = self.native!
    const outer = AbstractHtmlRtti.gNativeParent
    try { // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      AbstractHtmlRtti.gNativeParent = d // console.log(`${'  '.repeat(Math.abs(ref.mounted!.level))}render(${e.id} r${ref.mounted!.cycle})`)
      render(d) // proceed
      // TODO: native.sensorData.drag handling?
      AbstractHtmlRtti.blinkingEffect && blink(native, self.revision)
      if (AbstractHtmlRtti.isDebugAttributeEnabled)
        native.setAttribute('rdbg', `${self.revision}:    ${Reactronic.why()}`)
    }
    finally {
      AbstractHtmlRtti.gNativeParent = outer
    }
  }

  mount(d: Declaration<E, any>, sibling?: Declaration): void {
    const parent = d.renderingParent.instance?.native as Element
    const native = this.createElement(d) // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    native.id = d.id // console.log(`${'  '.repeat(Math.abs(ref.mounted!.level))}${parent.id}.appendChild(${e.id} r${ref.mounted!.cycle})`)
    if (!d.parent.rtti.sorting) {
      if (sibling !== undefined) {
        const prev = sibling.instance?.native
        if (prev instanceof Element)
          parent.insertBefore(native, prev.nextSibling)
      }
      else
        parent.insertBefore(native, parent.firstChild)
    }
    else
      parent.appendChild(native)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    d.instance!.native = native
  }

  protected abstract createElement(m: Declaration<E, any>): E

  reorder(d: Declaration<E, any>, sibling?: Declaration): void {
    const parent = d.renderingParent.instance?.native as Element
    const prev = sibling?.instance?.native
    const native = d.instance?.native
    if (native && prev instanceof Element && prev.nextSibling !== native) { // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      // console.log(`${'  '.repeat(Math.abs(ref.mounted!.level))}${parent.id}.insertBefore(${(prev.nextSibling! as any)?.id})`)
      parent.insertBefore(native, prev.nextSibling)
    }
  }

  static unmounting?: Element = undefined
  unmount(d: Declaration<E, any>, cause: Declaration): void {
    const self = d.instance
    const native = self?.native
    if (!AbstractHtmlRtti.unmounting && native && native.parentElement) {
      AbstractHtmlRtti.unmounting = native // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      try { // console.log(`${'  '.repeat(Math.abs(ref.mounted!.level))}${e.parentElement.id}.removeChild(${e.id} r${ref.mounted!.cycle})`)
        self?.resizing?.unobserve(native)
        native.remove()
        unmount(d, cause) // proceed
      }
      finally {
        AbstractHtmlRtti.unmounting = undefined
      }
    }
    else { // console.log(`${'  '.repeat(Math.abs(ref.mounted!.level))}???.unmount(${ref.id} r${ref.mounted!.cycle})`)
      if (native)
        self?.resizing?.unobserve(native)
      unmount(d, cause) // proceed
    }
  }

  static gNativeParent: Declaration<any, any> =
    Declaration.createRoot('global.document.body', global.document.body)

  private static _blinkingEffect: string | undefined = undefined
  static set blinkingEffect(value: string | undefined) {
    if (value === undefined) {
      forAll((e: any) => {
        if (e instanceof HTMLElement)
          e.classList.remove(`${AbstractHtmlRtti.blinkingEffect}-0`, `${AbstractHtmlRtti.blinkingEffect}-1`)
      })
    }
    AbstractHtmlRtti._blinkingEffect = value
  }
  static get blinkingEffect(): string | undefined {
    return AbstractHtmlRtti._blinkingEffect
  }
}

function blink(e: Element, cycle: number): void {
  const n1 = cycle % 2
  const n2 = 1 >> n1
  e.classList.toggle(`${AbstractHtmlRtti.blinkingEffect}-${n1}`, true)
  e.classList.toggle(`${AbstractHtmlRtti.blinkingEffect}-${n2}`, false)
}

export class HtmlRtti<E extends HTMLElement> extends AbstractHtmlRtti<E> {
  protected createElement(d: Declaration<E, any>): E {
    return document.createElement(d.rtti.name) as E
  }
}

export class SvgRtti<E extends SVGElement> extends AbstractHtmlRtti<E> {
  protected createElement(d: Declaration<E, any>): E {
    return document.createElementNS('http://www.w3.org/2000/svg', d.rtti.name) as E
  }
}
