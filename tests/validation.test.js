import { describe, it, expect } from 'vitest'
import { validateTemplate } from '../src/validation/validator.js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixture = (name) => readFileSync(resolve(__dirname, 'fixtures', name), 'utf-8')

describe('validation', () => {
  it('detects FreeMarker mismatches', () => {
    const { issues, summary } = validateTemplate(fixture('invalid-close.ftl'))
    expect(summary.errors).toBeGreaterThan(0)
    expect(issues.some((i) => i.severity === 'error')).toBe(true)
  })

  it('warns about script tags', () => {
    const { issues } = validateTemplate('<script src="http://cdn.example.com/x.js"></script>')
    expect(issues.some((i) => i.code === 'SCRIPT_TAG')).toBe(true)
  })

  it('warns about CDN / external resources', () => {
    const { issues } = validateTemplate('<img src="https://cdn.example.com/logo.png"/>')
    expect(issues.some((i) => i.code === 'CDN_REF' || i.code === 'HTTP_RESOURCE')).toBe(true)
  })

  it('detects duplicate IDs', () => {
    const { issues } = validateTemplate('<div id="a"></div><span id="a"></span>')
    expect(issues.some((i) => i.code === 'DUP_ID')).toBe(true)
  })

  it('detects multiple XML declarations', () => {
    const { issues } = validateTemplate('<?xml version="1.0"?><?xml version="1.0"?><pdf/>')
    expect(issues.some((i) => i.code === 'MULTI_XML_DECL')).toBe(true)
  })

  it('summary counts conditions and loops', () => {
    const src = '<#if a><#list b as c>x</#list></#if>'
    const { summary } = validateTemplate(src)
    expect(summary.conditions).toBe(1)
    expect(summary.loops).toBe(1)
  })

  it('validates BFO/CSS fixture without crash', () => {
    const { issues, summary } = validateTemplate(fixture('bfo-css.ftl'))
    expect(summary).toBeTruthy()
    expect(Array.isArray(issues)).toBe(true)
  })

  it('conservative empty value info', () => {
    const { issues } = validateTemplate('${record.custbody_note}')
    // may be info
    expect(issues.every((i) => i.severity !== undefined)).toBe(true)
  })
})
