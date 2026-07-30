/**
 * Aggregates validation from parser + specialized validators.
 */

import { parseTemplate } from '../parser/parser.js'
import { validateFreeMarker } from './freemarkerValidator.js'
import { validateXml } from './xmlValidator.js'
import { validateNetsuite } from './netsuiteValidator.js'

/**
 * Full validation of a template source.
 * @param {string} source
 * @param {{ parseResult?: object }} [options]
 */
export function validateTemplate(source, options = {}) {
  let parseResult = options.parseResult
  try {
    if (!parseResult) {
      parseResult = parseTemplate(source)
    }
  } catch {
    return {
      issues: [
        {
          severity: 'error',
          code: 'PARSE_FAIL',
          message: 'No se pudo analizar la plantilla',
          line: 1,
          column: 1,
          suggestion: 'Revise la sintaxis del documento.'
        }
      ],
      summary: {
        conditions: 0,
        loops: 0,
        macros: 0,
        functions: 0,
        tags: 0,
        errors: 1,
        warnings: 0,
        info: 0
      },
      parseResult: null
    }
  }

  const issues = [...(parseResult.issues || [])]

  try {
    issues.push(...validateFreeMarker(parseResult))
  } catch {
    /* never crash */
  }
  try {
    issues.push(...validateXml(parseResult))
  } catch {
    /* never crash */
  }
  try {
    issues.push(...validateNetsuite(parseResult))
  } catch {
    /* never crash */
  }

  // Deduplicate similar issues (same code + line + message)
  const seen = new Set()
  const unique = []
  for (const issue of issues) {
    const key = `${issue.code}|${issue.line}|${issue.message}`
    if (seen.has(key)) continue
    seen.add(key)
    unique.push({
      ...issue,
      id: `issue-${unique.length + 1}`
    })
  }

  // Sort: errors first, then warnings, then info; then by line
  const order = { error: 0, warning: 1, info: 2 }
  unique.sort((a, b) => {
    const sa = order[a.severity] ?? 9
    const sb = order[b.severity] ?? 9
    if (sa !== sb) return sa - sb
    return (a.line || 0) - (b.line || 0)
  })

  const summary = {
    ...(parseResult.summary || {}),
    errors: unique.filter((i) => i.severity === 'error').length,
    warnings: unique.filter((i) => i.severity === 'warning').length,
    info: unique.filter((i) => i.severity === 'info').length
  }

  return {
    issues: unique,
    summary,
    parseResult
  }
}

export function formatSummaryText(summary) {
  if (!summary) return ''
  const parts = [
    `${summary.conditions || 0} condiciones`,
    `${summary.loops || 0} ciclos`,
    `${summary.macros || 0} macros`,
    `${summary.tags || 0} etiquetas`,
    `${summary.errors || 0} errores`,
    `${summary.warnings || 0} advertencias`
  ]
  return parts.join(' · ')
}
