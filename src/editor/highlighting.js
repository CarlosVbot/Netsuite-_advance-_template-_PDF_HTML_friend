/**
 * Editor theme + syntax highlighting for dark developer UI.
 */

import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'
import { EditorView } from '@codemirror/view'

export const netsuiteHighlightStyle = HighlightStyle.define([
  { tag: t.comment, color: '#6a9955', fontStyle: 'italic' },
  { tag: t.keyword, color: '#ff8c42' }, // FreeMarker directives — forge orange
  { tag: t.special(t.variableName), color: '#4fc1ff' }, // interpolations
  { tag: t.variableName, color: '#9cdcfe' },
  { tag: t.string, color: '#ce9178' },
  { tag: t.number, color: '#b5cea8' },
  { tag: t.operator, color: '#d4d4d4' },
  { tag: t.meta, color: '#569cd6' },
  { tag: t.tagName, color: '#569cd6' }, // HTML/XML
  { tag: t.attributeName, color: '#9cdcfe' },
  { tag: t.attributeValue, color: '#ce9178' },
  { tag: t.atom, color: '#dcdcaa' }, // NetSuite fields
  { tag: t.propertyName, color: '#9cdcfe' },
  { tag: t.invalid, color: '#f44747', textDecoration: 'underline' }
])

export const highlightingExtension = syntaxHighlighting(netsuiteHighlightStyle)

export function createEditorTheme(fontSize = 13) {
  return EditorView.theme(
    {
      '&': {
        backgroundColor: '#0f1419',
        color: '#e6edf3',
        fontSize: `${fontSize}px`,
        height: '100%'
      },
      '.cm-content': {
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
        caretColor: '#ff8c42',
        padding: '8px 0'
      },
      '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: '#ff8c42'
      },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
        backgroundColor: '#264f78'
      },
      '.cm-activeLine': {
        backgroundColor: '#1a2332'
      },
      '.cm-activeLineGutter': {
        backgroundColor: '#1a2332'
      },
      '.cm-gutters': {
        backgroundColor: '#0b1016',
        color: '#6e7681',
        border: 'none',
        borderRight: '1px solid #21262d'
      },
      '.cm-lineNumbers .cm-gutterElement': {
        padding: '0 8px 0 12px',
        minWidth: '3ch'
      },
      '.cm-foldGutter .cm-gutterElement': {
        padding: '0 4px'
      },
      '.cm-matchingBracket': {
        backgroundColor: 'rgba(255, 140, 66, 0.25)',
        outline: '1px solid #ff8c42',
        color: 'inherit'
      },
      '.cm-nonmatchingBracket': {
        backgroundColor: 'rgba(244, 71, 71, 0.2)',
        outline: '1px solid #f44747'
      },
      '.cm-searchMatch': {
        backgroundColor: 'rgba(255, 200, 0, 0.3)'
      },
      '.cm-searchMatch.cm-searchMatch-selected': {
        backgroundColor: 'rgba(255, 140, 66, 0.45)'
      },
      '.cm-tooltip': {
        backgroundColor: '#161b22',
        border: '1px solid #30363d',
        color: '#e6edf3'
      },
      '.cm-panels': {
        backgroundColor: '#0b1016',
        color: '#e6edf3'
      },
      '.cm-panel.cm-search': {
        backgroundColor: '#161b22',
        borderBottom: '1px solid #30363d'
      },
      '.cm-panel.cm-search input, .cm-panel.cm-search button': {
        backgroundColor: '#0f1419',
        color: '#e6edf3',
        border: '1px solid #30363d'
      },
      '.cm-foldPlaceholder': {
        backgroundColor: '#21262d',
        border: '1px solid #30363d',
        color: '#8b949e'
      },
      // Custom classes from stream tokens (fallback if tokenTable maps differently)
      '.cm-fmDirective': { color: '#ff8c42', fontWeight: '600' },
      '.cm-interpolation': { color: '#4fc1ff' },
      '.cm-nsField': { color: '#dcdcaa' },
      '.cm-match-open': {
        backgroundColor: 'rgba(79, 193, 255, 0.15)',
        outline: '1px solid #4fc1ff'
      },
      '.cm-match-close': {
        backgroundColor: 'rgba(255, 140, 66, 0.15)',
        outline: '1px solid #ff8c42'
      },
      '.cm-lint-marker-error': { color: '#f44747' },
      '.cm-lint-marker-warning': { color: '#cca700' },
      '.cm-scroller': {
        overflow: 'auto',
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace"
      }
    },
    { dark: true }
  )
}
