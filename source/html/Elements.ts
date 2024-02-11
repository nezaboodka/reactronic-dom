// The below copyright notice and the license permission notice
// shall be included in all copies or substantial portions.
// Copyright (C) 2019-2024 Nezaboodka Software <contact@nezaboodka.com>
// License: https://raw.githubusercontent.com/nezaboodka/verstak/master/LICENSE
// By contributing, you agree that your contributions will be
// automatically licensed under the license referred above.

import { RxNodeDecl, RxNodeDriver, RxNode, Delegate, Mode } from "reactronic"
import { Constants, CursorCommandDriver, El, ElKind, ElArea, ElDriver } from "./El.js"
import { HtmlElementDriver } from "./HtmlDriver.js"

// Verstak is based on two fundamental layout structures
// called section and table; and on two special non-visual
// elements called partition and group.

// Section is a layout structure, which children are layed
// out naturally: rightwards-downwards.

// Table is layout structure, which children are layed out
// over table cells.

// Partition is a special non-visual element, which begins
// new layout partition inside section or table.

// Note is either plain or markdown-formatted text
// supporting syntax highlighting for code blocks.

// Group is a special non-visual element for logical
// grouping of sections, tables and other groups.

// Section

export function Section<M = unknown>(
  declaration?: RxNodeDecl<El<HTMLElement, M>>,
  preset?: RxNodeDecl<El<HTMLElement, M>>): RxNode<El<HTMLElement, M>> {
  return RxNode.declare(Drivers.section, declaration, preset)
}

// Table

export function Table<M = unknown, R = void>(
  declaration?: RxNodeDecl<El<HTMLElement, M>>,
  preset?: RxNodeDecl<El<HTMLElement, M>>): RxNode<El<HTMLElement, M>> {
  return RxNode.declare(Drivers.table, declaration, preset)
}

// Partition

export function row<T = void>(builder?: (element: void) => T, shiftCursorDown?: number): void {
  startNewRow(shiftCursorDown)
  builder?.()
}

export function startNewRow(shiftCursorDown?: number): void {
  RxNode.declare(Drivers.partition)
}

export function cursor(areaParams: ElArea): void {
  RxNode.declare(Drivers.cursor, {
    formula(b) {
      b.area = areaParams
    },
  })
}

// Note (either plain or html)

export function Note(content: string,
  declaration?: RxNodeDecl<El<HTMLElement, void>>): RxNode<El<HTMLElement, void>> {
  return RxNode.declare(Drivers.note, declaration, {
    formula(b) {
      b.native.innerText = content
    }},
  )
}

export function HtmlNote(content: string,
  declaration?: RxNodeDecl<El<HTMLElement, void>>): RxNode<El<HTMLElement, void>> {
  return RxNode.declare(Drivers.note, declaration, {
    formula(b) {
      b.native.innerHTML = content
    }},
  )
}

// Group

export function Group<M = unknown, R = void>(
  declaration?: RxNodeDecl<El<HTMLElement, M>>,
  preset?: RxNodeDecl<El<HTMLElement, M>>): RxNode<El<HTMLElement, M>> {
  return RxNode.declare(Drivers.group, declaration, preset)
}

// Fragment

export function Handling<M = unknown>(
  formula: Delegate<El<void, M>>): RxNode<El<void, M>> {
  return SyntheticElement({ mode: Mode.independentUpdate, formula })
}

export function SyntheticElement<M = unknown>(
  declaration?: RxNodeDecl<El<void, M>>,
  preset?: RxNodeDecl<El<void, M>>): RxNode<El<void, M>> {
  return RxNode.declare(Drivers.synthetic, declaration, preset)
}

// VerstakElementDriver

export class VerstakElementDriver<T extends HTMLElement> extends HtmlElementDriver<T> {
  update(node: RxNode<El<T>>): void | Promise<void> {
    const element = node.element
    // Add initial line feed automatically
    if (element.kind === ElKind.section)
      startNewRow()
    return super.update(node)
  }
}

const Drivers = {
  // display: flex, flex-direction: column
  section: new VerstakElementDriver<HTMLElement>(Constants.element, false, el => el.kind = ElKind.section),

  // display: grid
  table: new VerstakElementDriver<HTMLElement>(Constants.element, false, el => el.kind = ElKind.table),

  // display: block
  note: new VerstakElementDriver<HTMLElement>(Constants.element, false, el => el.kind = ElKind.note),

  // display: contents
  group: new VerstakElementDriver<HTMLElement>(Constants.group, false, el => el.kind = ElKind.group),

  // display: flex/row or contents
  partition: new VerstakElementDriver<HTMLElement>(Constants.partition, true, el => el.kind = ElKind.part),

  // cursor control element
  cursor: new CursorCommandDriver(),

  // (no element)
  synthetic: new ElDriver<HTMLElement>("synthetic", false, el => el.kind = ElKind.group) as unknown as RxNodeDriver<El<void, any>>,
}
