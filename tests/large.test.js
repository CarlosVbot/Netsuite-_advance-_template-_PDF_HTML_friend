import { describe, it, expect } from 'vitest'
import { formatTemplate } from '../src/formatter/formatter.js'
import { parseTemplate } from '../src/parser/parser.js'

describe('large template performance smoke', () => {
  it('handles multi-thousand line template', () => {
    const rows = []
    rows.push('<?xml version="1.0"?><pdf><body><table>')
    for (let i = 0; i < 2000; i++) {
      rows.push(`<#if item${i}.qty gt 0><tr><td>\${item${i}.name}</td><td>\${item${i}.qty}</td></tr></#if>`)
    }
    rows.push('</table></body></pdf>')
    const src = rows.join('')
    const t0 = Date.now()
    const parsed = parseTemplate(src)
    const { success, formatted } = formatTemplate(src)
    const ms = Date.now() - t0
    expect(parsed.tokens.length).toBeGreaterThan(1000)
    expect(success).toBe(true)
    expect(formatted.length).toBeGreaterThan(1000)
    // soft budget — should finish in reasonable time on CI
    expect(ms).toBeLessThan(15000)
  })
})
