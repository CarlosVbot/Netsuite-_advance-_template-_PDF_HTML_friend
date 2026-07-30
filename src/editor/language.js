/**
 * CodeMirror 6 language support for NetSuite Advanced PDF/HTML (mixed FTL).
 * Stream parser — no eval, CSP-safe.
 */

import { StreamLanguage } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

/**
 * Stream parser recognizing FreeMarker + HTML/XML + CSS-ish content.
 */
const netsuiteTemplateParser = {
  name: 'netsuite-ftl',
  startState() {
    return {
      inFmComment: false,
      inHtmlComment: false,
      inStyle: false,
      tagName: ''
    }
  },
  token(stream, state) {
    if (stream.sol()) {
      // nothing special
    }

    // FreeMarker comment
    if (state.inFmComment) {
      if (stream.match(/-->/)) {
        state.inFmComment = false
        return 'comment'
      }
      stream.next()
      return 'comment'
    }
    if (stream.match(/<#--/)) {
      state.inFmComment = true
      return 'comment'
    }

    // HTML comment
    if (state.inHtmlComment) {
      if (stream.match(/-->/)) {
        state.inHtmlComment = false
        return 'comment'
      }
      stream.next()
      return 'comment'
    }
    if (stream.match(/<!--/)) {
      state.inHtmlComment = true
      return 'comment'
    }

    // Interpolation ${...}
    if (stream.match(/\$\{/)) {
      let depth = 1
      let inS = false
      let inD = false
      while (!stream.eol() && depth > 0) {
        const ch = stream.next()
        if (inS) {
          if (ch === '\\') stream.next()
          else if (ch === "'") inS = false
          continue
        }
        if (inD) {
          if (ch === '\\') stream.next()
          else if (ch === '"') inD = false
          continue
        }
        if (ch === "'") inS = true
        else if (ch === '"') inD = true
        else if (ch === '{') depth++
        else if (ch === '}') depth--
      }
      return 'interpolation'
    }

    // FreeMarker / custom directives
    if (stream.match(/<\/?#@?[a-zA-Z_][\w.]*/)) {
      // rest of directive until >
      let inS = false
      let inD = false
      while (!stream.eol()) {
        const ch = stream.next()
        if (inS) {
          if (ch === '\\') stream.next()
          else if (ch === "'") inS = false
          continue
        }
        if (inD) {
          if (ch === '\\') stream.next()
          else if (ch === '"') inD = false
          continue
        }
        if (ch === "'") inS = true
        else if (ch === '"') inD = true
        else if (ch === '>') break
      }
      return 'fmDirective'
    }

    // XML declaration / doctype
    if (stream.match(/<\?xml[\s\S]*?\?>/i) || stream.match(/<!DOCTYPE[^>]*>/i)) {
      return 'meta'
    }

    // HTML/XML tags
    if (stream.match(/<\/?[a-zA-Z_][\w:.-]*/)) {
      const isClose = stream.current().startsWith('</')
      // attributes
      while (!stream.eol()) {
        stream.eatSpace()
        if (stream.match(/\/?>/)) break
        if (stream.match(/[a-zA-Z_:][\w:.-]*/)) {
          // attr name
          if (stream.match(/\s*=\s*/)) {
            if (stream.match(/"([^"\\]|\\.)*"/) || stream.match(/'([^'\\]|\\.)*'/)) {
              // string value
            } else {
              stream.match(/[^\s>]+/)
            }
          }
          continue
        }
        if (stream.next() === '>') break
      }
      return isClose ? 'tagClose' : 'tagName'
    }

    // NetSuite custom field IDs in text
    if (stream.match(/\b(custbody_|custcol_|custentity_|custitem_|custrecord_|custscript_|custpage_)[a-zA-Z0-9_]+/)) {
      return 'nsField'
    }

    // Strings
    if (stream.match(/"(?:[^"\\]|\\.)*"/) || stream.match(/'(?:[^'\\]|\\.)*'/)) {
      return 'string'
    }

    // Numbers
    if (stream.match(/\b\d+(\.\d+)?\b/)) {
      return 'number'
    }

    // Operators
    if (stream.match(/(==|!=|<=|>=|\?\?|\?\.|gt|gte|lt|lte|as|&&|\|\||!)/)) {
      return 'operator'
    }

    // CSS-ish property inside style content (heuristic)
    if (state.inStyle && stream.match(/[a-zA-Z-]+\s*:/)) {
      return 'cssProperty'
    }

    stream.next()
    return null
  },
  languageData: {
    commentTokens: { block: { open: '<!--', close: '-->' } },
    closeBrackets: { brackets: ['(', '[', '{', "'", '"'] }
  }
}

export const netsuiteTemplateLanguage = StreamLanguage.define(netsuiteTemplateParser)

/**
 * Highlight style mapping for stream tokens → Lezer tags.
 */
export function netsuiteHighlightStyleSpec() {
  return [
    { tag: t.comment, class: 'cm-comment' },
    { tag: t.string, class: 'cm-string' },
    { tag: t.number, class: 'cm-number' },
    { tag: t.operator, class: 'cm-operator' },
    { tag: t.meta, class: 'cm-meta' },
    { tag: t.tagName, class: 'cm-tag' },
    // stream token names map via tokenTable if needed
  ]
}

// Map stream token names to Lezer highlight tags
StreamLanguage.define // keep import used

export const tokenTable = {
  comment: t.comment,
  string: t.string,
  number: t.number,
  operator: t.operator,
  meta: t.meta,
  tagName: t.tagName,
  tagClose: t.tagName,
  fmDirective: t.keyword,
  interpolation: t.special(t.variableName),
  nsField: t.atom,
  cssProperty: t.propertyName
}

// Re-define with tokenTable for proper highlighting
export const netsuiteLanguage = StreamLanguage.define({
  ...netsuiteTemplateParser,
  tokenTable
})
