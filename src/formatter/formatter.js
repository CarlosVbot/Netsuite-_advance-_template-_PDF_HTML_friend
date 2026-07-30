/**
 * Structural formatter for mixed FreeMarker + HTML/XML templates.
 * Preserves expressions, comments, macros, field IDs, CSS values.
 * Never mutates FreeMarker expressions or renames variables.
 */

import { parseTemplate } from '../parser/parser.js'
import { TokenType } from '../parser/tokenTypes.js'
import { resolveIndent, indentString, isSignificantText } from './indentation.js'
import { FORMAT_ERROR_MESSAGE } from '../utils/constants.js'

/**
 * Tokens that increase indent after them (block open).
 */
function isIndentOpen(token) {
  return (
    token.type === TokenType.FM_OPEN ||
    token.type === TokenType.FM_CUSTOM_OPEN ||
    token.type === TokenType.OPEN_TAG
  )
}

/**
 * Tokens that decrease indent before them (block close).
 */
function isIndentClose(token) {
  return (
    token.type === TokenType.FM_CLOSE ||
    token.type === TokenType.FM_CUSTOM_CLOSE ||
    token.type === TokenType.CLOSE_TAG
  )
}

/**
 * Intermediate directives (else, elseif, ...) sit at same level as their parent open.
 */
function isIntermediate(token) {
  return token.type === TokenType.FM_INTERMEDIATE
}

/**
 * Format source template.
 * @param {string} source
 * @param {{ indentStyle?: string }} options
 * @returns {{ formatted: string, parseResult: object, success: boolean, errorMessage?: string }}
 */
export function formatTemplate(source, options = {}) {
  const indentUnit = resolveIndent(options.indentStyle || '4spaces')
  const text = source == null ? '' : String(source)

  if (!text.trim()) {
    return {
      formatted: text,
      parseResult: parseTemplate(text),
      success: true
    }
  }

  try {
    const parseResult = parseTemplate(text)
    const { tokens } = parseResult
    const out = []
    let depth = 0
    let atLineStart = true
    let lastWasOpen = false
    let trailingNewlines = 0

    const writeIndent = () => {
      if (atLineStart && depth > 0) {
        out.push(indentString(depth, indentUnit))
      }
      atLineStart = false
      trailingNewlines = 0
    }

    const newline = () => {
      // Cap consecutive blank lines without O(n) joins
      if (trailingNewlines >= 2) {
        atLineStart = true
        return
      }
      out.push('\n')
      trailingNewlines++
      atLineStart = true
    }

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]

      if (token.type === TokenType.TEXT || token.type === TokenType.WHITESPACE) {
        const raw = token.raw
        // Pure whitespace between structural tokens → normalize to newlines handled by structure
        if (!isSignificantText(raw)) {
          // If original had newlines, preserve a single structural break if next is structural
          // We skip pure whitespace; structure tokens force their own newlines
          continue
        }

        // Significant text: preserve content, re-indent each line of multi-line text
        const lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
        for (let li = 0; li < lines.length; li++) {
          const line = lines[li]
          if (li > 0) newline()
          if (line.trim().length === 0) {
            // empty line inside text
            continue
          }
          writeIndent()
          // Preserve internal spaces of the line after trimming outer structural indent
          out.push(line.trim())
        }
        lastWasOpen = false
        continue
      }

      if (token.type === TokenType.HTML_COMMENT || token.type === TokenType.FM_COMMENT) {
        // Put comments on their own line(s)
        if (!atLineStart) newline()
        const lines = token.raw.replace(/\r\n/g, '\n').split('\n')
        for (let li = 0; li < lines.length; li++) {
          if (li > 0) newline()
          writeIndent()
          out.push(li === 0 ? lines[li].trimStart() : lines[li].trimStart())
        }
        newline()
        lastWasOpen = false
        continue
      }

      if (isIndentClose(token)) {
        depth = Math.max(0, depth - 1)
        if (!atLineStart) newline()
        writeIndent()
        out.push(token.raw.trim())
        newline()
        lastWasOpen = false
        continue
      }

      if (isIntermediate(token)) {
        // Same depth as open of parent — parent is currently depth (children indented)
        // Intermediate should be at parent open level = depth - 0 for open's children...
        // When we open a block we increase depth after writing open.
        // So intermediate should write at depth-1 visually? Actually:
        // <#if>  depth after open becomes 1 for children
        // <#else> should be at depth 0 (same as if)
        const interDepth = Math.max(0, depth - 0)
        // Wait: after open, depth++. Children at depth. Intermediate at parent level = depth-1? No:
        // Standard:
        // <#if>
        //     content   <- depth 1
        // <#else>       <- depth 0 (same as if)
        //     content
        // </#if>
        // So intermediate at max(0, depth-1) if we're inside the block... Actually after open we set depth=1.
        // Intermediate should use depth-1.
        const level = Math.max(0, depth > 0 ? depth - 1 : 0)
        // Simpler approach: intermediate written at current depth - 1
        if (!atLineStart) newline()
        if (atLineStart) {
          out.push(indentString(level, indentUnit))
          atLineStart = false
        }
        out.push(token.raw.trim())
        newline()
        lastWasOpen = false
        continue
      }

      if (isIndentOpen(token)) {
        if (!atLineStart) newline()
        writeIndent()
        out.push(token.raw.trim())
        newline()
        depth++
        lastWasOpen = true
        continue
      }

      // Self-closing, interpolations, xml decl, doctype, etc.
      if (
        token.type === TokenType.SELF_CLOSING_TAG ||
        token.type === TokenType.FM_SELF_CLOSING ||
        token.type === TokenType.FM_CUSTOM_SELF ||
        token.type === TokenType.XML_DECL ||
        token.type === TokenType.DOCTYPE
      ) {
        if (!atLineStart) newline()
        writeIndent()
        out.push(token.raw.trim())
        newline()
        lastWasOpen = false
        continue
      }

      if (token.type === TokenType.FM_INTERPOLATION) {
        // Prefer own line when at structural boundary
        if (atLineStart) {
          writeIndent()
          out.push(token.raw)
          newline()
        } else {
          out.push(token.raw)
          trailingNewlines = 0
        }
        lastWasOpen = false
        continue
      }

      // Fallback: write raw
      writeIndent()
      out.push(token.raw)
      trailingNewlines = 0
      lastWasOpen = false
    }

    let formatted = out.join('')
    // Light normalize (single pass)
    if (formatted.length && !formatted.endsWith('\n')) {
      formatted += '\n'
    }

    // Post-pass: inline interpolations that got isolated when they were part of simple table cells
    // Keep as-is for safety — readability is the goal.

    return {
      formatted,
      parseResult,
      success: true
    }
  } catch (err) {
    let parseResult
    try {
      parseResult = parseTemplate(text)
    } catch {
      parseResult = null
    }
    return {
      formatted: text,
      parseResult,
      success: false,
      errorMessage: FORMAT_ERROR_MESSAGE,
      cause: err && err.message ? err.message : String(err)
    }
  }
}

/**
 * Lightweight format used when parse is already available.
 */
export function formatFromParse(parseResult, options = {}) {
  if (!parseResult || !parseResult.source) {
    return formatTemplate('', options)
  }
  return formatTemplate(parseResult.source, options)
}
