import { INDENT_OPTIONS, DEFAULT_INDENT } from '../utils/constants.js'

/**
 * Resolve indent string from preference key.
 * @param {'2spaces'|'4spaces'|'tabs'|string} style
 */
export function resolveIndent(style) {
  if (style && INDENT_OPTIONS[style]) return INDENT_OPTIONS[style]
  if (style === '  ' || style === '    ' || style === '\t') return style
  return DEFAULT_INDENT
}

export function indentString(level, indentUnit) {
  if (level <= 0) return ''
  return indentUnit.repeat(level)
}

/**
 * Detect if a text segment should preserve internal whitespace
 * (e.g. content that is only significant spaces between tags is still reformatted
 * as structure whitespace; pure text content is left alone).
 */
export function isSignificantText(raw) {
  if (!raw) return false
  return raw.trim().length > 0
}
