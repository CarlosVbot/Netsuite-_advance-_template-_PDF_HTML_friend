/**
 * Trigger a browser download without file-system permissions.
 */
export function downloadTextFile(content, filename, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function ensureExtension(filename, ext) {
  const clean = (filename || 'archivo').trim().replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
  if (clean.toLowerCase().endsWith(`.${ext.toLowerCase()}`)) return clean
  return `${clean}.${ext}`
}
