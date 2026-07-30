/**
 * Highlight matching FreeMarker / HTML open-close blocks at cursor.
 */

import { EditorView, Decoration } from '@codemirror/view'
import { StateField, StateEffect } from '@codemirror/state'
import { TokenType } from '../parser/tokenTypes.js'
import { findTokenAtOffset, getMatchInfo, tokensByIdMap } from '../parser/parser.js'

export const setMatchParseEffect = StateEffect.define()

const matchMarkOpen = Decoration.mark({ class: 'cm-match-open' })
const matchMarkClose = Decoration.mark({ class: 'cm-match-close' })

/**
 * State field that stores latest parse result and computes match decorations.
 */
export const matchHighlightField = StateField.define({
  create() {
    return { parse: null, decos: Decoration.none }
  },
  update(value, tr) {
    let parse = value.parse
    for (const e of tr.effects) {
      if (e.is(setMatchParseEffect)) parse = e.value
    }
    if (!parse || !parse.tokens) {
      return { parse, decos: Decoration.none }
    }
    if (!tr.docChanged && !tr.selection && parse === value.parse && value.decos !== Decoration.none) {
      // still recompute on selection
    }
    if (!tr.selection && !tr.docChanged && parse === value.parse) {
      return value
    }

    const pos = tr.state.selection.main.head
    const token = findStructuralTokenNear(parse.tokens, pos, tr.state.doc.toString())
    if (!token || !token.matchingTokenId) {
      return { parse, decos: Decoration.none }
    }
    const byId = tokensByIdMap(parse.tokens)
    const other = byId.get(token.matchingTokenId)
    if (!other) return { parse, decos: Decoration.none }

    const open = token.startOffset <= other.startOffset ? token : other
    const close = token.startOffset <= other.startOffset ? other : token
    const docLen = tr.state.doc.length

    const ranges = []
    const oFrom = Math.min(open.startOffset, docLen)
    const oTo = Math.min(open.endOffset, docLen)
    const cFrom = Math.min(close.startOffset, docLen)
    const cTo = Math.min(close.endOffset, docLen)
    if (oTo > oFrom) ranges.push(matchMarkOpen.range(oFrom, oTo))
    if (cTo > cFrom) ranges.push(matchMarkClose.range(cFrom, cTo))
    ranges.sort((a, b) => a.from - b.from)

    return { parse, decos: Decoration.set(ranges) }
  },
  provide: (f) => EditorView.decorations.from(f, (v) => v.decos)
})

function findStructuralTokenNear(tokens, offset, _text) {
  const structural = new Set([
    TokenType.FM_OPEN,
    TokenType.FM_CLOSE,
    TokenType.FM_INTERMEDIATE,
    TokenType.FM_CUSTOM_OPEN,
    TokenType.FM_CUSTOM_CLOSE,
    TokenType.OPEN_TAG,
    TokenType.CLOSE_TAG
  ])

  // Exact hit
  for (const t of tokens) {
    if (!structural.has(t.type)) continue
    if (offset >= t.startOffset && offset <= t.endOffset) return t
  }

  // Prefer token ending just before cursor (common when caret after tag)
  let best = null
  for (const t of tokens) {
    if (!structural.has(t.type)) continue
    if (t.endOffset <= offset && (!best || t.endOffset > best.endOffset)) {
      best = t
    }
  }
  // only if close enough (same vicinity)
  if (best && offset - best.endOffset < 2) return best
  return findTokenAtOffset(tokens, offset)
}

/**
 * Get human-readable match info for status bar.
 */
export function matchInfoAtOffset(parseResult, offset) {
  if (!parseResult || !parseResult.tokens) return null
  const token = findStructuralTokenNear(parseResult.tokens, offset, parseResult.source)
  if (!token) return null
  const byId = tokensByIdMap(parseResult.tokens)
  return { token, info: getMatchInfo(token, byId) }
}
