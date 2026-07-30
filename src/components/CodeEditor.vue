<template>
  <div ref="host" class="editor-host" />
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { EditorState, Compartment } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, rectangularSelection, crosshairCursor } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { foldGutter, foldKeymap, bracketMatching, indentOnInput } from '@codemirror/language'
import { searchKeymap, highlightSelectionMatches, openSearchPanel } from '@codemirror/search'
import { lintGutter } from '@codemirror/lint'
import { netsuiteLanguage } from '../editor/language.js'
import { highlightingExtension, createEditorTheme } from '../editor/highlighting.js'
import { createFoldService } from '../editor/folding.js'
import { matchHighlightField, setMatchParseEffect } from '../editor/matching.js'

const props = defineProps({
  modelValue: { type: String, default: '' },
  readOnly: { type: Boolean, default: false },
  fontSize: { type: Number, default: 13 },
  parseResult: { type: Object, default: null },
  placeholder: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue', 'cursor', 'focus', 'ready'])

const host = ref(null)
let view = null
const readOnlyCompartment = new Compartment()
const themeCompartment = new Compartment()
const foldCompartment = new Compartment()
let updating = false
let parseRef = { current: null }

function getParse() {
  return parseRef.current
}

function createState(doc) {
  parseRef.current = props.parseResult
  return EditorState.create({
    doc: doc ?? '',
    extensions: [
      lineNumbers(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      drawSelection(),
      rectangularSelection(),
      crosshairCursor(),
      history(),
      foldGutter(),
      foldCompartment.of(createFoldService(getParse)),
      bracketMatching(),
      indentOnInput(),
      highlightSelectionMatches(),
      lintGutter(),
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...searchKeymap,
        indentWithTab
      ]),
      netsuiteLanguage,
      highlightingExtension,
      themeCompartment.of(createEditorTheme(props.fontSize)),
      matchHighlightField,
      readOnlyCompartment.of(EditorState.readOnly.of(props.readOnly)),
      EditorView.updateListener.of((update) => {
        if (update.docChanged && !updating && !props.readOnly) {
          emit('update:modelValue', update.state.doc.toString())
        }
        if (update.selectionSet || update.docChanged) {
          const pos = update.state.selection.main.head
          const line = update.state.doc.lineAt(pos)
          emit('cursor', {
            offset: pos,
            line: line.number,
            column: pos - line.from + 1
          })
        }
      }),
      EditorView.domEventHandlers({
        focus: () => emit('focus')
      })
    ]
  })
}

onMounted(() => {
  if (!host.value) return
  view = new EditorView({
    state: createState(props.modelValue),
    parent: host.value
  })
  if (props.parseResult) {
    view.dispatch({ effects: setMatchParseEffect.of(props.parseResult) })
  }
  emit('ready', { view, openSearch: () => openSearchPanel(view) })
})

onBeforeUnmount(() => {
  if (view) {
    view.destroy()
    view = null
  }
})

watch(
  () => props.modelValue,
  (val) => {
    if (!view) return
    const current = view.state.doc.toString()
    if (val === current) return
    updating = true
    view.dispatch({
      changes: { from: 0, to: current.length, insert: val ?? '' }
    })
    updating = false
  }
)

watch(
  () => props.readOnly,
  (ro) => {
    if (!view) return
    view.dispatch({
      effects: readOnlyCompartment.reconfigure(EditorState.readOnly.of(ro))
    })
  }
)

watch(
  () => props.fontSize,
  (size) => {
    if (!view) return
    view.dispatch({
      effects: themeCompartment.reconfigure(createEditorTheme(size))
    })
  }
)

watch(
  () => props.parseResult,
  (pr) => {
    parseRef.current = pr
    if (!view) return
    view.dispatch({
      effects: [
        setMatchParseEffect.of(pr),
        foldCompartment.reconfigure(createFoldService(getParse))
      ]
    })
  }
)

function goToLine(line, column = 1) {
  if (!view) return
  const doc = view.state.doc
  const ln = Math.max(1, Math.min(line, doc.lines))
  const lineObj = doc.line(ln)
  const col = Math.max(0, Math.min((column || 1) - 1, lineObj.length))
  const pos = lineObj.from + col
  view.dispatch({
    selection: { anchor: pos },
    effects: EditorView.scrollIntoView(pos, { y: 'center' })
  })
  view.focus()
}

function getOffset() {
  if (!view) return 0
  return view.state.selection.main.head
}

function focus() {
  view?.focus()
}

function openSearch() {
  if (view) openSearchPanel(view)
}

defineExpose({ goToLine, getOffset, focus, openSearch, getView: () => view })
</script>
