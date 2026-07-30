import { describe, it, expect } from 'vitest'
import { tokenize } from '../src/parser/tokenizer.js'
import { TokenType } from '../src/parser/tokenTypes.js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixture = (name) => readFileSync(resolve(__dirname, 'fixtures', name), 'utf-8')

describe('tokenize', () => {
  it('tokenizes FreeMarker list/if and HTML tags', () => {
    const src = '<#list record.item as item><#if item.quantity gt 0><tr><td>${item.item}</td></tr></#if></#list>'
    const { tokens } = tokenize(src)
    const types = tokens.map((t) => t.type)
    expect(types).toContain(TokenType.FM_OPEN)
    expect(types).toContain(TokenType.FM_CLOSE)
    expect(types).toContain(TokenType.OPEN_TAG)
    expect(types).toContain(TokenType.CLOSE_TAG)
    expect(types).toContain(TokenType.FM_INTERPOLATION)
  })

  it('tokenizes FreeMarker comments', () => {
    const { tokens } = tokenize('<#-- hello -->\n<p>x</p>')
    expect(tokens.some((t) => t.type === TokenType.FM_COMMENT)).toBe(true)
  })

  it('tokenizes interpolations with nested braces', () => {
    const { tokens } = tokenize('${foo.bar(baz{1})}')
    const interp = tokens.find((t) => t.type === TokenType.FM_INTERPOLATION)
    expect(interp).toBeTruthy()
    expect(interp.raw).toBe('${foo.bar(baz{1})}')
  })

  it('tokenizes custom directives', () => {
    const { tokens } = tokenize('<@header title="x"/><@footer></@footer>')
    expect(tokens.some((t) => t.type === TokenType.FM_CUSTOM_SELF)).toBe(true)
    expect(tokens.some((t) => t.type === TokenType.FM_CUSTOM_OPEN)).toBe(true)
    expect(tokens.some((t) => t.type === TokenType.FM_CUSTOM_CLOSE)).toBe(true)
  })

  it('tokenizes intermediate else/elseif', () => {
    const { tokens } = tokenize('<#if a><#elseif b><#else></#if>')
    const inter = tokens.filter((t) => t.type === TokenType.FM_INTERMEDIATE)
    expect(inter.map((t) => t.name)).toEqual(expect.arrayContaining(['elseif', 'else']))
  })

  it('recovers from unclosed FM comment', () => {
    const { tokens, errors } = tokenize('<#-- bad\n<p>x</p>')
    expect(errors.length).toBeGreaterThan(0)
    expect(tokens.length).toBeGreaterThan(0)
  })

  it('tokenizes invoice fixture without throwing', () => {
    const src = fixture('simple-invoice.ftl')
    const { tokens } = tokenize(src)
    expect(tokens.length).toBeGreaterThan(5)
  })

  it('tokenizes XML declaration', () => {
    const { tokens } = tokenize('<?xml version="1.0"?><pdf/>')
    expect(tokens[0].type).toBe(TokenType.XML_DECL)
  })

  it('handles empty input', () => {
    const { tokens } = tokenize('')
    expect(tokens).toEqual([])
  })
})
