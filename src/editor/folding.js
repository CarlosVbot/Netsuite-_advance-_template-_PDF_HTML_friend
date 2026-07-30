/**
 * Code folding ranges derived from parser structure.
 */

import { foldService } from '@codemirror/language'
import { TokenType } from '../parser/tokenTypes.js'

/**
 * Create a fold service that uses parse tokens with matching pairs.
 * @param {() => object|null} getParseResult - reactive getter for latest parse
 */
export function createFoldService(getParseResult) {
  return foldService.of((state, lineStart, lineEnd) => {
    const parse = getParseResult && getParseResult()
    if (!parse || !parse.tokens) return null

    const line = state.doc.lineAt(lineStart)
    const lineNumber = line.number

    for (const token of parse.tokens) {
      if (!token.matchingTokenId) continue
      if (token.startLine !== lineNumber) continue

      const isOpen =
        token.type === TokenType.FM_OPEN ||
        token.type === TokenType.FM_CUSTOM_OPEN ||
        token.type === TokenType.OPEN_TAG

      if (!isOpen) continue

      // Prefer foldable blocks
      const foldableFm = ['if', 'list', 'macro', 'function', 'switch', 'attempt', 'compress', 'escape', 'noescape']
      const foldableHtml = ['style', 'table', 'head', 'body', 'html', 'thead', 'tbody', 'div', 'pdf', 'macrolist']
      if (token.type === TokenType.FM_OPEN && !foldableFm.includes(token.name)) continue
      if (token.type === TokenType.OPEN_TAG && !foldableHtml.includes(token.name) && token.name.length > 0) {
        // still allow large blocks
      }

      const close = parse.tokens.find((t) => t.id === token.matchingTokenId)
      if (!close) continue
      if (close.startLine <= token.startLine) continue

      const from = token.endOffset
      const to = close.startOffset
      if (to <= from) continue

      // Map offsets if document differs slightly — use line-based fallback
      try {
        const docLen = state.doc.length
        const f = Math.min(from, docLen)
        const t = Math.min(to, docLen)
        if (t > f) return { from: f, to: t }
      } catch {
        return null
      }
    }
    return null
  })
}
