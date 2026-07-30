/**
 * NetSuite Advanced PDF/HTML conservative warnings.
 * These are recommendations, not hard failures.
 */

import { TokenType } from '../parser/tokenTypes.js'
import { NETSUITE_FIELD_PREFIXES, MAX_NESTING_WARNING } from '../utils/constants.js'

const CUSTOM_FIELD_RE = /\b(custbody_|custcol_|custentity_|custitem_|custrecord_|custscript_|custpage_)([a-zA-Z0-9_]+)?/g

/**
 * @param {{ tokens: object[], source: string, root: object }} parseResult
 */
export function validateNetsuite(parseResult) {
  const extra = []
  const { tokens, source } = parseResult
  if (!tokens || !source) return extra

  let maxDepth = 0
  let tableDepth = 0
  let maxTableDepth = 0
  const inlineCss = new Map()
  let styleCount = 0

  for (const token of tokens) {
    if (token.depth > maxDepth) maxDepth = token.depth

    if (token.type === TokenType.OPEN_TAG && token.name === 'table') {
      tableDepth++
      if (tableDepth > maxTableDepth) maxTableDepth = tableDepth
    }
    if (token.type === TokenType.CLOSE_TAG && token.name === 'table') {
      tableDepth = Math.max(0, tableDepth - 1)
    }

    // Script tags
    if (
      (token.type === TokenType.OPEN_TAG || token.type === TokenType.SELF_CLOSING_TAG) &&
      token.name === 'script'
    ) {
      extra.push({
        severity: 'warning',
        code: 'SCRIPT_TAG',
        message: 'Etiqueta <script> detectada (posiblemente no soportada en Advanced PDF)',
        line: token.startLine,
        column: token.startColumn || 1,
        startOffset: token.startOffset,
        endOffset: token.endOffset,
        suggestion: 'Advanced PDF/HTML de NetSuite no ejecuta JavaScript de forma fiable. Evite <script>.'
      })
    }

    // External resources / CDN / http
    if (
      token.type === TokenType.OPEN_TAG ||
      token.type === TokenType.SELF_CLOSING_TAG
    ) {
      const raw = token.raw
      if (/\bsrc\s*=\s*["']https?:\/\//i.test(raw) || /\bhref\s*=\s*["']https?:\/\//i.test(raw)) {
        if (/cdn\.|unpkg\.|jsdelivr|googleapis|cloudflare/i.test(raw)) {
          extra.push({
            severity: 'warning',
            code: 'CDN_REF',
            message: 'Posible referencia a CDN o recurso externo',
            line: token.startLine,
            column: token.startColumn || 1,
            startOffset: token.startOffset,
            endOffset: token.endOffset,
            suggestion: 'Los recursos remotos pueden no estar disponibles en el motor BFO de NetSuite.'
          })
        }
        if (/\bhttps?:\/\//i.test(raw) && /\bhttp:\/\//i.test(raw)) {
          extra.push({
            severity: 'warning',
            code: 'HTTP_RESOURCE',
            message: 'Recurso HTTP en lugar de HTTPS',
            line: token.startLine,
            column: token.startColumn || 1,
            startOffset: token.startOffset,
            endOffset: token.endOffset,
            suggestion: 'Prefiera HTTPS para recursos externos si son necesarios.'
          })
        }
      }

      // Account-specific URLs
      if (/system\.netsuite\.com|app\.netsuite\.com|\/app\/site\/|accountid=/i.test(raw)) {
        extra.push({
          severity: 'info',
          code: 'ACCOUNT_URL',
          message: 'Posible URL específica de cuenta de NetSuite',
          line: token.startLine,
          column: token.startColumn || 1,
          startOffset: token.startOffset,
          endOffset: token.endOffset,
          suggestion: 'Verifique que la URL no quede fija a un entorno o cuenta concretos.'
        })
      }

      // Inline style repetition
      const styleMatch = raw.match(/\bstyle\s*=\s*["']([^"']+)["']/i)
      if (styleMatch) {
        const css = styleMatch[1].trim()
        inlineCss.set(css, (inlineCss.get(css) || 0) + 1)
      }

      if (token.name === 'style') styleCount++

      // Font-family references (info)
      if (/font-family\s*:/i.test(raw) && /Arial|Helvetica|Times|Courier|sans-serif|serif/i.test(raw) === false) {
        if (/font-family\s*:\s*['"]?[^;'"]+/i.test(raw)) {
          // custom font name — soft info only when style attribute present
        }
      }
    }

    // TEXT and interpolations: custom fields, empty checks, record.item
    if (token.type === TokenType.FM_INTERPOLATION || token.type === TokenType.FM_OPEN || token.type === TokenType.TEXT) {
      const chunk = token.raw

      // Suspicious empty custom field suffix
      let m
      const re = new RegExp(CUSTOM_FIELD_RE.source, 'g')
      while ((m = re.exec(chunk)) !== null) {
        const full = m[0]
        const suffix = m[2]
        if (!suffix || suffix.length < 1) {
          extra.push({
            severity: 'warning',
            code: 'SUSPICIOUS_FIELD',
            message: `ID de campo personalizado sospechoso: ${full}`,
            line: token.startLine,
            column: (token.startColumn || 1) + m.index,
            startOffset: token.startOffset + m.index,
            endOffset: token.startOffset + m.index + full.length,
            suggestion: 'Compruebe que el ID del campo personalizado esté completo.'
          })
        }
      }

      // Empty variable reference patterns like ${} already handled
      // Possible empty values without ?? or ?has_content — very conservative
      if (token.type === TokenType.FM_INTERPOLATION) {
        const inner = chunk.slice(2, -1).trim()
        // ${record.foo} without default — only warn for bare optional-looking paths
        if (
          inner &&
          !inner.includes('??') &&
          !inner.includes('?has_content') &&
          !inner.includes('?string') &&
          /^[a-zA-Z_][\w.]*$/.test(inner) &&
          (inner.includes('cust') || inner.endsWith('.memo') || inner.includes('message'))
        ) {
          extra.push({
            severity: 'info',
            code: 'MISSING_NULL_CHECK',
            message: `Posible valor vacío sin comprobación: \${${inner}}`,
            line: token.startLine,
            column: token.startColumn || 1,
            startOffset: token.startOffset,
            endOffset: token.endOffset,
            suggestion: 'Considere usar ?? o ?has_content si el valor puede estar vacío.'
          })
        }
      }
    }

    // record.item misuse heuristics in list
    if (token.type === TokenType.FM_OPEN && token.name === 'list') {
      if (/record\.item\s+as\s+record/i.test(token.raw)) {
        extra.push({
          severity: 'warning',
          code: 'ITEM_AS_RECORD',
          message: 'Posible uso confuso de record.item (variable de iteración llamada "record")',
          line: token.startLine,
          column: token.startColumn || 1,
          startOffset: token.startOffset,
          endOffset: token.endOffset,
          suggestion: 'Use un nombre de variable como "item" o "line" en lugar de reutilizar "record".'
        })
      }
    }
  }

  if (maxDepth >= MAX_NESTING_WARNING) {
    extra.push({
      severity: 'warning',
      code: 'DEEP_NESTING',
      message: `Anidamiento profundo detectado (profundidad ≥ ${MAX_NESTING_WARNING})`,
      line: 1,
      column: 1,
      startOffset: 0,
      endOffset: 0,
      suggestion: 'Considere simplificar la estructura para facilitar el mantenimiento.'
    })
  }

  if (maxTableDepth >= 4) {
    extra.push({
      severity: 'warning',
      code: 'DEEP_TABLES',
      message: `Tablas anidadas profundamente (nivel ${maxTableDepth})`,
      line: 1,
      column: 1,
      startOffset: 0,
      endOffset: 0,
      suggestion: 'Las tablas muy anidadas pueden complicar el diseño en BFO/Advanced PDF.'
    })
  }

  for (const [css, count] of inlineCss) {
    if (count >= 5 && css.length > 10) {
      extra.push({
        severity: 'info',
        code: 'REPEATED_CSS',
        message: `CSS en línea repetido ${count} veces`,
        line: 1,
        column: 1,
        startOffset: 0,
        endOffset: 0,
        suggestion: 'Considere mover estilos repetidos a un bloque <style>.'
      })
      break
    }
  }

  // Fonts in style blocks
  const fontMatches = source.match(/@font-face|url\s*\(\s*['"]?https?:/gi)
  if (fontMatches) {
    extra.push({
      severity: 'info',
      code: 'EXTERNAL_FONT',
      message: 'Posible referencia a fuentes externas o @font-face',
      line: 1,
      column: 1,
      startOffset: 0,
      endOffset: 0,
      suggestion: 'Verifique que las fuentes estén disponibles en el motor de PDF de NetSuite.'
    })
  }

  void NETSUITE_FIELD_PREFIXES
  void styleCount
  return extra
}
