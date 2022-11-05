// The below copyright notice and the license permission notice
// shall be included in all copies or substantial portions.
// Copyright (C) 2019-2022 Nezaboodka Software <contact@nezaboodka.com>
// License: https://raw.githubusercontent.com/nezaboodka/verstak/master/LICENSE
// By contributing, you agree that your contributions will be
// automatically licensed under the license referred above.

import { Block, Render, BlockOptions, BlockKind } from '../core/api'
import { HtmlDriver } from './HtmlDriver'

// Verstak is based on two fundamental layout structures
// called basic block and grid block; and on two special
// non-visual elements called line begin and group.

// Basic block is a layout structure, which children are
// layed out using left-to-right-and-top-to-bottom flow.

// Grid block is layout structure, which children are
// layed out over grid cells.

// Line begin is a special non-visual element, which
// begins new layout line inside block or grid block.

// Group is a special non-visual element for logical
// grouping of simple blocks, grid blocks and other groups.

// Simple Block

export function block<M = unknown, R = void>(name: string,
  options: BlockOptions<HTMLElement, M, R> | undefined,
  renderer: Render<HTMLElement, M, R>):
  Block<HTMLElement, M, R> {
  return Block.claim(name, options, renderer, VerstakTags.block)
}

// Grid Block

export function grid<M = unknown, R = void>(name: string,
  options: BlockOptions<HTMLElement, M, R> | undefined,
  renderer: Render<HTMLElement, M, R>):
  Block<HTMLElement, M, R> {
  return Block.claim(name, options, renderer, VerstakTags.grid)
}

// Line Begin

export function lb(spacing?: boolean): Block<HTMLElement> {
  return Block.claim('', undefined, NOP, VerstakTags.paragraph)
}

// Group

export function group<M = unknown, R = void>(name: string,
  options: BlockOptions<HTMLElement, M, R> | undefined,
  renderer: Render<HTMLElement, M, R>):
  Block<HTMLElement, M, R> {
  return Block.claim(name, options, renderer, VerstakTags.group)
}

// VerstakDriver

export class VerstakDriver<T extends HTMLElement> extends HtmlDriver<T> {
  render(block: Block<T>): void | Promise<void> {
    if (block.driver.kind === BlockKind.Block)
      lb() // automatic initial line begin for basic blocks
    return super.render(block)
  }
}

// VerstakTags

const VerstakTags = {
  // display: flex, flex-direction: column
  block: new VerstakDriver<HTMLElement>('v-block', BlockKind.Block),

  // display: grid
  grid: new VerstakDriver<HTMLElement>('v-grid', BlockKind.Grid),

  // display:
  //   - flex (row) if parent is regular block
  //   - contents if parent is grid
  paragraph: new VerstakDriver<HTMLElement>('v-paragraph', BlockKind.Paragraph),

  // display: contents
  group: new VerstakDriver<HTMLElement>('v-group', BlockKind.Group),
}

const NOP = (): void => { /* nop */ }
