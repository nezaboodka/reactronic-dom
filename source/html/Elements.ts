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
  return RxNode.acquire(Drivers.section, declaration, preset)
}

// Table

export function Table<M = unknown, R = void>(
  declaration?: RxNodeDecl<El<HTMLElement, M>>,
  preset?: RxNodeDecl<El<HTMLElement, M>>): RxNode<El<HTMLElement, M>> {
  return RxNode.acquire(Drivers.table, declaration, preset)
}

// Partition

export function row<T = void>(builder?: (element: void) => T, shiftCursorDown?: number): void {
  startNewRow(shiftCursorDown)
  builder?.()
}

export function startNewRow(shiftCursorDown?: number): void {
  RxNode.acquire(Drivers.partition)
}

export function cursor(areaParams: ElArea): void {
  RxNode.acquire(Drivers.cursor, {
    update(b) {
      b.area = areaParams
    },
  })
}

// Note (either plain or html)

export function Note(content: string,
  declaration?: RxNodeDecl<El<HTMLElement, void>>): RxNode<El<HTMLElement, void>> {
  return RxNode.acquire(Drivers.note, declaration, {
    update(b) {
      b.native.innerText = content
    }},
  )
}

export function HtmlNote(content: string,
  declaration?: RxNodeDecl<El<HTMLElement, void>>): RxNode<El<HTMLElement, void>> {
  return RxNode.acquire(Drivers.note, declaration, {
    update(b) {
      b.native.innerHTML = content
    }},
  )
}

// Group

export function Group<M = unknown, R = void>(
  declaration?: RxNodeDecl<El<HTMLElement, M>>,
  preset?: RxNodeDecl<El<HTMLElement, M>>): RxNode<El<HTMLElement, M>> {
  return RxNode.acquire(Drivers.group, declaration, preset)
}

// Fragment

export function Handler<M = unknown>(
  update: Delegate<El<void, M>>): RxNode<El<void, M>> {
  return SyntheticElement({ mode: Mode.IndependentUpdate, update })
}

export function SyntheticElement<M = unknown>(
  declaration?: RxNodeDecl<El<void, M>>,
  preset?: RxNodeDecl<El<void, M>>): RxNode<El<void, M>> {
  return RxNode.acquire(Drivers.pseudo, declaration, preset)
}

// VerstakElementDriver

export class VerstakElementDriver<T extends HTMLElement> extends HtmlElementDriver<T> {
  update(node: RxNode<El<T>>): void | Promise<void> {
    const element = node.element
    // Add initial line feed automatically
    if (element.kind === ElKind.Section)
      startNewRow()
    return super.update(node)
  }
}

const Drivers = {
  // display: flex, flex-direction: column
  section: new VerstakElementDriver<HTMLElement>(Constants.element, false, el => el.kind = ElKind.Section),

  // display: grid
  table: new VerstakElementDriver<HTMLElement>(Constants.element, false, el => el.kind = ElKind.Table),

  // display: block
  note: new VerstakElementDriver<HTMLElement>(Constants.element, false, el => el.kind = ElKind.Note),

  // display: contents
  group: new VerstakElementDriver<HTMLElement>(Constants.group, false, el => el.kind = ElKind.Group),

  // display: flex/row or contents
  partition: new VerstakElementDriver<HTMLElement>(Constants.partition, true, el => el.kind = ElKind.Part),

  // cursor control element
  cursor: new CursorCommandDriver(),

  // (no element)
  pseudo: new ElDriver<HTMLElement>("pseudo", false, el => el.kind = ElKind.Group) as unknown as RxNodeDriver<El<void, any>>,
}
