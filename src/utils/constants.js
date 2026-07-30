/** Application constants — keep configurable values here. */

export const APP_NAME = 'NetSuite Advanced Template PDF/HTML Friend'
export const APP_SHORT_DESCRIPTION = 'Inspector y formateador de plantillas Advanced PDF/HTML'
export const APP_VERSION = '1.0.0'

/** Ko-fi page. Opens only on explicit user click (extension CSP blocks remote widget scripts). */
export const KOFI_ID = 'E6W7243KBT'
export const KOFI_URL = `https://ko-fi.com/${KOFI_ID}`
export const KOFI_BUTTON_LABEL = 'Support me on Ko-fi'
export const KOFI_BUTTON_COLOR = '#72a4f2'

export const DEFAULT_INDENT = '    '
export const INDENT_OPTIONS = {
  '2spaces': '  ',
  '4spaces': '    ',
  tabs: '\t'
}

export const DEFAULT_FONT_SIZE = 13
export const DEFAULT_PANEL_SPLIT = 50
export const MAX_NESTING_WARNING = 12
export const LARGE_TEMPLATE_CHARS = 100_000
export const AUTOSAVE_DEBOUNCE_MS = 800
export const VALIDATE_DEBOUNCE_MS = 400

export const VOID_HTML_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr'
])

export const FOLDABLE_HTML_TAGS = new Set([
  'style', 'table', 'head', 'body', 'html', 'div', 'thead', 'tbody',
  'tfoot', 'tr', 'td', 'th', 'ul', 'ol', 'li', 'p', 'section', 'header',
  'footer', 'main', 'article', 'form', 'pdf', 'macrolist', 'pagenumber'
])

export const NETSUITE_FIELD_PREFIXES = [
  'custbody_',
  'custcol_',
  'custentity_',
  'custitem_',
  'custrecord_',
  'custscript_',
  'custpage_'
]

export const BFO_TAGS = new Set([
  'pdf', 'body', 'head', 'macrolist', 'macro', 'pagenumber', 'totalpages',
  'barcode', 'link', 'img', 'table', 'tr', 'td', 'th', 'div', 'span',
  'p', 'br', 'hr', 'style', 'html', 'meta', '#document'
])

export const EXPORT_EXTENSIONS = {
  ftl: 'ftl',
  xml: 'xml',
  html: 'html',
  txt: 'txt'
}

export const DEFAULT_FILENAME = 'netsuite-template-formatted'

export const STORAGE_KEYS = {
  theme: 'theme',
  indentStyle: 'indentStyle',
  fontSize: 'fontSize',
  panelSplit: 'panelSplit',
  lastView: 'lastView',
  autosaveEnabled: 'autosaveEnabled',
  autosaveContent: 'autosaveContent',
  formattedEditable: 'formattedEditable',
  structureFilter: 'structureFilter',
  structureCollapsed: 'structureCollapsed'
}

export const PRIVACY_MESSAGE =
  'Tu plantilla se procesa localmente en el navegador. El contenido no se envía a servidores externos.'

export const FORMAT_ERROR_MESSAGE =
  'No fue posible formatear toda la plantilla. El contenido original se conserva y se muestran los errores detectados.'
