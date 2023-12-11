// The below copyright notice and the license permission notice
// shall be included in all copies or substantial portions.
// Copyright (C) 2019-2024 Nezaboodka Software <contact@nezaboodka.com>
// License: https://raw.githubusercontent.com/nezaboodka/verstak/master/LICENSE
// By contributing, you agree that your contributions will be
// automatically licensed under the license referred above.

import { reactive, unobs, Transaction, options, Reentrance, Rx, LoggingOptions, MergeList, MergedItem, ObservableObject, raw, MemberOptions } from "reactronic"
import { Priority, Mode, RxNodeSpec, RxNodeDriver, SimpleDelegate, RxNode, RxNodeCtx } from "./RxNode.js"
import { emitLetters, getCallerInfo } from "./Utils.js"

// Verstak

export class Verstak {
  static readonly shortFrameDuration = 16 // ms
  static readonly longFrameDuration = 300 // ms
  static currentUpdatePriority = Priority.Realtime
  static frameDuration = Verstak.longFrameDuration

  static specify<T = undefined>(
    driver: RxNodeDriver<T>,
    spec?: RxNodeSpec<T>,
    preset?: RxNodeSpec<T>): T {
    let result: T
    // Normalize parameters
    if (spec)
      spec.preset = preset
    else
      spec = preset ?? {}
    let key = spec.key
    const owner = gCurrent?.instance
    if (owner) {
      // Lookup for existing node and check for coalescing separators
      let existing: MergedItem<RxNodeImpl> | undefined = undefined
      const children = owner.children
      // Coalesce multiple separators into single one, if any
      if (driver.isSeparator) {
        const last = children.lastMergedItem()
        if (last?.instance?.driver === driver)
          existing = last
      }
      // Reuse existing node or specify a new one
      existing ??= children.tryMergeAsExisting(key = key || generateKey(owner), undefined,
        "nested elements can be declared inside update function only")
      if (existing) {
        // Reuse existing node
        const node = existing.instance
        result = node.element
        if (node.driver !== driver && driver !== undefined)
          throw new Error(`changing element driver is not yet supported: "${node.driver.name}" -> "${driver?.name}"`)
        const exTriggers = node.spec.triggers
        if (triggersAreEqual(spec.triggers, exTriggers))
          spec.triggers = exTriggers // preserve triggers instance
        node.spec = spec
      }
      else {
        // Create new node
        const node = new RxNodeImpl(key || generateKey(owner), driver, spec, owner)
        node.slot = children.mergeAsAdded(node)
        result = node.element
      }
    }
    else {
      // Create new root node
      const node = new RxNodeImpl(key || "", driver, spec, owner)
      node.slot = MergeList.createItem(node)
      result = node.element
      triggerUpdate(node.slot)
    }
    return result
  }

  static get currentNode(): RxNode {
    if (gCurrent === undefined)
      throw new Error("current element is undefined")
    return gCurrent.instance
  }

  static triggerUpdate(element: { node: RxNode }, triggers: unknown): void {
    const el = element as { node: RxNodeImpl }
    const spec = el.node.spec
    if (!triggersAreEqual(triggers, spec.triggers)) {
      spec.triggers = triggers // remember new triggers
      triggerUpdate(el.node.slot!)
    }
  }

  static updateNestedTreesThenDo(action: (error: unknown) => void): void {
    runUpdateNestedTreesThenDo(undefined, action)
  }

  static getDefaultLoggingOptions(): LoggingOptions | undefined {
    return RxNodeImpl.logging
  }

  static setDefaultLoggingOptions(logging?: LoggingOptions): void {
    RxNodeImpl.logging = logging
  }
}

// BaseDriver

export abstract class BaseDriver<T extends { node: RxNode }> implements RxNodeDriver<T> {
  constructor(
    readonly name: string,
    readonly isSeparator: boolean,
    readonly predefine?: SimpleDelegate<T>) {
  }

  abstract create(node: RxNode<T>): T

  assign(element: T): void {
    assignUsingPresetChain(element, element.node.spec)
  }

  initialize(element: T): void {
    this.predefine?.(element)
    initializeUsingPresetChain(element, element.node.spec)
  }

  mount(element: T): void {
    // nothing to do by default
  }

  update(element: T): void | Promise<void> {
    updateUsingPresetChain(element, element.node.spec)
  }

  finalize(element: T, isLeader: boolean): boolean {
    finalizeUsingPresetChain(element, element.node.spec)
    return isLeader // treat children as finalization leaders as well
  }
}

// Utils

function generateKey(owner: RxNodeImpl): string {
  const n = owner.numerator++
  const lettered = emitLetters(n)
  let result: string
  if (Rx.isLogging)
    result = `·${getCallerInfo(lettered)}`
  else
    result = `·${lettered}`
  return result
}

function modeUsingPresetChain(spec?: RxNodeSpec<any>): Mode {
  return spec?.mode ?? (spec?.preset ? modeUsingPresetChain(spec?.preset) : Mode.Default)
}

// function specifyUsingPresetChain(element: unknown, spec: RxNodeSpec<any>): void {
//   const preset = spec.preset
//   const specify = spec.specify
//   if (specify)
//     specify(element, preset ? () => specifyUsingPresetChain(element, preset) : NOP)
//   else if (preset)
//     specifyUsingPresetChain(element, preset)
// }

function assignUsingPresetChain(element: unknown, spec: RxNodeSpec<any>): void {
  const preset = spec.preset
  const create = spec.create
  if (create)
    create(element, preset ? () => assignUsingPresetChain(element, preset) : NOP)
  else if (preset)
    assignUsingPresetChain(element, preset)
}

function initializeUsingPresetChain(element: unknown, spec: RxNodeSpec<any>): void {
  const preset = spec.preset
  const initialize = spec.initialize
  if (initialize)
    initialize(element, preset ? () => initializeUsingPresetChain(element, preset) : NOP)
  else if (preset)
    initializeUsingPresetChain(element, preset)
}

function updateUsingPresetChain(element: unknown, spec: RxNodeSpec<any>): void {
  const preset = spec.preset
  const update = spec.update
  if (update)
    update(element, preset ? () => updateUsingPresetChain(element, preset) : NOP)
  else if (preset)
    updateUsingPresetChain(element, preset)
}

function finalizeUsingPresetChain(element: unknown, spec: RxNodeSpec<any>): void {
  const preset = spec.preset
  const finalize = spec.finalize
  if (finalize)
    finalize(element, preset ? () => finalizeUsingPresetChain(element, preset) : NOP)
  else if (preset)
    finalizeUsingPresetChain(element, preset)
}

// SubTreeVariable

export class SubTreeVariable<T extends Object = Object> {
  readonly defaultValue: T | undefined

  constructor(defaultValue?: T) {
    this.defaultValue = defaultValue
  }

  set value(value: T) {
    RxNodeImpl.setSubTreeVariableValue(this, value)
  }

  get value(): T {
    return RxNodeImpl.useSubTreeVariableValue(this)
  }

  get valueOrUndefined(): T | undefined {
    return RxNodeImpl.tryUseSubTreeVariable(this)
  }
}

// RxNodeCtxImpl

class RxNodeCtxImpl<T extends Object = Object> extends ObservableObject implements RxNodeCtx<T> {
  @raw next: RxNodeCtxImpl<object> | undefined
  @raw variable: SubTreeVariable<T>
  value: T

  constructor(variable: SubTreeVariable<T>, value: T) {
    super()
    this.next = undefined
    this.variable = variable
    this.value = value
  }
}

// RxNodeImpl

class RxNodeImpl<T = any> implements RxNode<T> {
  // Static properties
  static logging: LoggingOptions | undefined = undefined
  static grandNodeCount: number = 0
  static disposableNodeCount: number = 0

  readonly key: string
  readonly driver: RxNodeDriver<T>
  spec: RxNodeSpec<T>
  readonly level: number
  readonly owner: RxNodeImpl
  readonly element: T
  host: RxNodeImpl
  readonly children: MergeList<RxNodeImpl>
  slot: MergedItem<RxNodeImpl<T>> | undefined
  stamp: number
  outer: RxNodeImpl
  context: RxNodeCtxImpl<any> | undefined
  numerator: number
  priority: Priority
  childrenShuffling: boolean

  constructor(
    key: string, driver: RxNodeDriver<T>,
    spec: Readonly<RxNodeSpec<T>>, owner: RxNodeImpl | undefined) {
    this.key = key
    this.driver = driver
    this.spec = spec
    if (owner) {
      const node = owner
      this.level = node.level + 1
      this.owner = owner
      this.outer = node.context ? owner : node.outer
    }
    else {
      this.level = 1
      this.owner = owner = this
      this.outer = this
    }
    this.element = driver.create(this)
    this.host = this // node is unmounted
    this.children = new MergeList<RxNodeImpl>(getNodeKey, true)
    this.slot = undefined
    this.stamp = Number.MAX_SAFE_INTEGER // empty
    this.context = undefined
    this.numerator = 0
    this.priority = Priority.Realtime
    this.childrenShuffling = false
    // Monitoring
    RxNodeImpl.grandNodeCount++
    if (this.has(Mode.PinpointUpdate))
      RxNodeImpl.disposableNodeCount++
  }

  get isInitialUpdate(): boolean { return this.stamp === 1 }

  get strictOrder(): boolean { return this.children.isStrict }
  set strictOrder(value: boolean) { this.children.isStrict = value }

  get isMoved(): boolean { return this.owner.children.isMoved(this.slot!) }

  has(mode: Mode): boolean {
    return (modeUsingPresetChain(this.spec) & mode) === mode
  }

  @reactive
  @options({
    reentrance: Reentrance.CancelPrevious,
    triggeringArgs: true,
    noSideEffects: false,
  })
  update(_triggers: unknown): void {
    // triggers parameter is used to enforce update by owner
    updateNow(this.slot!)
  }

  configureReactronic(options: Partial<MemberOptions>): MemberOptions {
    if (this.stamp < Number.MAX_SAFE_INTEGER - 1 || !this.has(Mode.PinpointUpdate))
      throw new Error("reactronic can be configured only for elements with pinpoint update mode and only inside initialize")
    return Rx.getReaction(this.update).configure(options)
  }

  static get curr(): MergedItem<RxNodeImpl> {
    if (!gCurrent)
      throw new Error("current element is undefined")
    return gCurrent
  }

  static tryUseSubTreeVariable<T extends Object>(variable: SubTreeVariable<T>): T | undefined {
    let node = RxNodeImpl.curr.instance
    while (node.context?.variable !== variable && node.owner !== node)
      node = node.outer.slot!.instance
    return node.context?.value as any // TODO: to get rid of any
  }

  static useSubTreeVariableValue<T extends Object>(variable: SubTreeVariable<T>): T {
    const result = RxNodeImpl.tryUseSubTreeVariable(variable) ?? variable.defaultValue
    if (!result)
      throw new Error("context doesn't exist")
    return result
  }

  static setSubTreeVariableValue<T extends Object>(variable: SubTreeVariable<T>, value: T | undefined): void {
    const node = RxNodeImpl.curr.instance
    const owner = node.owner
    const hostCtx = unobs(() => owner.context?.value)
    if (value && value !== hostCtx) {
      if (hostCtx)
        node.outer = owner
      else
        node.outer = owner.outer
      Transaction.run({ separation: true }, () => {
        const ctx = node.context
        if (ctx) {
          ctx.variable = variable
          ctx.value = value // update context thus invalidate observers
        }
        else
          node.context = new RxNodeCtxImpl<any>(variable, value)
      })
    }
    else if (hostCtx)
      node.outer = owner
    else
      node.outer = owner.outer
  }
}

// Internal

function getNodeKey(node: RxNode): string | undefined {
  return node.stamp >= 0 ? node.key : undefined
}

function runUpdateNestedTreesThenDo(error: unknown, action: (error: unknown) => void): void {
  const curr = RxNodeImpl.curr
  const owner = curr.instance
  const children = owner.children
  if (children.isMergeInProgress) {
    let promised: Promise<void> | undefined = undefined
    try {
      children.endMerge(error)
      // Finalize removed elements
      for (const slot of children.removedItems(true))
        triggerFinalization(slot, true, true)
      if (!error) {
        // Lay out and update actual elements
        const ownerIsSection = owner.element.isSection
        const sequential = children.isStrict
        let p1: Array<MergedItem<RxNodeImpl>> | undefined = undefined
        let p2: Array<MergedItem<RxNodeImpl>> | undefined = undefined
        let mounting = false
        let hostingRow = owner
        for (const item of children.items()) {
          if (Transaction.isCanceled)
            break
          const node = item.instance
          const el = node.element
          const isSeparator = el.node.driver.isSeparator
          const host = isSeparator ? owner : hostingRow
          const p = el.node.priority ?? Priority.Realtime
          mounting = markToMountIfNecessary(mounting, host, item, children, sequential)
          if (p === Priority.Realtime)
            triggerUpdate(item) // update synchronously
          else if (p === Priority.Normal)
            p1 = push(item, p1) // defer for P1 async update
          else
            p2 = push(item, p2) // defer for P2 async update
          if (ownerIsSection && isSeparator)
            hostingRow = node
        }
        // Update incremental children (if any)
        if (!Transaction.isCanceled && (p1 !== undefined || p2 !== undefined))
          promised = startIncrementalUpdate(curr, children, p1, p2).then(
            () => action(error),
            e => action(e))
      }
    }
    finally {
      if (!promised)
        action(error)
    }
  }
}

function markToMountIfNecessary(mounting: boolean, host: RxNodeImpl,
  slot: MergedItem<RxNodeImpl>, children: MergeList<RxNodeImpl>, sequential: boolean): boolean {
  // Detects element mounting when abstract elements
  // exist among regular elements having native HTML elements
  const node = slot.instance
  const el = node.element
  if (el.native && !node.has(Mode.ManualMount)) {
    if (mounting || node.host !== host) {
      children.markAsMoved(slot)
      mounting = false
    }
  }
  else if (sequential && children.isMoved(slot))
    mounting = true // apply to the first element having native HTML element
  node.host = host
  return mounting
}

async function startIncrementalUpdate(
  ownerSlot: MergedItem<RxNodeImpl>,
  allChildren: MergeList<RxNodeImpl>,
  priority1?: Array<MergedItem<RxNodeImpl>>,
  priority2?: Array<MergedItem<RxNodeImpl>>): Promise<void> {
  const stamp = ownerSlot.instance.stamp
  if (priority1)
    await updateIncrementally(ownerSlot, stamp, allChildren, priority1, Priority.Normal)
  if (priority2)
    await updateIncrementally(ownerSlot, stamp, allChildren, priority2, Priority.Background)
}

async function updateIncrementally(owner: MergedItem<RxNodeImpl>, stamp: number,
  allChildren: MergeList<RxNodeImpl>, items: Array<MergedItem<RxNodeImpl>>,
  priority: Priority): Promise<void> {
  await Transaction.requestNextFrame()
  const node = owner.instance
  if (!Transaction.isCanceled || !Transaction.isFrameOver(1, Verstak.shortFrameDuration / 3)) {
    let outerPriority = Verstak.currentUpdatePriority
    Verstak.currentUpdatePriority = priority
    try {
      if (node.childrenShuffling)
        shuffle(items)
      const frameDurationLimit = priority === Priority.Background ? Verstak.shortFrameDuration : Infinity
      let frameDuration = Math.min(frameDurationLimit, Math.max(Verstak.frameDuration / 4, Verstak.shortFrameDuration))
      for (const child of items) {
        triggerUpdate(child)
        if (Transaction.isFrameOver(1, frameDuration)) {
          Verstak.currentUpdatePriority = outerPriority
          await Transaction.requestNextFrame(0)
          outerPriority = Verstak.currentUpdatePriority
          Verstak.currentUpdatePriority = priority
          frameDuration = Math.min(4 * frameDuration, Math.min(frameDurationLimit, Verstak.frameDuration))
        }
        if (Transaction.isCanceled && Transaction.isFrameOver(1, Verstak.shortFrameDuration / 3))
          break
      }
    }
    finally {
      Verstak.currentUpdatePriority = outerPriority
    }
  }
}

function triggerUpdate(slot: MergedItem<RxNodeImpl>): void {
  const node = slot.instance
  if (node.stamp >= 0) { // if not finalized
    if (node.has(Mode.PinpointUpdate)) {
      if (node.stamp === Number.MAX_SAFE_INTEGER) {
        Transaction.outside(() => {
          if (Rx.isLogging)
            Rx.setLoggingHint(node.element, node.key)
          Rx.getReaction(node.update).configure({
            order: node.level,
          })
        })
      }
      unobs(node.update, node.spec.triggers) // reactive auto-update
    }
    else
      updateNow(slot)
  }
}

function mountOrRemountIfNecessary(node: RxNodeImpl): void {
  const element = node.element
  const driver = node.driver
  if (node.stamp === Number.MAX_SAFE_INTEGER) {
    node.stamp = Number.MAX_SAFE_INTEGER - 1 // initializing
    unobs(() => {
      driver.assign(element)
      driver.initialize(element)
      if (!node.has(Mode.ManualMount)) {
        node.stamp = 0 // mounting
        if (element.node.host !== element.node)
          driver.mount(element)
      }
      node.stamp = 0 // TEMPORARY
    })
  }
  else if (node.isMoved && !node.has(Mode.ManualMount) && element.node.host !== element.node)
    unobs(() => driver.mount(element))
}

function updateNow(slot: MergedItem<RxNodeImpl>): void {
  const node = slot.instance
  const el = node.element
  if (node.stamp >= 0) { // if element is alive
    let result: unknown = undefined
    runInside(slot, () => {
      mountOrRemountIfNecessary(node)
      if (node.stamp < Number.MAX_SAFE_INTEGER - 1) { // if mounted
        try {
          node.stamp++
          node.numerator = 0
          el.prepareForUpdate()
          node.children.beginMerge()
          const driver = node.driver
          result = driver.update(el)
          if (el.area === undefined && node.owner.element.isTable)
            el.area = undefined // automatic placement
          if (result instanceof Promise)
            result.then(
              v => { runUpdateNestedTreesThenDo(undefined, NOP); return v },
              e => { console.log(e); runUpdateNestedTreesThenDo(e ?? new Error("unknown error"), NOP) })
          else
            runUpdateNestedTreesThenDo(undefined, NOP)
        }
        catch(e: unknown) {
          runUpdateNestedTreesThenDo(e, NOP)
          console.log(`Update failed: ${node.key}`)
          console.log(`${e}`)
        }
      }
    })
  }
}

function triggerFinalization(slot: MergedItem<RxNodeImpl>, isLeader: boolean, individual: boolean): void {
  const node = slot.instance
  const el = node.element
  if (node.stamp >= 0) {
    const driver = node.driver
    if (individual && node.key !== node.spec.key && !driver.isSeparator)
      console.log(`WARNING: it is recommended to assign explicit key for conditional element in order to avoid unexpected side effects: ${node.key}`)
    node.stamp = ~node.stamp
    // Finalize element itself and remove it from collection
    const childrenAreLeaders = unobs(() => driver.finalize(el, isLeader))
    el.native = null
    el.controller = null
    if (node.has(Mode.PinpointUpdate)) {
      // Defer disposal if element is reactive (having pinpoint update mode)
      slot.aux = undefined
      const last = gLastToDispose
      if (last)
        gLastToDispose = last.aux = slot
      else
        gFirstToDispose = gLastToDispose = slot
      if (gFirstToDispose === slot)
        Transaction.run({ separation: "disposal", hint: `runDisposalLoop(initiator=${slot.instance.key})` }, () => {
          void runDisposalLoop().then(NOP, error => console.log(error))
        })
    }
    // Finalize children if any
    for (const slot of node.children.items())
      triggerFinalization(slot, childrenAreLeaders, false)
    RxNodeImpl.grandNodeCount--
  }
}

async function runDisposalLoop(): Promise<void> {
  await Transaction.requestNextFrame()
  let slot = gFirstToDispose
  while (slot !== undefined) {
    if (Transaction.isFrameOver(500, 5))
      await Transaction.requestNextFrame()
    Rx.dispose(slot.instance)
    slot = slot.aux
    RxNodeImpl.disposableNodeCount--
  }
  // console.log(`Element count: ${RxNodeImpl.grandNodeCount} totally (${RxNodeImpl.disposableNodeCount} disposable)`)
  gFirstToDispose = gLastToDispose = undefined // reset loop
}

// function forEachChildRecursively(slot: MergedItem<El>, action: (e: any) => void): void {
//   const el = slot.instance
//   const e = el.native
//   e && action(e)
//   for (const slot of el.children.items())
//     forEachChildRecursively(slot, action)
// }

function wrapToRunInside<T>(func: (...args: any[]) => T): (...args: any[]) => T {
  let wrappedToRunInside: (...args: any[]) => T
  const current = gCurrent
  if (current)
    wrappedToRunInside = (...args: any[]): T => {
      return runInside(current, func, ...args)
    }
  else
    wrappedToRunInside = func
  return wrappedToRunInside
}

function runInside<T>(slot: MergedItem<RxNodeImpl>, func: (...args: any[]) => T, ...args: any[]): T {
  const outer = gCurrent
  try {
    gCurrent = slot
    return func(...args)
  }
  finally {
    gCurrent = outer
  }
}

function triggersAreEqual(a1: any, a2: any): boolean {
  let result = a1 === a2
  if (!result) {
    if (Array.isArray(a1)) {
      result = Array.isArray(a2) &&
        a1.length === a2.length &&
        a1.every((t, i) => t === a2[i])
    }
    else if (a1 === Object(a1) && a2 === Object(a2)) {
      for (const p in a1) {
        result = a1[p] === a2[p]
        if (!result)
          break
      }
    }
  }
  return result
}

function push<T>(item: T, array: Array<T> | undefined): Array<T> {
  if (array == undefined)
    array = new Array<T>()
  array.push(item)
  return array
}

function shuffle<T>(array: Array<T>): Array<T> {
  const n = array.length - 1
  let i = n
  while (i >= 0) {
    const j = Math.floor(Math.random() * n)
    const t = array[i]
    array[i] = array[j]
    array[j] = t
    i--
  }
  return array
}

// Seamless support for asynchronous programming

const ORIGINAL_PROMISE_THEN = Promise.prototype.then

function reactronicDomHookedThen(this: any,
  resolve?: ((value: any) => any | PromiseLike<any>) | undefined | null,
  reject?: ((reason: any) => never | PromiseLike<never>) | undefined | null): Promise<any | never> {
  resolve = resolve ? wrapToRunInside(resolve) : defaultResolve
  reject = reject ? wrapToRunInside(reject) : defaultReject
  return ORIGINAL_PROMISE_THEN.call(this, resolve, reject)
}

function defaultResolve(value: any): any {
  return value
}

function defaultReject(error: any): never {
  throw error
}

Promise.prototype.then = reactronicDomHookedThen

// Globals

const NOP: any = (...args: any[]): void => { /* nop */ }

let gCurrent: MergedItem<RxNodeImpl> | undefined = undefined
let gFirstToDispose: MergedItem<RxNodeImpl> | undefined = undefined
let gLastToDispose: MergedItem<RxNodeImpl> | undefined = undefined