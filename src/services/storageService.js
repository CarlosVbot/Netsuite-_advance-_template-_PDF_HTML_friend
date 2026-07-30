/**
 * chrome.storage.local wrapper with in-memory fallback for non-extension contexts.
 */

import { STORAGE_KEYS, DEFAULT_FONT_SIZE, DEFAULT_PANEL_SPLIT } from '../utils/constants.js'

const memory = new Map()

function hasChromeStorage() {
  try {
    return typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local
  } catch {
    return false
  }
}

export async function getSettings() {
  const defaults = {
    [STORAGE_KEYS.theme]: 'dark',
    [STORAGE_KEYS.indentStyle]: '4spaces',
    [STORAGE_KEYS.fontSize]: DEFAULT_FONT_SIZE,
    [STORAGE_KEYS.panelSplit]: DEFAULT_PANEL_SPLIT,
    [STORAGE_KEYS.lastView]: 'editor',
    [STORAGE_KEYS.autosaveEnabled]: false,
    [STORAGE_KEYS.autosaveContent]: '',
    [STORAGE_KEYS.formattedEditable]: false,
    [STORAGE_KEYS.structureFilter]: 'all',
    [STORAGE_KEYS.structureCollapsed]: false
  }

  if (!hasChromeStorage()) {
    const result = { ...defaults }
    for (const [k, v] of memory.entries()) result[k] = v
    return result
  }

  return new Promise((resolve) => {
    chrome.storage.local.get(Object.keys(defaults), (items) => {
      resolve({ ...defaults, ...items })
    })
  })
}

export async function setSetting(key, value) {
  if (!hasChromeStorage()) {
    memory.set(key, value)
    return
  }
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, () => resolve())
  })
}

export async function setSettings( partial ) {
  if (!hasChromeStorage()) {
    for (const [k, v] of Object.entries(partial)) memory.set(k, v)
    return
  }
  return new Promise((resolve) => {
    chrome.storage.local.set(partial, () => resolve())
  })
}

export async function clearLocalData() {
  if (!hasChromeStorage()) {
    memory.clear()
    return
  }
  return new Promise((resolve) => {
    chrome.storage.local.clear(() => resolve())
  })
}

export { STORAGE_KEYS }
