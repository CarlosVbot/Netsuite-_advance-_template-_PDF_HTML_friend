<template>
  <div class="modal-backdrop" @click.self="$emit('cancel')" @keydown.esc="$emit('cancel')">
    <div
      class="modal format-confirm-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="format-confirm-title"
      tabindex="-1"
      ref="dialogEl"
    >
      <div class="modal-header">
        <h2 id="format-confirm-title">Confirmar formato</h2>
        <button type="button" class="btn-ghost btn-sm" aria-label="Cerrar" @click="$emit('cancel')">
          ✕
        </button>
      </div>

      <div class="modal-body">
        <p class="confirm-message">
          ¿Desea formatear la plantilla actual? Se conservará una copia del original para poder deshacer.
        </p>

        <div class="kofi-support">
          <p class="kofi-hint">Si esta herramienta te resulta útil, puedes apoyar el proyecto:</p>
          <!--
            Official Ko-fi Widget_2.js cannot run in extension pages (Chrome CSP: script-src 'self').
            This button matches the widget look and opens the same page on explicit click.
          -->
          <a
            class="kofi-widget-button"
            :href="kofiUrl"
            target="_blank"
            rel="noopener noreferrer"
            :style="{ backgroundColor: kofiColor }"
          >
            <span class="kofi-cup" aria-hidden="true">☕</span>
            <span>{{ kofiLabel }}</span>
          </a>
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn-ghost" @click="$emit('cancel')">Cancelar</button>
        <button type="button" class="btn-primary" @click="$emit('confirm')">Formatear</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { KOFI_URL, KOFI_BUTTON_LABEL, KOFI_BUTTON_COLOR } from '../utils/constants.js'

defineEmits(['confirm', 'cancel'])

const kofiUrl = KOFI_URL
const kofiLabel = KOFI_BUTTON_LABEL
const kofiColor = KOFI_BUTTON_COLOR
const dialogEl = ref(null)

onMounted(() => {
  dialogEl.value?.focus()
})
</script>
