<template>
  <div class="diff-view">
    <div class="diff-toolbar">
      <button type="button" :disabled="!changeIndexes.length" @click="prevDiff">Diferencia anterior</button>
      <button type="button" :disabled="!changeIndexes.length" @click="nextDiff">Diferencia siguiente</button>
      <span class="badge" style="color: var(--text-muted); font-size: 12px">
        {{ changeIndexes.length ? `${currentIdx + 1} / ${changeIndexes.length}` : 'Sin diferencias' }}
      </span>
      <div style="flex: 1" />
      <button type="button" @click="copyModified">Copiar versión modificada</button>
      <button type="button" class="btn-primary" @click="downloadModified">Descargar versión modificada</button>
      <button type="button" class="btn-ghost" @click="$emit('close')">Volver al editor</button>
    </div>

    <div class="diff-inputs">
      <div>
        <div class="diff-col-header">Versión original</div>
        <textarea
          :value="original"
          placeholder="Pegue la versión original…"
          spellcheck="false"
          @input="$emit('update:original', $event.target.value)"
        />
      </div>
      <div>
        <div class="diff-col-header">Versión modificada</div>
        <textarea
          :value="modified"
          placeholder="Pegue la versión modificada…"
          spellcheck="false"
          @input="$emit('update:modified', $event.target.value)"
        />
      </div>
    </div>

    <div class="diff-body">
      <div class="diff-col">
        <div class="diff-col-header">Original</div>
        <div ref="leftScroll" class="diff-scroll" @scroll="syncScroll('left')">
          <div
            v-for="(row, i) in rows"
            :id="'diff-row-' + i"
            :key="'L' + i"
            class="diff-row"
            :class="[row.type, { highlight: i === highlightRow }]"
          >
            <span class="ln">{{ row.leftLine ?? '' }}</span>
            <span class="tx">{{ row.leftText }}</span>
          </div>
        </div>
      </div>
      <div class="diff-col">
        <div class="diff-col-header">Modificada</div>
        <div ref="rightScroll" class="diff-scroll" @scroll="syncScroll('right')">
          <div
            v-for="(row, i) in rows"
            :key="'R' + i"
            class="diff-row"
            :class="[row.type, { highlight: i === highlightRow }]"
          >
            <span class="ln">{{ row.rightLine ?? '' }}</span>
            <span class="tx">{{ row.rightText }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { buildSideBySide } from '../services/diffService.js'
import { copyText } from '../services/clipboardService.js'
import { exportTemplate } from '../services/exportService.js'

const props = defineProps({
  original: { type: String, default: '' },
  modified: { type: String, default: '' }
})

const emit = defineEmits(['update:original', 'update:modified', 'close', 'toast'])

const rows = computed(() => buildSideBySide(props.original, props.modified))

const changeIndexes = computed(() =>
  rows.value
    .map((r, i) => (r.type === 'added' || r.type === 'removed' || r.type === 'changed' ? i : -1))
    .filter((i) => i >= 0)
)

const currentIdx = ref(0)
const highlightRow = ref(-1)
const leftScroll = ref(null)
const rightScroll = ref(null)
let syncing = false

watch(changeIndexes, (list) => {
  if (!list.length) {
    currentIdx.value = 0
    highlightRow.value = -1
  } else if (currentIdx.value >= list.length) {
    currentIdx.value = 0
  }
})

function goToChange(idx) {
  if (!changeIndexes.value.length) return
  currentIdx.value = ((idx % changeIndexes.value.length) + changeIndexes.value.length) % changeIndexes.value.length
  highlightRow.value = changeIndexes.value[currentIdx.value]
  const el = document.getElementById('diff-row-' + highlightRow.value)
  if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
}

function prevDiff() {
  goToChange(currentIdx.value - 1)
}

function nextDiff() {
  goToChange(currentIdx.value + 1)
}

function syncScroll(source) {
  if (syncing) return
  syncing = true
  const src = source === 'left' ? leftScroll.value : rightScroll.value
  const dst = source === 'left' ? rightScroll.value : leftScroll.value
  if (src && dst) {
    dst.scrollTop = src.scrollTop
    dst.scrollLeft = src.scrollLeft
  }
  requestAnimationFrame(() => {
    syncing = false
  })
}

async function copyModified() {
  const r = await copyText(props.modified)
  emit('toast', r.ok ? { type: 'success', message: 'Versión modificada copiada' } : { type: 'error', message: 'No se pudo copiar' })
}

function downloadModified() {
  exportTemplate(props.modified, 'ftl', 'netsuite-template-modificado.ftl')
  emit('toast', { type: 'success', message: 'Descarga iniciada' })
}
</script>
