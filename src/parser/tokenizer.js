/**
 * Lightweight tokenizer for NetSuite Advanced PDF/HTML templates.
 * Recognizes FreeMarker, HTML/XML, CSS, comments, and plain text.
 * Does not use eval / new Function. Recovers from invalid syntax.
 */

import { TokenType } from './tokenTypes.js'
import {
  extractFmDirectiveName,
  isFmBlockOpen,
  isFmIntermediate,
  isFmSelfClosing
} from './freemarkerRules.js'
import { extractTagName, isSelfClosingRaw, isVoidElement } from './htmlRules.js'

let _tokenId = 0
function nextId() {
  return ++_tokenId
}

/**
 * Incremental line/column tracker — O(1) amortized vs O(n) per offset lookup.
 */
function createLineTracker(text) {
  let line = 1
  let col = 1
  let pos = 0

  function advanceTo(offset) {
    const target = Math.max(0, Math.min(offset, text.length))
    if (target < pos) {
      // rewind only when needed (rare)
      line = 1
      col = 1
      pos = 0
    }
    while (pos < target) {
      if (text[pos] === '\n') {
        line++
        col = 1
      } else {
        col++
      }
      pos++
    }
    return { line, column: col }
  }

  function range(start, end) {
    const s = advanceTo(start)
    const e = end > start ? advanceTo(Math.max(start, end - 1)) : s
    // leave tracker at end for sequential tokens
    advanceTo(end)
    return {
      startLine: s.line,
      startColumn: s.column,
      endLine: e.line,
      endColumn: e.column
    }
  }

  return { range }
}

function makeToken(partial, text, tracker) {
  const start = partial.startOffset ?? 0
  const end = partial.endOffset ?? start
  const pos = tracker.range(start, end)
  return {
    id: nextId(),
    type: partial.type || TokenType.UNKNOWN,
    name: partial.name || '',
    raw: partial.raw ?? text.slice(start, end),
    startOffset: start,
    endOffset: end,
    startLine: pos.startLine,
    endLine: pos.endLine,
    startColumn: pos.startColumn,
    endColumn: pos.endColumn,
    depth: 0,
    matchingTokenId: null,
    label: partial.label || '',
    selfClosing: !!partial.selfClosing
  }
}

/**
 * Find matching close for nested FreeMarker/HTML-like braces in directives.
 * Handles quotes so > inside strings is not treated as end.
 */
function findDirectiveEnd(text, start) {
  // start points at '<'
  let i = start + 1
  let inSingle = false
  let inDouble = false
  while (i < text.length) {
    const ch = text[i]
    if (inSingle) {
      if (ch === '\\' && i + 1 < text.length) {
        i += 2
        continue
      }
      if (ch === "'") inSingle = false
      i++
      continue
    }
    if (inDouble) {
      if (ch === '\\' && i + 1 < text.length) {
        i += 2
        continue
      }
      if (ch === '"') inDouble = false
      i++
      continue
    }
    if (ch === "'") {
      inSingle = true
      i++
      continue
    }
    if (ch === '"') {
      inDouble = true
      i++
      continue
    }
    if (ch === '>') {
      return i + 1
    }
    i++
  }
  return text.length // unclosed — recover at EOF
}

/**
 * Find end of ${...} interpolation with nested braces and strings.
 */
function findInterpolationEnd(text, start) {
  // start points at '$'
  if (text[start + 1] !== '{') return start + 1
  let i = start + 2
  let depth = 1
  let inSingle = false
  let inDouble = false
  while (i < text.length && depth > 0) {
    const ch = text[i]
    if (inSingle) {
      if (ch === '\\' && i + 1 < text.length) {
        i += 2
        continue
      }
      if (ch === "'") inSingle = false
      i++
      continue
    }
    if (inDouble) {
      if (ch === '\\' && i + 1 < text.length) {
        i += 2
        continue
      }
      if (ch === '"') inDouble = false
      i++
      continue
    }
    if (ch === "'") {
      inSingle = true
      i++
      continue
    }
    if (ch === '"') {
      inDouble = true
      i++
      continue
    }
    if (ch === '{') depth++
    else if (ch === '}') depth--
    i++
  }
  return i
}

/**
 * Find end of HTML comment <!-- ... -->
 */
function findHtmlCommentEnd(text, start) {
  const idx = text.indexOf('-->', start + 4)
  return idx === -1 ? text.length : idx + 3
}

/**
 * Find end of FreeMarker comment <#-- ... -->
 */
function findFmCommentEnd(text, start) {
  const idx = text.indexOf('-->', start + 4)
  return idx === -1 ? text.length : idx + 3
}

/**
 * Tokenize a FreeMarker/custom directive starting at `start` ('<').
 */
function tokenizeFmOrCustom(text, start, tracker) {
  const end = findDirectiveEnd(text, start)
  const raw = text.slice(start, end)
  const selfClosing = /\/\s*>$/.test(raw)

  // Custom user directive <@name> or </@name>
  if (raw.startsWith('</@')) {
    const name = extractFmDirectiveName(raw)
    return makeToken(
      {
        type: TokenType.FM_CUSTOM_CLOSE,
        name,
        raw,
        startOffset: start,
        endOffset: end,
        label: name
      },
      text,
      tracker
    )
  }
  if (raw.startsWith('<@')) {
    const name = extractFmDirectiveName(raw)
    return makeToken(
      {
        type: selfClosing ? TokenType.FM_CUSTOM_SELF : TokenType.FM_CUSTOM_OPEN,
        name,
        raw,
        startOffset: start,
        endOffset: end,
        selfClosing,
        label: name
      },
      text,
      tracker
    )
  }

  // Closing FreeMarker </#name>
  if (raw.startsWith('</#') || raw.startsWith('</#')) {
    const name = extractFmDirectiveName(raw)
    return makeToken(
      {
        type: TokenType.FM_CLOSE,
        name,
        raw,
        startOffset: start,
        endOffset: end,
        label: name
      },
      text,
      tracker
    )
  }

  // Opening / intermediate / self-closing <#name>
  const name = extractFmDirectiveName(raw)
  let type = TokenType.FM_OPEN
  if (selfClosing || isFmSelfClosing(name)) {
    if (selfClosing || isFmSelfClosing(name)) {
      type = TokenType.FM_SELF_CLOSING
    }
  }
  if (isFmIntermediate(name) && !selfClosing) {
    type = TokenType.FM_INTERMEDIATE
  } else if (isFmBlockOpen(name) && !selfClosing) {
    type = TokenType.FM_OPEN
  } else if (isFmSelfClosing(name)) {
    type = TokenType.FM_SELF_CLOSING
  } else if (!isFmBlockOpen(name) && !isFmIntermediate(name)) {
    type = selfClosing ? TokenType.FM_SELF_CLOSING : TokenType.FM_OPEN
  }

  return makeToken(
    {
      type,
      name,
      raw,
      startOffset: start,
      endOffset: end,
      selfClosing: type === TokenType.FM_SELF_CLOSING,
      label: name
    },
    text,
    tracker
  )
}

/**
 * Tokenize HTML/XML tag starting at `start`.
 */
function tokenizeHtmlTag(text, start, tracker) {
  const end = findDirectiveEnd(text, start)
  const raw = text.slice(start, end)

  if (raw.startsWith('<?xml') || raw.startsWith('<?XML')) {
    return makeToken(
      {
        type: TokenType.XML_DECL,
        name: 'xml-declaration',
        raw,
        startOffset: start,
        endOffset: end,
        selfClosing: true
      },
      text,
      tracker
    )
  }
  if (/^<!DOCTYPE/i.test(raw)) {
    return makeToken(
      {
        type: TokenType.DOCTYPE,
        name: 'doctype',
        raw,
        startOffset: start,
        endOffset: end,
        selfClosing: true
      },
      text,
      tracker
    )
  }

  const name = extractTagName(raw)
  if (raw.startsWith('</')) {
    return makeToken(
      {
        type: TokenType.CLOSE_TAG,
        name,
        raw,
        startOffset: start,
        endOffset: end
      },
      text,
      tracker
    )
  }

  const selfClose = isSelfClosingRaw(raw) || isVoidElement(name)
  return makeToken(
    {
      type: selfClose ? TokenType.SELF_CLOSING_TAG : TokenType.OPEN_TAG,
      name,
      raw,
      startOffset: start,
      endOffset: end,
      selfClosing: selfClose
    },
    text,
    tracker
  )
}

/**
 * Tokenize full template source into an array of tokens.
 * @param {string} source
 * @returns {{ tokens: object[], errors: object[] }}
 */
export function tokenize(source) {
  _tokenId = 0
  const text = source == null ? '' : String(source)
  const tokens = []
  const errors = []
  const tracker = createLineTracker(text)
  let i = 0
  let textStart = 0

  const flushText = (end) => {
    if (end > textStart) {
      const raw = text.slice(textStart, end)
      tokens.push(
        makeToken(
          {
            type: TokenType.TEXT,
            name: '',
            raw,
            startOffset: textStart,
            endOffset: end
          },
          text,
          tracker
        )
      )
    }
  }

  while (i < text.length) {
    // FreeMarker comment <#--
    if (text.startsWith('<#--', i)) {
      flushText(i)
      const end = findFmCommentEnd(text, i)
      const raw = text.slice(i, end)
      tokens.push(
        makeToken(
          {
            type: TokenType.FM_COMMENT,
            name: 'comment',
            raw,
            startOffset: i,
            endOffset: end
          },
          text,
          tracker
        )
      )
      if (end >= text.length && !raw.endsWith('-->')) {
        errors.push({
          severity: 'error',
          message: 'Comentario FreeMarker sin cerrar',
          startOffset: i,
          endOffset: end
        })
      }
      i = end
      textStart = i
      continue
    }

    // HTML comment <!--
    if (text.startsWith('<!--', i)) {
      flushText(i)
      const end = findHtmlCommentEnd(text, i)
      const raw = text.slice(i, end)
      tokens.push(
        makeToken(
          {
            type: TokenType.HTML_COMMENT,
            name: 'comment',
            raw,
            startOffset: i,
            endOffset: end
          },
          text,
          tracker
        )
      )
      if (end >= text.length && !raw.endsWith('-->')) {
        errors.push({
          severity: 'error',
          message: 'Comentario HTML sin cerrar',
          startOffset: i,
          endOffset: end
        })
      }
      i = end
      textStart = i
      continue
    }

    // FreeMarker directive <# or </#
    if (text.startsWith('<#', i) || text.startsWith('</#', i)) {
      flushText(i)
      const tok = tokenizeFmOrCustom(text, i, tracker)
      tokens.push(tok)
      if (!tok.raw.includes('>')) {
        errors.push({
          severity: 'error',
          message: 'Directiva FreeMarker sin cerrar',
          startOffset: tok.startOffset,
          endOffset: tok.endOffset
        })
      }
      i = tok.endOffset
      textStart = i
      continue
    }

    // Custom FreeMarker directive <@ or </@
    if (text.startsWith('<@', i) || text.startsWith('</@', i)) {
      flushText(i)
      const tok = tokenizeFmOrCustom(text, i, tracker)
      tokens.push(tok)
      i = tok.endOffset
      textStart = i
      continue
    }

    // Interpolation ${
    if (text[i] === '$' && text[i + 1] === '{') {
      flushText(i)
      const end = findInterpolationEnd(text, i)
      const raw = text.slice(i, end)
      tokens.push(
        makeToken(
          {
            type: TokenType.FM_INTERPOLATION,
            name: 'interpolation',
            raw,
            startOffset: i,
            endOffset: end,
            label: raw.slice(2, raw.endsWith('}') ? -1 : undefined).trim()
          },
          text,
          tracker
        )
      )
      if (!raw.endsWith('}')) {
        errors.push({
          severity: 'error',
          message: 'Interpolación FreeMarker posiblemente incompleta',
          startOffset: i,
          endOffset: end
        })
      }
      i = end
      textStart = i
      continue
    }

    // HTML/XML tag
    if (text[i] === '<') {
      const next = text[i + 1]
      if (next && (/[a-zA-Z_!/?]/.test(next) || next === '/')) {
        flushText(i)
        const tok = tokenizeHtmlTag(text, i, tracker)
        tokens.push(tok)
        i = tok.endOffset
        textStart = i
        continue
      }
    }

    i++
  }

  flushText(text.length)
  return { tokens, errors }
}

export { TokenType }
