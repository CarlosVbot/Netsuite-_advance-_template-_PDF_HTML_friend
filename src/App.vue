<template>
  <div class="app-shell">
    <AppHeader @settings="showSettings = true" @clear="clearAll" />

    <div class="toolbar">
      <div class="group">
        <button type="button" class="btn-primary" :disabled="busy" @click="runFormat">Formatear</button>
        <button type="button" :disabled="busy" @click="runValidate">Validar</button>
        <button type="button" :disabled="!formatted" @click="copyResult">Copiar resultado</button>
      </div>
      <div class="sep" />
      <div class="group">
        <button type="button" :disabled="!formatted" @click="download('ftl')">Descargar FTL</button>
        <button type="button" :disabled="!formatted" @click="download('xml')">Descargar XML</button>
        <button type="button" :disabled="!formatted" @click="download('html')">Descargar HTML</button>
        <button type="button" :disabled="!formatted" @click="download('txt')">Descargar TXT</button>
      </div>
      <div class="sep" />
      <div class="group">
        <button type="button" @click="clearAll">Limpiar</button>
        <button type="button" :disabled="!hasOriginalSnapshot" @click="undoFormat">Deshacer formato</button>
        <button type="button" :class="{ 'btn-primary': viewMode === 'diff' }" @click="toggleDiff">
          Comparar versiones
        </button>
      </div>
      <div class="sep" />
      <div class="group">
        <button type="button" class="btn-ghost btn-sm" title="Buscar en el editor activo" @click="openSearch">
          Buscar
        </button>
        <label class="checkbox-row" style="margin: 0; align-items: center; font-size: 12px; color: var(--text-muted)">
          <input type="checkbox" :checked="settings.formattedEditable" @change="onToggleEditable" />
          Editar resultado
        </label>
      </div>
    </div>

    <div class="main-body">
      <StructureTree
        :root="structureRoot"
        :filter="structureFilter"
        :collapsed="structureCollapsed"
        @select="onStructureSelect"
        @toggle="toggleStructure"
        @update:filter="onStructureFilter"
      />

      <div class="workspace">
        <template v-if="viewMode === 'diff'">
          <DiffEditor
            v-model:original="diffOriginal"
            v-model:modified="diffModified"
            @close="viewMode = 'editor'"
            @toast="showToast"
          />
        </template>

        <template v-else>
          <div class="breadcrumb-bar">
            <template v-if="breadcrumb.length">
              <template v-for="(c, i) in breadcrumb" :key="c.id">
                <span v-if="i > 0" class="sep-crumb">›</span>
                <span class="crumb" :class="{ current: i === breadcrumb.length - 1 }">{{ c.label }}</span>
              </template>
            </template>
            <span v-else class="crumb">Template</span>
            <span v-if="matchMessage" class="match-info">{{ matchMessage }}</span>
          </div>

          <div class="split-editors">
            <div class="progress-bar" :class="{ active: busy }" />
            <div class="editor-pane" :style="{ width: panelSplit + '%' }">
              <div class="pane-label">
                <span>Original</span>
                <span class="badge">{{ originalLines }} líneas</span>
              </div>
              <CodeEditor
                ref="originalEditor"
                v-model="original"
                :font-size="settings.fontSize"
                :parse-result="activeParse"
                @cursor="onOriginalCursor"
                @focus="activeSide = 'original'"
              />
            </div>
            <div
              class="split-divider"
              :class="{ active: resizing }"
              title="Arrastrar para redimensionar"
              @mousedown="startResize"
            />
            <div class="editor-pane" :style="{ width: 100 - panelSplit + '%' }">
              <div class="pane-label">
                <span>Formateado</span>
                <span class="badge">{{ formattedLines }} líneas · {{ settings.formattedEditable ? 'editable' : 'solo lectura' }}</span>
              </div>
              <CodeEditor
                ref="formattedEditor"
                v-model="formatted"
                :read-only="!settings.formattedEditable"
                :font-size="settings.fontSize"
                :parse-result="formattedParse"
                @cursor="onFormattedCursor"
                @focus="activeSide = 'formatted'"
              />
            </div>
          </div>

          <ProblemsPanel :issues="issues" @navigate="onNavigateIssue" />
        </template>
      </div>
    </div>

    <StatusBar :summary-text="summaryText" :cursor-text="cursorText" :busy="busy" />

    <SettingsModal
      v-if="showSettings"
      :settings="settings"
      @close="showSettings = false"
      @update="onSettingUpdate"
      @clear-data="onClearLocalData"
    />

    <div v-if="toast" class="toast" :class="toast.type">
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import AppHeader from './components/AppHeader.vue'
import CodeEditor from './components/CodeEditor.vue'
import StructureTree from './components/StructureTree.vue'
import ProblemsPanel from './components/ProblemsPanel.vue'
import StatusBar from './components/StatusBar.vue'
import SettingsModal from './components/SettingsModal.vue'
import DiffEditor from './components/DiffEditor.vue'
import { formatTemplate } from './formatter/formatter.js'
import { validateTemplate, formatSummaryText } from './validation/validator.js'
import { parseTemplate, buildBreadcrumb } from './parser/parser.js'
import { matchInfoAtOffset } from './editor/matching.js'
import { getSettings, setSetting, clearLocalData, STORAGE_KEYS } from './services/storageService.js'
import { copyText } from './services/clipboardService.js'
import { exportTemplate } from './services/exportService.js'
import {
  DEFAULT_PANEL_SPLIT,
  VALIDATE_DEBOUNCE_MS,
  AUTOSAVE_DEBOUNCE_MS,
  LARGE_TEMPLATE_CHARS,
  FORMAT_ERROR_MESSAGE
} from './utils/constants.js'
import { countLines } from './utils/textPosition.js'

const original = ref('')
const formatted = ref('')
const originalSnapshot = ref('')
const hasOriginalSnapshot = ref(false)

const issues = ref([])
const structureRoot = ref(null)
const activeParse = ref(null)
const formattedParse = ref(null)
const summary = ref(null)

const settings = ref({
  indentStyle: '4spaces',
  fontSize: 13,
  autosaveEnabled: false,
  formattedEditable: false,
  panelSplit: DEFAULT_PANEL_SPLIT
})

const panelSplit = ref(DEFAULT_PANEL_SPLIT)
const structureFilter = ref('all')
const structureCollapsed = ref(false)
const showSettings = ref(false)
const busy = ref(false)
const viewMode = ref('editor')
const toast = ref(null)
const activeSide = ref('original')
const breadcrumb = ref([])
const matchMessage = ref('')
const cursorText = ref('')

const diffOriginal = ref('')
const diffModified = ref('')

const originalEditor = ref(null)
const formattedEditor = ref(null)

const originalLines = computed(() => countLines(original.value))
const formattedLines = computed(() => (formatted.value ? countLines(formatted.value) : 0))
const summaryText = computed(() => formatSummaryText(summary.value) || 'Listo')

let validateTimer = null
let autosaveTimer = null
let toastTimer = null
let resizing = ref(false)

onMounted(async () => {
  const s = await getSettings()
  settings.value = {
    indentStyle: s[STORAGE_KEYS.indentStyle],
    fontSize: s[STORAGE_KEYS.fontSize],
    autosaveEnabled: s[STORAGE_KEYS.autosaveEnabled],
    formattedEditable: s[STORAGE_KEYS.formattedEditable],
    panelSplit: s[STORAGE_KEYS.panelSplit]
  }
  panelSplit.value = s[STORAGE_KEYS.panelSplit] ?? DEFAULT_PANEL_SPLIT
  structureFilter.value = s[STORAGE_KEYS.structureFilter] || 'all'
  structureCollapsed.value = !!s[STORAGE_KEYS.structureCollapsed]
  if (s[STORAGE_KEYS.autosaveEnabled] && s[STORAGE_KEYS.autosaveContent]) {
    original.value = s[STORAGE_KEYS.autosaveContent]
    scheduleValidate()
  }
  window.addEventListener('mousemove', onResizeMove)
  window.addEventListener('mouseup', onResizeEnd)
})

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onResizeMove)
  window.removeEventListener('mouseup', onResizeEnd)
  clearTimeout(validateTimer)
  clearTimeout(autosaveTimer)
  clearTimeout(toastTimer)
})

watch(original, () => {
  scheduleValidate()
  if (settings.value.autosaveEnabled) {
    clearTimeout(autosaveTimer)
    autosaveTimer = setTimeout(() => {
      setSetting(STORAGE_KEYS.autosaveContent, original.value)
    }, AUTOSAVE_DEBOUNCE_MS)
  }
})

function scheduleValidate() {
  clearTimeout(validateTimer)
  validateTimer = setTimeout(() => {
    runValidate(true)
  }, VALIDATE_DEBOUNCE_MS)
}

function showToast(t) {
  toast.value = t
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = null
  }, 3200)
}

async function runFormat() {
  busy.value = true
  try {
    // Keep access to original
    if (!hasOriginalSnapshot.value) {
      originalSnapshot.value = original.value
      hasOriginalSnapshot.value = true
    } else {
      // snapshot stays as first pre-format paste unless user cleared
    }

    const isLarge = original.value.length >= LARGE_TEMPLATE_CHARS
    if (isLarge) {
      // yield to UI
      await new Promise((r) => setTimeout(r, 10))
    }

    const result = formatTemplate(original.value, {
      indentStyle: settings.value.indentStyle
    })

    if (!result.success) {
      showToast({ type: 'error', message: result.errorMessage || FORMAT_ERROR_MESSAGE })
      // still show parse errors
    }

    formatted.value = result.formatted
    applyParse(result.parseResult, 'both')

    // Validate formatted
    const v = validateTemplate(result.formatted, { parseResult: parseTemplate(result.formatted) })
    issues.value = v.issues
    summary.value = v.summary
    formattedParse.value = v.parseResult
    structureRoot.value = v.parseResult?.root || result.parseResult?.root || null

    if (result.success) {
      showToast({ type: 'success', message: 'Plantilla formateada' })
    }
  } catch (e) {
    showToast({ type: 'error', message: FORMAT_ERROR_MESSAGE })
  } finally {
    busy.value = false
  }
}

function runValidate(silent = false) {
  busy.value = !silent
  try {
    const source = activeSide.value === 'formatted' && formatted.value ? formatted.value : original.value
    const v = validateTemplate(source)
    issues.value = v.issues
    summary.value = v.summary
    applyParse(v.parseResult, activeSide.value === 'formatted' ? 'formatted' : 'original')
    structureRoot.value = v.parseResult?.root || null
    if (!silent) {
      showToast({
        type: v.summary.errors ? 'error' : 'success',
        message: v.summary.errors
          ? `${v.summary.errors} error(es), ${v.summary.warnings} advertencia(s)`
          : 'Validación completada sin errores'
      })
    }
  } catch {
    if (!silent) showToast({ type: 'error', message: 'Error al validar' })
  } finally {
    busy.value = false
  }
}

function applyParse(parseResult, side) {
  if (!parseResult) return
  if (side === 'original' || side === 'both') activeParse.value = parseResult
  if (side === 'formatted' || side === 'both') {
    if (side === 'both') {
      // formatted will be reparsed after format
    } else {
      formattedParse.value = parseResult
    }
  }
  if (side === 'original' || side === 'both') {
    activeParse.value = parseResult
  }
}

async function copyResult() {
  const r = await copyText(formatted.value)
  showToast(
    r.ok
      ? { type: 'success', message: 'Resultado copiado al portapapeles' }
      : { type: 'error', message: 'No se pudo copiar al portapapeles' }
  )
}

function download(ext) {
  const name = window.prompt('Nombre del archivo (sin ruta):', `netsuite-template-formatted.${ext}`)
  if (name === null) return
  exportTemplate(formatted.value, ext, name || `netsuite-template-formatted.${ext}`)
  showToast({ type: 'success', message: `Descarga .${ext} iniciada` })
}

function clearAll() {
  original.value = ''
  formatted.value = ''
  originalSnapshot.value = ''
  hasOriginalSnapshot.value = false
  issues.value = []
  structureRoot.value = null
  activeParse.value = null
  formattedParse.value = null
  summary.value = null
  matchMessage.value = ''
  breadcrumb.value = []
  if (settings.value.autosaveEnabled) {
    setSetting(STORAGE_KEYS.autosaveContent, '')
  }
}

function undoFormat() {
  if (!hasOriginalSnapshot.value) return
  // Restore original panel from snapshot; clear formatted or restore pre-format view
  original.value = originalSnapshot.value
  formatted.value = ''
  hasOriginalSnapshot.value = false
  originalSnapshot.value = ''
  scheduleValidate()
  showToast({ type: 'success', message: 'Formato deshecho; se conservó el original' })
}

function toggleDiff() {
  if (viewMode.value === 'diff') {
    viewMode.value = 'editor'
  } else {
    diffOriginal.value = original.value
    diffModified.value = formatted.value || original.value
    viewMode.value = 'diff'
  }
}

function onStructureSelect(node) {
  if (!node) return
  const editor = activeSide.value === 'formatted' ? formattedEditor.value : originalEditor.value
  editor?.goToLine(node.startLine, 1)
}

function onNavigateIssue(issue) {
  const editor = activeSide.value === 'formatted' && formatted.value ? formattedEditor.value : originalEditor.value
  editor?.goToLine(issue.line || 1, issue.column || 1)
}

function onOriginalCursor(c) {
  cursorText.value = `L${c.line}:C${c.column}`
  updateContext(activeParse.value, c)
}

function onFormattedCursor(c) {
  cursorText.value = `L${c.line}:C${c.column}`
  updateContext(formattedParse.value || activeParse.value, c)
}

function updateContext(parseResult, cursor) {
  if (!parseResult || !parseResult.root) {
    breadcrumb.value = []
    matchMessage.value = ''
    return
  }
  breadcrumb.value = buildBreadcrumb(parseResult.root, cursor.line)
  const mi = matchInfoAtOffset(parseResult, cursor.offset)
  matchMessage.value = mi?.info?.message || ''
}

function toggleStructure() {
  structureCollapsed.value = !structureCollapsed.value
  setSetting(STORAGE_KEYS.structureCollapsed, structureCollapsed.value)
}

function onStructureFilter(f) {
  structureFilter.value = f
  setSetting(STORAGE_KEYS.structureFilter, f)
}

async function onSettingUpdate({ key, value }) {
  const map = {
    indentStyle: STORAGE_KEYS.indentStyle,
    fontSize: STORAGE_KEYS.fontSize,
    autosaveEnabled: STORAGE_KEYS.autosaveEnabled,
    formattedEditable: STORAGE_KEYS.formattedEditable
  }
  settings.value = { ...settings.value, [key]: value }
  if (map[key]) await setSetting(map[key], value)
  if (key === 'autosaveEnabled' && !value) {
    await setSetting(STORAGE_KEYS.autosaveContent, '')
  }
}

function onToggleEditable(e) {
  onSettingUpdate({ key: 'formattedEditable', value: e.target.checked })
}

async function onClearLocalData() {
  await clearLocalData()
  settings.value = {
    indentStyle: '4spaces',
    fontSize: 13,
    autosaveEnabled: false,
    formattedEditable: false,
    panelSplit: DEFAULT_PANEL_SPLIT
  }
  panelSplit.value = DEFAULT_PANEL_SPLIT
  showToast({ type: 'success', message: 'Datos locales eliminados' })
}

function openSearch() {
  const editor = activeSide.value === 'formatted' ? formattedEditor.value : originalEditor.value
  editor?.openSearch()
}

// Resize split
let startX = 0
let startSplit = 50

function startResize(e) {
  resizing.value = true
  startX = e.clientX
  startSplit = panelSplit.value
  e.preventDefault()
}

function onResizeMove(e) {
  if (!resizing.value) return
  const workspace = document.querySelector('.split-editors')
  if (!workspace) return
  const rect = workspace.getBoundingClientRect()
  const delta = e.clientX - startX
  const pct = startSplit + (delta / rect.width) * 100
  panelSplit.value = Math.min(80, Math.max(20, pct))
}

function onResizeEnd() {
  if (!resizing.value) return
  resizing.value = false
  setSetting(STORAGE_KEYS.panelSplit, panelSplit.value)
}
</script>
