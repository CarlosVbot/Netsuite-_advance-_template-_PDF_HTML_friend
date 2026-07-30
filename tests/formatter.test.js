import { describe, it, expect } from 'vitest'
import { formatTemplate } from '../src/formatter/formatter.js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixture = (name) => readFileSync(resolve(__dirname, 'fixtures', name), 'utf-8')

describe('formatter', () => {
  it('formats nested list/if/html example', () => {
    const src = '<#list record.item as item><#if item.quantity gt 0><tr><td>${item.item}</td></tr></#if></#list>'
    const { formatted, success } = formatTemplate(src, { indentStyle: '4spaces' })
    expect(success).toBe(true)
    expect(formatted).toContain('<#list record.item as item>')
    expect(formatted).toContain('    <#if item.quantity gt 0>')
    expect(formatted).toContain('        <tr>')
    expect(formatted).toContain('            <td>')
    expect(formatted).toContain('${item.item}')
    expect(formatted).toContain('    </#if>')
    expect(formatted).toContain('</#list>')
  })

  it('does not rename variables or field IDs', () => {
    const src = '<p>${record.custbody_my_field}</p>'
    const { formatted } = formatTemplate(src)
    expect(formatted).toContain('custbody_my_field')
  })

  it('preserves FreeMarker expressions', () => {
    const src = '<#if item.quantity gt 0 && item.rate gte 1>${item.amount?string("#,##0.00")}</#if>'
    const { formatted } = formatTemplate(src)
    expect(formatted).toContain('item.quantity gt 0 && item.rate gte 1')
    expect(formatted).toContain('?string("#,##0.00")')
  })

  it('preserves comments', () => {
    const src = '<#-- keep me --><p>x</p><!-- html -->'
    const { formatted } = formatTemplate(src)
    expect(formatted).toContain('<#-- keep me -->')
    expect(formatted).toContain('<!-- html -->')
  })

  it('preserves XML declaration', () => {
    const src = '<?xml version="1.0"?><pdf><body/></pdf>'
    const { formatted } = formatTemplate(src)
    expect(formatted.startsWith('<?xml version="1.0"?>')).toBe(true)
  })

  it('supports 2 spaces and tabs', () => {
    const src = '<#if x><p>a</p></#if>'
    const two = formatTemplate(src, { indentStyle: '2spaces' }).formatted
    const tabs = formatTemplate(src, { indentStyle: 'tabs' }).formatted
    expect(two).toContain('  <p>')
    expect(tabs).toContain('\t<p>')
  })

  it('formats invoice fixture', () => {
    const { success, formatted } = formatTemplate(fixture('simple-invoice.ftl'))
    expect(success).toBe(true)
    expect(formatted.length).toBeGreaterThan(50)
  })

  it('formats nested fixture', () => {
    const { formatted } = formatTemplate(fixture('nested-list-if.ftl'))
    expect(formatted.split('\n').length).toBeGreaterThan(3)
  })

  it('handles malformed without crashing and keeps original on failure path', () => {
    const src = fixture('malformed-mixed.ftl')
    const result = formatTemplate(src)
    expect(result.formatted).toBeTruthy()
    expect(result.parseResult).toBeTruthy()
  })

  it('empty input', () => {
    const { formatted, success } = formatTemplate('')
    expect(success).toBe(true)
    expect(formatted).toBe('')
  })

  it('preserves macros', () => {
    const { formatted } = formatTemplate(fixture('macros.ftl'))
    expect(formatted).toContain('<#macro header')
    expect(formatted).toContain('</#macro>')
  })
})
