<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal" role="dialog" aria-labelledby="settings-title">
      <div class="modal-header">
        <h2 id="settings-title">Configuración</h2>
        <button type="button" class="btn-ghost btn-sm" @click="$emit('close')">✕</button>
      </div>
      <div class="modal-body">
        <PrivacyNotice />

        <div class="form-row">
          <label for="indent">Sangría</label>
          <select id="indent" :value="settings.indentStyle" @change="update('indentStyle', $event.target.value)">
            <option value="2spaces">2 espacios</option>
            <option value="4spaces">4 espacios</option>
            <option value="tabs">Tabulaciones</option>
          </select>
        </div>

        <div class="form-row">
          <label for="fontSize">Tamaño de fuente del editor</label>
          <input
            id="fontSize"
            type="number"
            min="10"
            max="22"
            :value="settings.fontSize"
            @change="update('fontSize', Number($event.target.value) || 13)"
          />
        </div>

        <div class="checkbox-row">
          <input
            id="autosave"
            type="checkbox"
            :checked="settings.autosaveEnabled"
            @change="update('autosaveEnabled', $event.target.checked)"
          />
          <label for="autosave">
            Guardar automáticamente el contenido del editor
            <div class="hint">Desactivado por defecto. Solo se guarda en este navegador de forma local.</div>
          </label>
        </div>

        <div class="checkbox-row">
          <input
            id="editable"
            type="checkbox"
            :checked="settings.formattedEditable"
            @change="update('formattedEditable', $event.target.checked)"
          />
          <label for="editable">Permitir editar el panel de resultado formateado</label>
        </div>

        <div class="form-row">
          <label>Datos locales</label>
          <button type="button" class="btn-danger" @click="onClearData">Eliminar datos locales</button>
          <div class="hint">Borra preferencias y contenido guardado en chrome.storage.local.</div>
        </div>

        <div class="form-row">
          <label>Acerca de</label>
          <div class="hint">
            NetSuite Advanced Template PDF/HTML Friend v{{ version }}
            · Procesamiento 100 % local · Sin telemetría
          </div>
          <button type="button" class="btn-ghost" @click="openKofi">Apoyar el proyecto en Ko-fi</button>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn-primary" @click="$emit('close')">Cerrar</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import PrivacyNotice from './PrivacyNotice.vue'
import { APP_VERSION, KOFI_URL } from '../utils/constants.js'

const props = defineProps({
  settings: { type: Object, required: true }
})

const emit = defineEmits(['close', 'update', 'clear-data'])

const version = APP_VERSION

function update(key, value) {
  emit('update', { key, value })
}

function onClearData() {
  if (confirm('¿Eliminar todos los datos locales de la extensión?')) {
    emit('clear-data')
  }
}

function openKofi() {
  // Explicit user click only
  window.open(KOFI_URL, '_blank', 'noopener,noreferrer')
}
</script>
