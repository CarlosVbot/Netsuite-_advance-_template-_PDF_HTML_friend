/** Token type constants for the template tokenizer and parser. */

export const TokenType = {
  // Markup
  XML_DECL: 'XML_DECL',
  DOCTYPE: 'DOCTYPE',
  OPEN_TAG: 'OPEN_TAG',
  CLOSE_TAG: 'CLOSE_TAG',
  SELF_CLOSING_TAG: 'SELF_CLOSING_TAG',
  HTML_COMMENT: 'HTML_COMMENT',

  // FreeMarker
  FM_OPEN: 'FM_OPEN',
  FM_CLOSE: 'FM_CLOSE',
  FM_INTERMEDIATE: 'FM_INTERMEDIATE',
  FM_SELF_CLOSING: 'FM_SELF_CLOSING',
  FM_INTERPOLATION: 'FM_INTERPOLATION',
  FM_COMMENT: 'FM_COMMENT',
  FM_CUSTOM_OPEN: 'FM_CUSTOM_OPEN',
  FM_CUSTOM_CLOSE: 'FM_CUSTOM_CLOSE',
  FM_CUSTOM_SELF: 'FM_CUSTOM_SELF',

  // Content
  TEXT: 'TEXT',
  CSS_BLOCK: 'CSS_BLOCK',
  WHITESPACE: 'WHITESPACE',

  // Errors / recovery
  UNKNOWN: 'UNKNOWN'
}

export const Severity = {
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
}

export const StructureKind = {
  ROOT: 'root',
  HTML: 'html',
  XML: 'xml',
  FREEMARKER: 'freemarker',
  MACRO: 'macro',
  FUNCTION: 'function',
  LIST: 'list',
  CONDITION: 'condition',
  SWITCH: 'switch',
  CSS: 'css',
  CUSTOM: 'custom',
  ATTEMPT: 'attempt',
  COMPRESS: 'compress',
  ESCAPE: 'escape',
  COMMENT: 'comment',
  INTERPOLATION: 'interpolation'
}
