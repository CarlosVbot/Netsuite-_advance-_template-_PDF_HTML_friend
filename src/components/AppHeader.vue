<template>
  <header class="app-header">
    <div class="brand">
      <div class="brand-title">
        NetSuite Advanced Template <span>PDF/HTML Friend</span>
      </div>
      <div class="brand-sub">Inspector y formateador de plantillas Advanced PDF/HTML</div>
    </div>
    <div class="header-actions">
      <button type="button" class="btn-ghost" title="Configuración" @click="$emit('settings')">
        ⚙ Configuración
      </button>
      <button type="button" class="btn-ghost" title="Limpiar editor original" @click="$emit('clear')">
        🗑 Limpiar
      </button>
    </div>
  </header>
</template>

<script setup>
defineEmits(['settings', 'clear'])
</script>
