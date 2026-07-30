<template>
  <aside class="structure-panel" :class="{ collapsed }">
    <div class="panel-header">
      <div class="title">
        <button type="button" class="btn-ghost btn-sm" :title="collapsed ? 'Expandir' : 'Contraer'" @click="$emit('toggle')">
          {{ collapsed ? '»' : '«' }}
        </button>
        <span v-if="!collapsed">Estructura</span>
      </div>
    </div>
    <template v-if="!collapsed">
      <div class="structure-filters">
        <button
          v-for="f in filters"
          :key="f.id"
          type="button"
          :class="{ active: filter === f.id }"
          @click="$emit('update:filter', f.id)"
        >
          {{ f.label }}
        </button>
      </div>
      <div class="tree-scroll">
        <div v-if="!root || !filteredChildren.length" class="empty-state" style="height: auto; padding: 16px">
          Sin nodos para el filtro actual
        </div>
        <TreeNode
          v-for="child in filteredChildren"
          :key="child.id"
          :node="child"
          :depth="0"
          @select="onSelect"
        />
      </div>
    </template>
  </aside>
</template>

<script setup>
import { computed, defineComponent, h, ref } from 'vue'
import { StructureKind } from '../parser/tokenTypes.js'

const props = defineProps({
  root: { type: Object, default: null },
  filter: { type: String, default: 'all' },
  collapsed: { type: Boolean, default: false }
})

const emit = defineEmits(['select', 'toggle', 'update:filter'])

const filters = [
  { id: 'all', label: 'Todos' },
  { id: 'freemarker', label: 'FreeMarker' },
  { id: 'html', label: 'HTML/XML' },
  { id: 'macros', label: 'Macros' },
  { id: 'loops', label: 'Ciclos' },
  { id: 'conditions', label: 'Condiciones' },
  { id: 'errors', label: 'Errores' }
]

const freemarkerKinds = new Set([
  StructureKind.FREEMARKER,
  StructureKind.MACRO,
  StructureKind.FUNCTION,
  StructureKind.LIST,
  StructureKind.CONDITION,
  StructureKind.SWITCH,
  StructureKind.ATTEMPT,
  StructureKind.COMPRESS,
  StructureKind.ESCAPE,
  StructureKind.CUSTOM
])

function nodeMatches(node, filter) {
  if (filter === 'all') return true
  if (filter === 'errors') return node.hasError || (node.children || []).some((c) => nodeMatches(c, 'errors'))
  if (filter === 'freemarker') return freemarkerKinds.has(node.kind) || (node.children || []).some((c) => nodeMatches(c, 'freemarker'))
  if (filter === 'html') return node.kind === StructureKind.HTML || node.kind === StructureKind.CSS || (node.children || []).some((c) => nodeMatches(c, 'html'))
  if (filter === 'macros') return node.kind === StructureKind.MACRO || (node.children || []).some((c) => nodeMatches(c, 'macros'))
  if (filter === 'loops') return node.kind === StructureKind.LIST || (node.children || []).some((c) => nodeMatches(c, 'loops'))
  if (filter === 'conditions') return node.kind === StructureKind.CONDITION || (node.children || []).some((c) => nodeMatches(c, 'conditions'))
  return true
}

function filterTree(nodes, filter) {
  if (!nodes) return []
  const out = []
  for (const n of nodes) {
    if (!nodeMatches(n, filter)) continue
    out.push({
      ...n,
      children: filterTree(n.children, filter)
    })
  }
  return out
}

const filteredChildren = computed(() => {
  if (!props.root) return []
  return filterTree(props.root.children || [], props.filter)
})

function onSelect(node) {
  emit('select', node)
}

const iconFor = (kind) => {
  switch (kind) {
    case StructureKind.MACRO: return 'M'
    case StructureKind.FUNCTION: return 'F'
    case StructureKind.LIST: return '↻'
    case StructureKind.CONDITION: return '?'
    case StructureKind.CSS: return 'S'
    case StructureKind.CUSTOM: return '@'
    case StructureKind.SWITCH: return '⌥'
    case StructureKind.ATTEMPT: return '!'
    default: return '<>'
  }
}

const TreeNode = defineComponent({
  name: 'TreeNode',
  props: {
    node: { type: Object, required: true },
    depth: { type: Number, default: 0 }
  },
  emits: ['select'],
  setup(p, { emit: localEmit }) {
    const isOpen = ref(p.depth < 2)
    return () => {
      const hasChildren = p.node.children && p.node.children.length > 0
      return h('div', { class: 'tree-node' }, [
        h(
          'div',
          {
            class: [
              'tree-row',
              `kind-${p.node.kind}`,
              p.node.hasError ? 'has-error' : ''
            ],
            style: { paddingLeft: `${8 + p.depth * 14}px` },
            onClick: (e) => {
              e.stopPropagation()
              localEmit('select', p.node)
            }
          },
          [
            h(
              'span',
              {
                class: 'twisty',
                onClick: (e) => {
                  e.stopPropagation()
                  if (hasChildren) isOpen.value = !isOpen.value
                }
              },
              hasChildren ? (isOpen.value ? '▾' : '▸') : ' '
            ),
            h('span', { class: 'icon' }, iconFor(p.node.kind)),
            h('span', { class: 'label', title: p.node.label }, p.node.label || p.node.name)
          ]
        ),
        hasChildren && isOpen.value
          ? p.node.children.map((child) =>
              h(TreeNode, {
                key: child.id,
                node: child,
                depth: p.depth + 1,
                onSelect: (n) => localEmit('select', n)
              })
            )
          : null
      ])
    }
  }
})
</script>
