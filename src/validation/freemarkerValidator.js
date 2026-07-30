/**
 * FreeMarker-specific validation rules.
 */

import { TokenType } from '../parser/tokenTypes.js'
import { FM_INTERMEDIATE_PARENTS } from '../parser/freemarkerRules.js'

/**
 * Additional FreeMarker checks on an already-parsed result.
 * Structural open/close matching is done in parser; this adds extras.
 * @param {{ tokens: object[], source: string, issues: object[] }} parseResult
 */
export function validateFreeMarker(parseResult) {
  const extra = []
  const { tokens, source } = parseResult
  if (!tokens) return extra

  const macroNames = new Map()

  for (const token of tokens) {
    // Incomplete interpolation already flagged in tokenizer
    if (token.type === TokenType.FM_INTERPOLATION) {
      const inner = token.raw.slice(2, token.raw.endsWith('}') ? -1 : undefined).trim()
      if (!inner) {
        extra.push({
          severity: 'warning',
          code: 'EMPTY_INTERPOLATION',
          message: 'Interpolación vacía ${}',
          line: token.startLine,
          column: token.startColumn || 1,
          startOffset: token.startOffset,
          endOffset: token.endOffset,
          suggestion: 'Agregue una expresión dentro de ${...} o elimine la interpolación.'
        })
      }
    }

    if (token.type === TokenType.FM_OPEN && token.name === 'macro') {
      const m = token.raw.match(/<#macro\s+([a-zA-Z_][\w]*)?/i)
      if (!m || !m[1]) {
        extra.push({
          severity: 'error',
          code: 'EMPTY_MACRO',
          message: 'Nombre de macro vacío',
          line: token.startLine,
          column: token.startColumn || 1,
          startOffset: token.startOffset,
          endOffset: token.endOffset,
          suggestion: 'Use <#macro nombreParametros> ... </#macro>.'
        })
      } else if (macroNames.has(m[1])) {
        extra.push({
          severity: 'error',
          code: 'DUP_MACRO',
          message: `Nombre de macro duplicado: ${m[1]}`,
          line: token.startLine,
          column: token.startColumn || 1,
          startOffset: token.startOffset,
          endOffset: token.endOffset,
          suggestion: 'Cada macro debe tener un nombre único.'
        })
      } else {
        macroNames.set(m[1], token)
      }
    }

    // Unclosed directive (no '>') — tokenizer may already catch
    if (
      (token.type === TokenType.FM_OPEN ||
        token.type === TokenType.FM_CLOSE ||
        token.type === TokenType.FM_INTERMEDIATE ||
        token.type === TokenType.FM_SELF_CLOSING) &&
      !token.raw.includes('>')
    ) {
      extra.push({
        severity: 'error',
        code: 'UNCLOSED_DIRECTIVE',
        message: 'Directiva FreeMarker sin cerrar con >',
        line: token.startLine,
        column: token.startColumn || 1,
        startOffset: token.startOffset,
        endOffset: token.endOffset,
        suggestion: 'Cierre la directiva con >.'
      })
    }

    // Use of > inside FreeMarker directive where gt may be safer (conservative)
    if (
      (token.type === TokenType.FM_OPEN || token.type === TokenType.FM_INTERMEDIATE) &&
      /<#(?:if|elseif|list)\b/.test(token.raw)
    ) {
      // Look for comparison operators that use raw > (excluding the closing >)
      const body = token.raw.replace(/^<#[a-zA-Z_]+/, '').replace(/>$/, '')
      // Heuristic: space > space or )> or word>digit patterns outside strings
      if (/(?:^|[^"'=])\s>\s/.test(body) || /[a-zA-Z0-9_)\]]\s*>\s*[a-zA-Z0-9_(]/.test(body)) {
        // Avoid false positive on /> and closing
        if (!body.includes('gt ') && !body.includes(' gte ')) {
          extra.push({
            severity: 'warning',
            code: 'GT_OPERATOR',
            message: 'Uso de ">" dentro de una directiva FreeMarker; "gt" puede ser más seguro',
            line: token.startLine,
            column: token.startColumn || 1,
            startOffset: token.startOffset,
            endOffset: token.endOffset,
            suggestion: 'Considere usar "gt" o "gte" en lugar de ">" para evitar ambigüedad con XML.'
          })
        }
      }
    }
  }

  // Unclosed FM comments already in parse issues
  void source
  void FM_INTERMEDIATE_PARENTS

  return extra
}
