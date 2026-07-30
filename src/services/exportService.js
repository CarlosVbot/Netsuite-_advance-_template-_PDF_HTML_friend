/**
 * Export formatted templates as downloadable files.
 */

import { downloadTextFile, ensureExtension } from '../utils/download.js'
import { DEFAULT_FILENAME } from '../utils/constants.js'

const MIME = {
  ftl: 'text/plain;charset=utf-8',
  xml: 'application/xml;charset=utf-8',
  html: 'text/html;charset=utf-8',
  txt: 'text/plain;charset=utf-8'
}

/**
 * @param {string} content
 * @param {'ftl'|'xml'|'html'|'txt'} format
 * @param {string} [filename]
 */
export function exportTemplate(content, format = 'ftl', filename) {
  const ext = format || 'ftl'
  const base = filename || `${DEFAULT_FILENAME}.${ext}`
  const finalName = ensureExtension(base.replace(/\.(ftl|xml|html|txt)$/i, ''), ext)
  downloadTextFile(content ?? '', finalName, MIME[ext] || MIME.txt)
  return finalName
}
