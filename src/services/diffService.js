/**
 * Local line-based diff using the `diff` package (bundled, no CDN).
 */

import { diffLines } from 'diff'

/**
 * @param {string} original
 * @param {string} modified
 * @returns {{ parts: Array<{added?:boolean,removed?:boolean,value:string,lines:string[]}>, changes: Array<{type:string, leftLine:number, rightLine:number, text:string}> }}
 */
export function computeDiff(original, modified) {
  const left = original == null ? '' : String(original)
  const right = modified == null ? '' : String(modified)

  const parts = diffLines(left, right)
  const changes = []
  let leftLine = 1
  let rightLine = 1

  const enriched = parts.map((part) => {
    const lines = part.value.replace(/\n$/, '').split('\n')
    // diffLines keeps trailing newline semantics; empty last from trailing \n
    const lineList = part.value.endsWith('\n')
      ? part.value.slice(0, -1).split('\n')
      : part.value.split('\n')

    const entry = {
      added: !!part.added,
      removed: !!part.removed,
      value: part.value,
      lines: lineList,
      leftStart: leftLine,
      rightStart: rightLine
    }

    if (part.added) {
      for (let i = 0; i < lineList.length; i++) {
        changes.push({
          type: 'added',
          leftLine: null,
          rightLine: rightLine + i,
          text: lineList[i]
        })
      }
      rightLine += lineList.length
    } else if (part.removed) {
      for (let i = 0; i < lineList.length; i++) {
        changes.push({
          type: 'removed',
          leftLine: leftLine + i,
          rightLine: null,
          text: lineList[i]
        })
      }
      leftLine += lineList.length
    } else {
      leftLine += lineList.length
      rightLine += lineList.length
    }

    return entry
  })

  return { parts: enriched, changes }
}

/**
 * Build side-by-side rows for display.
 */
export function buildSideBySide(original, modified) {
  const { parts } = computeDiff(original, modified)
  const rows = []
  let leftLine = 1
  let rightLine = 1

  for (const part of parts) {
    if (!part.added && !part.removed) {
      for (const line of part.lines) {
        rows.push({
          type: 'same',
          leftLine: leftLine++,
          rightLine: rightLine++,
          leftText: line,
          rightText: line
        })
      }
    } else if (part.removed) {
      for (const line of part.lines) {
        rows.push({
          type: 'removed',
          leftLine: leftLine++,
          rightLine: null,
          leftText: line,
          rightText: ''
        })
      }
    } else if (part.added) {
      for (const line of part.lines) {
        rows.push({
          type: 'added',
          leftLine: null,
          rightLine: rightLine++,
          leftText: '',
          rightText: line
        })
      }
    }
  }

  // Pair adjacent remove+add as changed when possible (simple pass)
  const merged = []
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const n = rows[i + 1]
    if (r && n && r.type === 'removed' && n.type === 'added') {
      merged.push({
        type: 'changed',
        leftLine: r.leftLine,
        rightLine: n.rightLine,
        leftText: r.leftText,
        rightText: n.rightText
      })
      i++
    } else {
      merged.push(r)
    }
  }

  return merged
}
