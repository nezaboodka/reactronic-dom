// The below copyright notice and the license permission notice
// shall be included in all copies or substantial portions.
// Copyright (C) 2019-2021 Yury Chetyrko <ychetyrko@gmail.com>
// MIT License: https://raw.githubusercontent.com/nezaboodka/reactronic-front/master/LICENSE
// By contributing, you agree that your contributions will be
// automatically licensed under the license referred above.

import { options, TraceLevel, transaction } from 'reactronic'
import { EmptyAssociatedDataArray, grabAssociatedData } from '../core/Sensor'
import { SymAssociatedData } from './HtmlApiExt'
import { extractModifierKeys, KeyboardModifiers } from './KeyboardSensor'
import { PointerSensor } from './PointerSensor'
import { WindowSensor } from './WindowSensor'

export class ClickSensor extends PointerSensor {
  clicked: number
  doubleClicked: number
  auxClicked: number

  constructor(window: WindowSensor) {
    super(window)
    this.clicked = 0
    this.doubleClicked = 0
    this.auxClicked = 0
  }

  @transaction
  listen(element: HTMLElement | undefined, enabled: boolean = true): void {
    const existing = this.sourceElement
    if (element !== existing) {
      if (existing) {
        existing.removeEventListener('click', this.onClick.bind(this), { capture: true })
        existing.removeEventListener('dblclick', this.onDblClick.bind(this), { capture: true })
        existing.removeEventListener('auxclick', this.onAuxClick.bind(this), { capture: true })
      }
      this.sourceElement = element
      if (element && enabled) {
        element.addEventListener('click', this.onClick.bind(this), { capture: true })
        element.addEventListener('dblclick', this.onDblClick.bind(this), { capture: true })
        element.addEventListener('auxclick', this.onAuxClick.bind(this), { capture: true })
      }
    }
  }

  reset(): void {
    this.doReset()
  }

  protected onClick(e: MouseEvent): void {
    this.doClick(e)
  }

  protected onDblClick(e: MouseEvent): void {
    this.doDoubleClick(e)
  }

  protected onAuxClick(e: MouseEvent): void {
    this.doAuxClick(e)
  }

  @transaction @options({ trace: TraceLevel.Suppress })
  protected doClick(e: MouseEvent): void {
    this.rememberPointerEvent(e)
    this.clicked++
  }

  @transaction @options({ trace: TraceLevel.Suppress })
  protected doDoubleClick(e: MouseEvent): void {
    this.rememberPointerEvent(e)
    this.doubleClicked++
  }

  @transaction @options({ trace: TraceLevel.Suppress })
  protected doAuxClick(e: MouseEvent): void {
    this.rememberPointerEvent(e)
    this.auxClicked++
  }

  @transaction @options({ trace: TraceLevel.Suppress })
  protected doReset(): void {
    this.associatedDataPath = EmptyAssociatedDataArray
    this.associatedDataUnderPointer = EmptyAssociatedDataArray
    this.event = undefined
    this.positionX = Infinity
    this.positionY = Infinity
    this.modifiers = KeyboardModifiers.None
    this.clicked = 0
    this.doubleClicked = 0
    this.auxClicked = 0
  }

  protected rememberPointerEvent(e: MouseEvent): void {
    this.event = e
    const path = e.composedPath()
    const { data: associatedDataUnderPointer, window } = grabAssociatedData(path, SymAssociatedData, 'click', this.associatedDataPath)
    this.associatedDataPath = associatedDataUnderPointer
    const elements = document.elementsFromPoint(e.clientX, e.clientY)
    this.associatedDataUnderPointer = grabAssociatedData(elements, SymAssociatedData, 'click', this.associatedDataUnderPointer).data
    this.modifiers = extractModifierKeys(e)
    this.positionX = e.clientX
    this.positionY = e.clientY
    this.revision++
    this.window?.setActiveWindow(window)
  }

  // @reaction
  // protected debug(): void {
  //   console.log(`clicked = ${this.clicked}, doubleClicked: ${this.doubleClicked}, auxClicked = ${this.auxClicked}`)
  // }
}
