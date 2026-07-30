/**
 * Clipboard helpers — local only.
 */

export async function copyText(text) {
  const value = text == null ? '' : String(text)
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(value)
      return { ok: true }
    }
  } catch {
    // fall through
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = value
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return { ok }
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : 'Error al copiar' }
  }
}
