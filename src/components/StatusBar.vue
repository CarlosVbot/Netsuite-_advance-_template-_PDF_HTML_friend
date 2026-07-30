<template>
  <footer class="status-bar">
    <span v-if="busy" class="busy">Procesando…</span>
    <span class="summary">{{ summaryText }}</span>
    <span v-if="cursorText" class="cursor">{{ cursorText }}</span>
    <span class="privacy" :title="privacy">🔒 Procesamiento local</span>
  </footer>
</template>

<script setup>
import { PRIVACY_MESSAGE } from '../utils/constants.js'

defineProps({
  summaryText: { type: String, default: '' },
  cursorText: { type: String, default: '' },
  busy: { type: Boolean, default: false }
})

const privacy = PRIVACY_MESSAGE
</script>
