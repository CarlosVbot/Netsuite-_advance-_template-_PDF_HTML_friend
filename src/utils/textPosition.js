/**
 * Convert between offsets and line/column positions in text.
 * Lines and columns are 1-based for UI display.
 */

export function offsetToLineCol(text, offset) {
  const safe = Math.max(0, Math.min(offset, text.length))
  let line = 1
  let col = 1
  for (let i = 0; i < safe; i++) {
    if (text[i] === '\n') {
      line++
      col = 1
    } else {
      col++
    }
  }
  return { line, column: col }
}

export function lineColToOffset(text, line, column) {
  let currentLine = 1
  let i = 0
  while (i < text.length && currentLine < line) {
    if (text[i] === '\n') currentLine++
    i++
  }
  return Math.min(i + Math.max(0, column - 1), text.length)
}

export function getLineStartOffsets(text) {
  const starts = [0]
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') starts.push(i + 1)
  }
  return starts
}

export function countLines(text) {
  if (!text) return 0
  let n = 1
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') n++
  }
  return n
}

export function getLineContent(text, lineNumber) {
  const starts = getLineStartOffsets(text)
  const idx = lineNumber - 1
  if (idx < 0 || idx >= starts.length) return ''
  const start = starts[idx]
  const end = idx + 1 < starts.length ? starts[idx + 1] - 1 : text.length
  return text.slice(start, end)
}
