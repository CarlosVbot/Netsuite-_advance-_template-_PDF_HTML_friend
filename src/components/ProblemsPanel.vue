<template>
  <section class="problems-panel">
    <div class="panel-header">
      <div class="title">Problemas detectados</div>
      <span class="badge" style="font-size: 11px; color: var(--text-dim)">
        {{ issues.length }} ·
        <span class="severity error">{{ errorCount }} err</span> ·
        <span class="severity warning">{{ warnCount }} adv</span>
      </span>
    </div>
    <div class="problems-list">
      <div v-if="!issues.length" class="empty-state" style="height: 80px">
        No se detectaron problemas
      </div>
      <div
        v-for="issue in issues"
        :key="issue.id"
        class="problem-row"
        @click="$emit('navigate', issue)"
      >
        <span class="severity" :class="issue.severity">{{ severityLabel(issue.severity) }}</span>
        <span class="problem-loc">L{{ issue.line }}:{{ issue.column || 1 }}</span>
        <div class="problem-msg">
          {{ issue.message }}
          <span v-if="issue.suggestion" class="suggestion">{{ issue.suggestion }}</span>
        </div>
        <button type="button" class="btn-sm btn-ghost" @click.stop="$emit('navigate', issue)">
          Ir
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  issues: { type: Array, default: () => [] }
})

defineEmits(['navigate'])

const errorCount = computed(() => props.issues.filter((i) => i.severity === 'error').length)
const warnCount = computed(() => props.issues.filter((i) => i.severity === 'warning').length)

function severityLabel(s) {
  if (s === 'error') return 'Error'
  if (s === 'warning') return 'Advertencia'
  return 'Información'
}
</script>
