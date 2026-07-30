import { describe, it, expect } from 'vitest'
import { parseTemplate, buildBreadcrumb, getMatchInfo, tokensByIdMap } from '../src/parser/parser.js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixture = (name) => readFileSync(resolve(__dirname, 'fixtures', name), 'utf-8')

describe('parser FreeMarker block matching', () => {
  it('matches if/list open and close', () => {
    const src = '<#list record.item as item><#if item.quantity gt 0>x</#if></#list>'
    const { tokens, issues } = parseTemplate(src)
    const listOpen = tokens.find((t) => t.raw.startsWith('<#list'))
    const listClose = tokens.find((t) => t.raw.startsWith('</#list>'))
    expect(listOpen).toBeTruthy()
    expect(listClose).toBeTruthy()
    expect(listOpen.matchingTokenId).toBe(listClose.id)
    expect(listClose.matchingTokenId).toBe(listOpen.id)
    expect(issues.filter((i) => i.severity === 'error').length).toBe(0)
  })

  it('reports orphan close', () => {
    const { issues } = parseTemplate('</#if>')
    expect(issues.some((i) => i.message.includes('Cierre sin bloque') || i.code === 'FM_CLOSE_ORPHAN')).toBe(true)
  })

  it('reports unclosed block', () => {
    const { issues } = parseTemplate('<#if x>hello')
    expect(issues.some((i) => i.code === 'UNCLOSED' || i.message.includes('sin cierre'))).toBe(true)
  })

  it('understands else inside if', () => {
    const { issues } = parseTemplate('<#if a>1<#else>2</#if>')
    expect(issues.filter((i) => i.code === 'ELSE_OUTSIDE').length).toBe(0)
  })

  it('flags else outside if/list', () => {
    const { issues } = parseTemplate('<#else>')
    expect(issues.some((i) => i.code === 'ELSE_OUTSIDE')).toBe(true)
  })

  it('flags elseif outside if', () => {
    const { issues } = parseTemplate('<#elseif x>')
    expect(issues.some((i) => i.code === 'ELSEIF_OUTSIDE')).toBe(true)
  })

  it('matches HTML nesting', () => {
    const { tokens, issues } = parseTemplate('<table><tr><td>x</td></tr></table>')
    const open = tokens.find((t) => t.raw === '<table>')
    const close = tokens.find((t) => t.raw === '</table>')
    expect(open.matchingTokenId).toBe(close.id)
    expect(issues.filter((i) => i.severity === 'error').length).toBe(0)
  })

  it('detects incorrect nesting', () => {
    const { issues } = parseTemplate('<div><span></div></span>')
    expect(issues.some((i) => i.code === 'NESTING' || i.code === 'HTML_CLOSE_ORPHAN')).toBe(true)
  })

  it('builds structure tree with macros and lists', () => {
    const { root } = parseTemplate(fixture('macros.ftl'))
    expect(root.children.length).toBeGreaterThan(0)
    const labels = JSON.stringify(root)
    expect(labels).toMatch(/macro/i)
  })

  it('handles invalid close fixture', () => {
    const { issues } = parseTemplate(fixture('invalid-close.ftl'))
    expect(issues.length).toBeGreaterThan(0)
  })

  it('recovers from malformed mixed template', () => {
    const result = parseTemplate(fixture('malformed-mixed.ftl'))
    expect(result.tokens.length).toBeGreaterThan(0)
    expect(result.root).toBeTruthy()
  })

  it('duplicate macro names', () => {
    const { issues } = parseTemplate('<#macro a>x</#macro><#macro a>y</#macro>')
    expect(issues.some((i) => i.code === 'DUP_MACRO')).toBe(true)
  })

  it('empty macro name', () => {
    const { issues } = parseTemplate('<#macro >x</#macro>')
    expect(issues.some((i) => i.code === 'EMPTY_MACRO')).toBe(true)
  })

  it('breadcrumb for nested content', () => {
    const src = '<body><#list record.item as item><#if item.quantity>x</#if></#list></body>'
    const { root } = parseTemplate(src)
    // find line of inner if
    const path = buildBreadcrumb(root, 1)
    expect(Array.isArray(path)).toBe(true)
  })

  it('match info messages', () => {
    const { tokens } = parseTemplate('<#if x>y</#if>')
    const open = tokens.find((t) => t.raw.startsWith('<#if'))
    const byId = tokensByIdMap(tokens)
    const info = getMatchInfo(open, byId)
    expect(info.matched).toBe(true)
    expect(info.message).toMatch(/Abre en línea/)
  })

  it('custom directives matching', () => {
    const { tokens, issues } = parseTemplate('<@box>content</@box>')
    const open = tokens.find((t) => t.type === 'FM_CUSTOM_OPEN')
    const close = tokens.find((t) => t.type === 'FM_CUSTOM_CLOSE')
    expect(open.matchingTokenId).toBe(close.id)
    expect(issues.filter((i) => i.severity === 'error').length).toBe(0)
  })
})
