/**
 * HTML/XML structural validation extras for Advanced PDF templates.
 */

import { TokenType } from '../parser/tokenTypes.js'
import { extractAttributes, extractId } from '../parser/htmlRules.js'

/**
 * @param {{ tokens: object[], source: string }} parseResult
 */
export function validateXml(parseResult) {
  const extra = []
  const { tokens, source } = parseResult
  if (!tokens) return extra

  let xmlDeclCount = 0
  const ids = new Map()
  let sawContentBeforeXml = false
  let firstNonWs = true

  for (const token of tokens) {
    if (token.type === TokenType.TEXT) {
      if (firstNonWs && token.raw.trim()) {
        sawContentBeforeXml = true
        firstNonWs = false
      }
      continue
    }

    if (token.type === TokenType.XML_DECL) {
      xmlDeclCount++
      if (xmlDeclCount > 1) {
        extra.push({
          severity: 'error',
          code: 'MULTI_XML_DECL',
          message: 'Más de una declaración XML',
          line: token.startLine,
          column: token.startColumn || 1,
          startOffset: token.startOffset,
          endOffset: token.endOffset,
          suggestion: 'Conserve una sola declaración <?xml ...?> al inicio del documento.'
        })
      }
      if (sawContentBeforeXml) {
        extra.push({
          severity: 'error',
          code: 'CONTENT_BEFORE_XML',
          message: 'Contenido antes de la declaración XML',
          line: token.startLine,
          column: token.startColumn || 1,
          startOffset: token.startOffset,
          endOffset: token.endOffset,
          suggestion: 'La declaración XML debe ser lo primero en el documento.'
        })
      }
      firstNonWs = false
      continue
    }

    if (
      token.type === TokenType.OPEN_TAG ||
      token.type === TokenType.SELF_CLOSING_TAG
    ) {
      firstNonWs = false
      // Unclosed attributes heuristic: odd number of quotes in tag
      const doubles = (token.raw.match(/"/g) || []).length
      const singles = (token.raw.match(/'/g) || []).length
      if (doubles % 2 !== 0 || singles % 2 !== 0) {
        extra.push({
          severity: 'error',
          code: 'UNCLOSED_ATTR',
          message: `Atributos posiblemente sin cerrar en <${token.name}>`,
          line: token.startLine,
          column: token.startColumn || 1,
          startOffset: token.startOffset,
          endOffset: token.endOffset,
          suggestion: 'Revise las comillas de los atributos.'
        })
      }

      const id = extractId(token.raw)
      if (id) {
        if (ids.has(id)) {
          extra.push({
            severity: 'warning',
            code: 'DUP_ID',
            message: `ID duplicado: "${id}"`,
            line: token.startLine,
            column: token.startColumn || 1,
            startOffset: token.startOffset,
            endOffset: token.endOffset,
            suggestion: 'Los atributos id deberían ser únicos en el documento.'
          })
        } else {
          ids.set(id, token)
        }
      }

      // Invalid self-closing structures already classified by tokenizer
      void extractAttributes
    }

    if (token.type === TokenType.CLOSE_TAG || token.type === TokenType.DOCTYPE) {
      firstNonWs = false
    }
  }

  // Structural unclosed/orphan tags are in parseResult.issues
  void source
  return extra
}
