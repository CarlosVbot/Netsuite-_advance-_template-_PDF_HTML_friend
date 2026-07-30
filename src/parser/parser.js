/**
 * Stack-based structural parser for Advanced PDF/HTML templates.
 * Builds nesting, matching pairs, structure tree, and recoverable issues.
 */

import { tokenize } from './tokenizer.js'
import { TokenType, StructureKind } from './tokenTypes.js'
import {
  extractFmLabel,
  FM_INTERMEDIATE_PARENTS
} from './freemarkerRules.js'
import { isStructuralHtmlTag } from './htmlRules.js'
import { offsetToLineCol } from '../utils/textPosition.js'

/**
 * @typedef {object} StructureNode
 * @property {string} id
 * @property {string} kind
 * @property {string} name
 * @property {string} label
 * @property {number} startLine
 * @property {number} endLine
 * @property {number} startOffset
 * @property {number} endOffset
 * @property {number} depth
 * @property {number|null} tokenId
 * @property {StructureNode[]} children
 * @property {boolean} hasError
 */

function createRoot() {
  return {
    id: 'root',
    kind: StructureKind.ROOT,
    name: 'Template',
    label: 'Template',
    startLine: 1,
    endLine: 1,
    startOffset: 0,
    endOffset: 0,
    depth: 0,
    tokenId: null,
    children: [],
    hasError: false
  }
}

function kindForFm(name) {
  const n = String(name).toLowerCase()
  if (n === 'if' || n === 'elseif' || n === 'else') return StructureKind.CONDITION
  if (n === 'list' || n === 'items' || n === 'sep') return StructureKind.LIST
  if (n === 'macro') return StructureKind.MACRO
  if (n === 'function') return StructureKind.FUNCTION
  if (n === 'switch' || n === 'case' || n === 'default') return StructureKind.SWITCH
  if (n === 'attempt' || n === 'recover') return StructureKind.ATTEMPT
  if (n === 'compress') return StructureKind.COMPRESS
  if (n === 'escape' || n === 'noescape') return StructureKind.ESCAPE
  return StructureKind.FREEMARKER
}

function displayLabel(token) {
  if (
    token.type === TokenType.FM_OPEN ||
    token.type === TokenType.FM_INTERMEDIATE ||
    token.type === TokenType.FM_SELF_CLOSING
  ) {
    const expr = extractFmLabel(token.raw, token.name)
    if (token.name === 'macro' || token.name === 'function') {
      return `${token.name}: ${expr}`
    }
    if (token.name === 'list') return `list: ${expr}`
    if (token.name === 'if' || token.name === 'elseif') return `${token.name}: ${expr}`
    if (token.name === 'else') return 'else'
    return expr || token.name
  }
  if (token.type === TokenType.FM_CUSTOM_OPEN || token.type === TokenType.FM_CUSTOM_SELF) {
    return `@${token.name}`
  }
  if (token.type === TokenType.OPEN_TAG || token.type === TokenType.SELF_CLOSING_TAG) {
    return token.name
  }
  if (token.type === TokenType.FM_INTERPOLATION) {
    return token.label || '${...}'
  }
  return token.name || token.type
}

/**
 * Parse template source into tokens with matching + structure tree.
 * Always recovers from errors — never throws for bad input.
 * @param {string} source
 */
export function parseTemplate(source) {
  const text = source == null ? '' : String(source)
  const issues = []
  let tokens = []
  let tokenizeErrors = []

  try {
    const result = tokenize(text)
    tokens = result.tokens
    tokenizeErrors = result.errors || []
  } catch (e) {
    issues.push({
      severity: 'error',
      code: 'TOKENIZE_FAIL',
      message: 'Error al tokenizar la plantilla',
      line: 1,
      column: 1,
      suggestion: 'Revise caracteres no válidos al inicio del archivo.'
    })
    return {
      tokens: [],
      root: createRoot(),
      issues,
      summary: emptySummary(),
      pairs: new Map(),
      source: text
    }
  }

  for (const err of tokenizeErrors) {
    const pos = offsetToLineCol(text, err.startOffset || 0)
    issues.push({
      severity: err.severity || 'error',
      code: 'TOKENIZE',
      message: err.message,
      line: pos.line,
      column: pos.column,
      startOffset: err.startOffset,
      endOffset: err.endOffset,
      suggestion: 'Cierre el comentario o la directiva correctamente.'
    })
  }

  // Stack entries: { token, node, kind: 'html'|'fm'|'custom' }
  const stack = []
  const root = createRoot()
  root.endOffset = text.length
  let lineCount = 1
  for (let li = 0; li < text.length; li++) if (text[li] === '\n') lineCount++
  root.endLine = Math.max(1, lineCount)
  const pairs = new Map() // tokenId -> matchingTokenId
  const macroNames = new Map() // name -> first token id

  let nodeId = 0
  const newNode = (partial) => ({
    id: `n${++nodeId}`,
    kind: partial.kind || StructureKind.HTML,
    name: partial.name || '',
    label: partial.label || '',
    startLine: partial.startLine || 1,
    endLine: partial.endLine || partial.startLine || 1,
    startOffset: partial.startOffset || 0,
    endOffset: partial.endOffset || 0,
    depth: partial.depth || 0,
    tokenId: partial.tokenId ?? null,
    children: [],
    hasError: false
  })

  const currentParent = () => {
    if (stack.length === 0) return root
    return stack[stack.length - 1].node
  }

  const attachNode = (node) => {
    currentParent().children.push(node)
  }

  const openFmParents = () =>
    stack.filter((s) => s.kind === 'fm' || s.kind === 'custom').map((s) => s.token.name)

  for (const token of tokens) {
    token.depth = stack.length

    switch (token.type) {
      case TokenType.FM_OPEN: {
        const label = displayLabel(token)
        const node = newNode({
          kind: kindForFm(token.name),
          name: token.name,
          label,
          startLine: token.startLine,
          endLine: token.endLine,
          startOffset: token.startOffset,
          endOffset: token.endOffset,
          depth: stack.length,
          tokenId: token.id
        })
        attachNode(node)

        if (token.name === 'macro') {
          const m = token.raw.match(/<#macro\s+([a-zA-Z_][\w]*)/i)
          const macroName = m ? m[1] : ''
          if (!macroName) {
            issues.push(issueFromToken(token, 'error', 'EMPTY_MACRO', 'Nombre de macro vacío', 'Proporcione un nombre válido a la macro.'))
            node.hasError = true
          } else if (macroNames.has(macroName)) {
            issues.push(issueFromToken(token, 'error', 'DUP_MACRO', `Nombre de macro duplicado: ${macroName}`, 'Use un nombre único para cada macro.'))
            node.hasError = true
          } else {
            macroNames.set(macroName, token.id)
          }
        }

        stack.push({ token, node, kind: 'fm' })
        break
      }

      case TokenType.FM_INTERMEDIATE: {
        const parents = FM_INTERMEDIATE_PARENTS[token.name] || []
        const fmStack = stack.filter((s) => s.kind === 'fm')
        const topFm = fmStack.length ? fmStack[fmStack.length - 1] : null
        const topName = topFm ? topFm.token.name : null

        if (token.name === 'else') {
          if (!topName || !['if', 'list'].includes(topName)) {
            // allow if intermediate parent is if/list further? only immediate block context
            const ok = openFmParents().some((n) => n === 'if' || n === 'list')
            if (!ok) {
              issues.push(issueFromToken(token, 'error', 'ELSE_OUTSIDE', '<#else> fuera de un bloque if o list', 'Coloque <#else> dentro de <#if> o <#list>.'))
            }
          }
        } else if (token.name === 'elseif') {
          if (topName !== 'if' && !openFmParents().includes('if')) {
            issues.push(issueFromToken(token, 'error', 'ELSEIF_OUTSIDE', '<#elseif> fuera de un bloque if', 'Coloque <#elseif> dentro de <#if>.'))
          }
        } else if (token.name === 'recover') {
          if (topName !== 'attempt' && !openFmParents().includes('attempt')) {
            issues.push(issueFromToken(token, 'error', 'RECOVER_OUTSIDE', '<#recover> fuera de un bloque attempt', 'Coloque <#recover> dentro de <#attempt>.'))
          }
        } else if (token.name === 'case' || token.name === 'default') {
          if (topName !== 'switch' && !openFmParents().includes('switch')) {
            issues.push(issueFromToken(token, 'error', 'CASE_OUTSIDE', `<#${token.name}> fuera de un bloque switch`, 'Coloque la directiva dentro de <#switch>.'))
          }
        } else if (parents.length && topName && !parents.includes(topName)) {
          // soft check
          if (!openFmParents().some((n) => parents.includes(n))) {
            issues.push(issueFromToken(token, 'warning', 'INTERMEDIATE_CTX', `<#${token.name}> en un contexto inesperado`, 'Verifique el anidamiento de directivas FreeMarker.'))
          }
        }

        // Intermediate does not push a new root block; attach as leaf under current
        const node = newNode({
          kind: kindForFm(token.name),
          name: token.name,
          label: displayLabel(token),
          startLine: token.startLine,
          endLine: token.endLine,
          startOffset: token.startOffset,
          endOffset: token.endOffset,
          depth: stack.length,
          tokenId: token.id
        })
        attachNode(node)
        break
      }

      case TokenType.FM_CLOSE: {
        // Find matching open on stack (FM only)
        let matchIdx = -1
        for (let i = stack.length - 1; i >= 0; i--) {
          if (stack[i].kind === 'fm' && stack[i].token.name === token.name) {
            matchIdx = i
            break
          }
        }
        if (matchIdx === -1) {
          issues.push(issueFromToken(token, 'error', 'FM_CLOSE_ORPHAN', `Cierre sin bloque de apertura: </#${token.name}>`, 'Agregue la directiva de apertura correspondiente o elimine el cierre.'))
          token.matchingTokenId = null
        } else {
          // Pop everything above — report incorrect nesting
          while (stack.length - 1 > matchIdx) {
            const orphan = stack.pop()
            orphan.node.hasError = true
            issues.push(issueFromToken(orphan.token, 'error', 'NESTING', `Anidamiento incorrecto: <${orphan.kind === 'html' ? '' : '#'}${orphan.token.name}> no cerrado antes de </#${token.name}>`, 'Cierre los bloques en el orden correcto.'))
          }
          const openEntry = stack.pop()
          openEntry.node.endLine = token.endLine
          openEntry.node.endOffset = token.endOffset
          pairs.set(openEntry.token.id, token.id)
          pairs.set(token.id, openEntry.token.id)
          openEntry.token.matchingTokenId = token.id
          token.matchingTokenId = openEntry.token.id
        }
        break
      }

      case TokenType.FM_CUSTOM_OPEN: {
        const node = newNode({
          kind: StructureKind.CUSTOM,
          name: token.name,
          label: displayLabel(token),
          startLine: token.startLine,
          endLine: token.endLine,
          startOffset: token.startOffset,
          endOffset: token.endOffset,
          depth: stack.length,
          tokenId: token.id
        })
        attachNode(node)
        stack.push({ token, node, kind: 'custom' })
        break
      }

      case TokenType.FM_CUSTOM_CLOSE: {
        let matchIdx = -1
        for (let i = stack.length - 1; i >= 0; i--) {
          if (stack[i].kind === 'custom' && stack[i].token.name === token.name) {
            matchIdx = i
            break
          }
        }
        if (matchIdx === -1) {
          issues.push(issueFromToken(token, 'error', 'CUSTOM_CLOSE_ORPHAN', `Cierre de directiva personalizada sin apertura: </@${token.name}>`, 'Agregue <@' + token.name + '> o elimine el cierre.'))
        } else {
          while (stack.length - 1 > matchIdx) {
            const orphan = stack.pop()
            orphan.node.hasError = true
            issues.push(issueFromToken(orphan.token, 'error', 'NESTING', `Anidamiento incorrecto antes de </@${token.name}>`, 'Cierre los bloques en el orden correcto.'))
          }
          const openEntry = stack.pop()
          openEntry.node.endLine = token.endLine
          openEntry.node.endOffset = token.endOffset
          pairs.set(openEntry.token.id, token.id)
          pairs.set(token.id, openEntry.token.id)
          openEntry.token.matchingTokenId = token.id
          token.matchingTokenId = openEntry.token.id
        }
        break
      }

      case TokenType.FM_SELF_CLOSING:
      case TokenType.FM_CUSTOM_SELF: {
        const node = newNode({
          kind: token.type === TokenType.FM_CUSTOM_SELF ? StructureKind.CUSTOM : StructureKind.FREEMARKER,
          name: token.name,
          label: displayLabel(token),
          startLine: token.startLine,
          endLine: token.endLine,
          startOffset: token.startOffset,
          endOffset: token.endOffset,
          depth: stack.length,
          tokenId: token.id
        })
        attachNode(node)
        break
      }

      case TokenType.OPEN_TAG: {
        const isStyle = token.name === 'style'
        const node = newNode({
          kind: isStyle ? StructureKind.CSS : StructureKind.HTML,
          name: token.name,
          label: displayLabel(token),
          startLine: token.startLine,
          endLine: token.endLine,
          startOffset: token.startOffset,
          endOffset: token.endOffset,
          depth: stack.length,
          tokenId: token.id
        })
        // Only push structural tags; still track all for matching
        attachNode(node)
        stack.push({ token, node, kind: 'html' })
        break
      }

      case TokenType.CLOSE_TAG: {
        let matchIdx = -1
        for (let i = stack.length - 1; i >= 0; i--) {
          if (stack[i].kind === 'html' && stack[i].token.name === token.name) {
            matchIdx = i
            break
          }
        }
        if (matchIdx === -1) {
          issues.push(issueFromToken(token, 'error', 'HTML_CLOSE_ORPHAN', `Etiqueta de cierre sin apertura: </${token.name}>`, 'Agregue la etiqueta de apertura o elimine el cierre.'))
        } else {
          while (stack.length - 1 > matchIdx) {
            const orphan = stack.pop()
            orphan.node.hasError = true
            const openLabel =
              orphan.kind === 'fm'
                ? `<#${orphan.token.name}>`
                : orphan.kind === 'custom'
                  ? `<@${orphan.token.name}>`
                  : `<${orphan.token.name}>`
            issues.push(issueFromToken(orphan.token, 'error', 'NESTING', `Anidamiento incorrecto: ${openLabel} no cerrado antes de </${token.name}>`, 'Cierre los bloques en el orden correcto.'))
          }
          const openEntry = stack.pop()
          openEntry.node.endLine = token.endLine
          openEntry.node.endOffset = token.endOffset
          pairs.set(openEntry.token.id, token.id)
          pairs.set(token.id, openEntry.token.id)
          openEntry.token.matchingTokenId = token.id
          token.matchingTokenId = openEntry.token.id
        }
        break
      }

      case TokenType.SELF_CLOSING_TAG: {
        if (isStructuralHtmlTag(token.name) || token.name) {
          const node = newNode({
            kind: StructureKind.HTML,
            name: token.name,
            label: displayLabel(token),
            startLine: token.startLine,
            endLine: token.endLine,
            startOffset: token.startOffset,
            endOffset: token.endOffset,
            depth: stack.length,
            tokenId: token.id
          })
          attachNode(node)
        }
        break
      }

      case TokenType.FM_INTERPOLATION: {
        // optional leaf in tree — skip to reduce noise unless filter wants it
        break
      }

      default:
        break
    }
  }

  // Unclosed blocks remaining on stack
  while (stack.length) {
    const orphan = stack.pop()
    orphan.node.hasError = true
    const label =
      orphan.kind === 'fm'
        ? `<#${orphan.token.name}>`
        : orphan.kind === 'custom'
          ? `<@${orphan.token.name}>`
          : `<${orphan.token.name}>`
    issues.push(issueFromToken(orphan.token, 'error', 'UNCLOSED', `Bloque sin cierre: ${label}`, `Agregue la etiqueta de cierre correspondiente.`))
  }

  // Assign depths after matching (for formatter)
  recomputeDepths(tokens, pairs)

  const summary = buildSummary(tokens, issues, root)

  return {
    tokens,
    root,
    issues,
    summary,
    pairs,
    source: text
  }
}

function recomputeDepths(tokens, pairs) {
  // depth already set during parse as stack length at open; good enough for formatter
  void pairs
}

function issueFromToken(token, severity, code, message, suggestion) {
  return {
    severity,
    code,
    message,
    line: token.startLine,
    column: token.startColumn || 1,
    startOffset: token.startOffset,
    endOffset: token.endOffset,
    suggestion,
    tokenId: token.id
  }
}

function emptySummary() {
  return {
    conditions: 0,
    loops: 0,
    macros: 0,
    functions: 0,
    tags: 0,
    errors: 0,
    warnings: 0,
    info: 0
  }
}

function buildSummary(tokens, issues, root) {
  const summary = emptySummary()
  for (const t of tokens) {
    if (t.type === TokenType.FM_OPEN) {
      if (t.name === 'if') summary.conditions++
      if (t.name === 'list') summary.loops++
      if (t.name === 'macro') summary.macros++
      if (t.name === 'function') summary.functions++
    }
    if (
      t.type === TokenType.OPEN_TAG ||
      t.type === TokenType.SELF_CLOSING_TAG ||
      t.type === TokenType.CLOSE_TAG
    ) {
      summary.tags++
    }
  }
  for (const i of issues) {
    if (i.severity === 'error') summary.errors++
    else if (i.severity === 'warning') summary.warnings++
    else summary.info++
  }
  summary.rootChildren = root.children.length
  return summary
}

/**
 * Find the structural token at or containing a given offset.
 */
export function findTokenAtOffset(tokens, offset) {
  for (const t of tokens) {
    if (
      t.type === TokenType.TEXT ||
      t.type === TokenType.WHITESPACE ||
      t.type === TokenType.HTML_COMMENT ||
      t.type === TokenType.FM_COMMENT
    ) {
      continue
    }
    if (offset >= t.startOffset && offset < t.endOffset) return t
    // also allow cursor right at end of token
    if (offset === t.endOffset && offset === t.startOffset + t.raw.length) return t
  }
  // nearest structural token on same line preference handled by caller
  return null
}

/**
 * Build breadcrumb path from root to deepest node containing line.
 */
export function buildBreadcrumb(root, line) {
  const path = []
  function walk(node) {
    if (node.id !== 'root') {
      if (line >= node.startLine && line <= node.endLine) {
        path.push(node)
      } else {
        return
      }
    }
    for (const child of node.children) {
      walk(child)
    }
  }
  walk(root)
  // keep only the deepest chain (nested path)
  // Filter to nested sequence
  const chain = []
  for (const n of path) {
    if (!chain.length || (n.startLine >= chain[chain.length - 1].startLine && n.endLine <= chain[chain.length - 1].endLine)) {
      // if not descendant of last, may be sibling — keep deepest containing
      while (chain.length && !(n.startLine >= chain[chain.length - 1].startLine && n.endLine <= chain[chain.length - 1].endLine)) {
        // pop if not ancestor — actually path is DFS order so ancestors come first
        break
      }
      chain.push(n)
    }
  }
  // Better: DFS and track current path
  const result = []
  function dfs(node, trail) {
    const next = node.id === 'root' ? trail : [...trail, node]
    let best = next
    for (const child of node.children) {
      if (line >= child.startLine && line <= child.endLine) {
        const cand = dfs(child, next)
        if (cand.length > best.length) best = cand
      }
    }
    return best
  }
  return dfs(root, result)
}

/**
 * Get matching info message for a token.
 */
export function getMatchInfo(token, tokensById) {
  if (!token) return null
  if (!token.matchingTokenId) {
    const isClose =
      token.type === TokenType.FM_CLOSE ||
      token.type === TokenType.CLOSE_TAG ||
      token.type === TokenType.FM_CUSTOM_CLOSE
    return {
      matched: false,
      message: isClose ? 'Cierre sin bloque de apertura' : 'Bloque sin cierre',
      openLine: isClose ? null : token.startLine,
      closeLine: isClose ? token.startLine : null
    }
  }
  const other = tokensById.get(token.matchingTokenId)
  if (!other) {
    return { matched: false, message: 'Bloque sin cierre', openLine: token.startLine, closeLine: null }
  }
  const open = token.startOffset < other.startOffset ? token : other
  const close = token.startOffset < other.startOffset ? other : token
  return {
    matched: true,
    message: `Abre en línea ${open.startLine} · Cierra en línea ${close.startLine}`,
    openLine: open.startLine,
    closeLine: close.startLine
  }
}

export function tokensByIdMap(tokens) {
  const m = new Map()
  for (const t of tokens) m.set(t.id, t)
  return m
}
