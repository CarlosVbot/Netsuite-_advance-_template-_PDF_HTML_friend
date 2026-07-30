/**
 * FreeMarker directive rules for Advanced PDF/HTML templates.
 */

/** Directives that open a block and require a matching close. */
export const FM_BLOCK_OPEN = new Set([
  'if',
  'list',
  'macro',
  'function',
  'compress',
  'attempt',
  'switch',
  'escape',
  'noescape',
  'noparse',
  't',
  'lt',
  'rt'
])

/** Intermediate directives that continue an open block (not independent roots). */
export const FM_INTERMEDIATE = new Set([
  'else',
  'elseif',
  'items',
  'sep',
  'recover',
  'case',
  'default',
  'break'
])

/** Self-closing / standalone directives (no end tag required). */
export const FM_SELF_CLOSING = new Set([
  'assign',
  'local',
  'global',
  'include',
  'import',
  'stop',
  'return',
  'break',
  'continue',
  'flush',
  'ftl',
  'setting',
  'nested',
  'visit',
  'recurse',
  'fallback'
])

/** Map of closing directive name -> opening directive name(s). */
export const FM_CLOSE_TO_OPEN = {
  if: ['if'],
  list: ['list'],
  macro: ['macro'],
  function: ['function'],
  compress: ['compress'],
  attempt: ['attempt'],
  switch: ['switch'],
  escape: ['escape'],
  noescape: ['noescape'],
  noparse: ['noparse'],
  t: ['t'],
  lt: ['lt'],
  rt: ['rt']
}

/**
 * Intermediate directives allowed inside which open blocks.
 * Used for validation and matching context.
 */
export const FM_INTERMEDIATE_PARENTS = {
  else: ['if', 'list'],
  elseif: ['if'],
  items: ['list'],
  sep: ['list'],
  recover: ['attempt'],
  case: ['switch'],
  default: ['switch'],
  break: ['switch', 'list']
}

/**
 * Extract FreeMarker directive name from raw token text.
 * e.g. "<#if x gt 0>" -> "if", "</#list>" -> "list", "<@foo>" -> "foo"
 */
export function extractFmDirectiveName(raw) {
  if (!raw) return ''
  const closeMatch = raw.match(/^<\/#(if|list|macro|function|compress|attempt|switch|escape|noescape|noparse|t|lt|rt)\b/i)
  if (closeMatch) return closeMatch[1].toLowerCase()

  const openMatch = raw.match(/^<#([a-zA-Z_][\w]*)/)
  if (openMatch) return openMatch[1].toLowerCase()

  const customClose = raw.match(/^<\/@([a-zA-Z_][\w.]*)/)
  if (customClose) return customClose[1]

  const customOpen = raw.match(/^<@([a-zA-Z_][\w.]*)/)
  if (customOpen) return customOpen[1]

  return ''
}

/**
 * Extract a short label/expression for structure tree display.
 * e.g. "<#if item.quantity gt 0>" -> "item.quantity gt 0"
 * e.g. "<#list record.item as item>" -> "record.item as item"
 * e.g. "<#macro header>" -> "header"
 */
export function extractFmLabel(raw, directiveName) {
  if (!raw) return directiveName || ''
  const name = directiveName || extractFmDirectiveName(raw)

  if (name === 'macro' || name === 'function') {
    const m = raw.match(/<#(?:macro|function)\s+([a-zA-Z_][\w]*)/i)
    return m ? m[1] : name
  }

  if (name === 'list') {
    const m = raw.match(/<#list\s+([\s\S]*?)(?:\s*\/?\s*>)/i)
    if (m) return m[1].replace(/\s+/g, ' ').trim()
  }

  if (name === 'if' || name === 'elseif') {
    const m = raw.match(/<#(?:else)?if\s+([\s\S]*?)(?:\s*\/?\s*>)/i)
    if (m) return m[1].replace(/\s+/g, ' ').trim()
  }

  if (name === 'assign' || name === 'local' || name === 'global') {
    const m = raw.match(/<#(?:assign|local|global)\s+([\s\S]*?)(?:\s*\/?\s*>)/i)
    if (m) return m[1].replace(/\s+/g, ' ').trim().slice(0, 60)
  }

  // custom directive
  if (raw.startsWith('<@')) {
    const m = raw.match(/<@([a-zA-Z_][\w.]*)/)
    return m ? m[1] : name
  }

  return name
}

export function isFmBlockOpen(name) {
  return FM_BLOCK_OPEN.has(String(name).toLowerCase())
}

export function isFmIntermediate(name) {
  return FM_INTERMEDIATE.has(String(name).toLowerCase())
}

export function isFmSelfClosing(name) {
  return FM_SELF_CLOSING.has(String(name).toLowerCase())
}
