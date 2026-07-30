import { VOID_HTML_ELEMENTS } from '../utils/constants.js'

/**
 * HTML/XML helper rules for Advanced PDF templates.
 * NetSuite Advanced PDF is primarily XML-oriented, so void-element
 * handling is conservative.
 */

export function extractTagName(raw) {
  if (!raw) return ''
  // </tag>, <tag>, <tag ... />, <?xml ...?>
  const close = raw.match(/^<\/\s*([a-zA-Z_][\w:.-]*)/)
  if (close) return close[1].toLowerCase()
  const open = raw.match(/^<\s*([a-zA-Z_][\w:.-]*)/)
  if (open) return open[1].toLowerCase()
  if (raw.startsWith('<?xml')) return 'xml-declaration'
  if (raw.startsWith('<!DOCTYPE') || raw.startsWith('<!doctype')) return 'doctype'
  return ''
}

export function isSelfClosingRaw(raw) {
  if (!raw) return false
  return /\/\s*>$/.test(raw.trim())
}

export function isVoidElement(name) {
  return VOID_HTML_ELEMENTS.has(String(name).toLowerCase())
}

/**
 * Extract attributes as a simple map (best-effort, non-destructive).
 */
export function extractAttributes(raw) {
  const attrs = {}
  if (!raw) return attrs
  // strip tag name and trailing
  const inner = raw.replace(/^<\/?\s*[a-zA-Z_][\w:.-]*/, '').replace(/\/?\s*>$/, '')
  const re = /([a-zA-Z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g
  let m
  while ((m = re.exec(inner)) !== null) {
    attrs[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? ''
  }
  return attrs
}

export function extractId(raw) {
  const attrs = extractAttributes(raw)
  return attrs.id || null
}

/**
 * Tags that should open foldable/structure blocks.
 */
export function isStructuralHtmlTag(name) {
  const n = String(name).toLowerCase()
  return [
    'html', 'head', 'body', 'style', 'table', 'thead', 'tbody', 'tfoot',
    'tr', 'td', 'th', 'div', 'span', 'p', 'ul', 'ol', 'li', 'section',
    'header', 'footer', 'main', 'article', 'form', 'pdf', 'macrolist',
    'macro', 'barcode', 'link'
  ].includes(n)
}
