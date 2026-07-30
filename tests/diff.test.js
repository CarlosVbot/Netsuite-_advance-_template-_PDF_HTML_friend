import { describe, it, expect } from 'vitest'
import { computeDiff, buildSideBySide } from '../src/services/diffService.js'

describe('diff', () => {
  it('detects added and removed lines', () => {
    const a = 'line1\nline2\nline3\n'
    const b = 'line1\nlineX\nline3\nline4\n'
    const { changes } = computeDiff(a, b)
    expect(changes.some((c) => c.type === 'removed')).toBe(true)
    expect(changes.some((c) => c.type === 'added')).toBe(true)
  })

  it('side by side rows', () => {
    const rows = buildSideBySide('a\nb\n', 'a\nc\n')
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.some((r) => r.type === 'same' || r.type === 'changed' || r.type === 'removed' || r.type === 'added')).toBe(true)
  })

  it('identical texts produce only same rows', () => {
    const rows = buildSideBySide('x\ny\n', 'x\ny\n')
    expect(rows.every((r) => r.type === 'same')).toBe(true)
  })

  it('handles empty', () => {
    const rows = buildSideBySide('', 'hello')
    expect(rows.some((r) => r.type === 'added')).toBe(true)
  })
})
