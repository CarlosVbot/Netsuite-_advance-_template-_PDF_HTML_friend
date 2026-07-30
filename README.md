# NetSuite Advanced Template PDF/HTML Friend

Extensión de Chrome (Manifest V3) para **inspeccionar, formatear, validar y exportar** plantillas **Advanced PDF/HTML** de NetSuite.

Combina XML, HTML, CSS, etiquetas BFO y FreeMarker (FTL). Toda la interfaz está en **español**. El procesamiento es **100 % local** en el navegador: la plantilla **nunca se envía a servidores externos**.

## Qué hace

- Pega plantillas grandes y mal formateadas y obtén código legible e indentado.
- Resalta la sintaxis (HTML/XML, FreeMarker, interpolaciones, campos `cust*`, comentarios, etc.).
- Identifica bloques de apertura/cierre FreeMarker y HTML (matching).
- Muestra un árbol de **Estructura** navegable.
- Valida anidamiento, cierres, macros y advertencias orientadas a NetSuite.
- Copia o descarga el resultado (`.ftl`, `.xml`, `.html`, `.txt`).
- Compara dos versiones con un visor de diferencias local.

## Características

| Área | Detalle |
|------|---------|
| Formateador | Indentación configurable (2 espacios, 4 espacios, tabulaciones) |
| Parser | Tokenizador + parser estructural por pila (no solo regex) |
| FreeMarker | `if/elseif/else`, `list`, macros, funciones, switch, attempt, custom `@`, `${}`, comentarios |
| Validación | Errores, advertencias e información con navegación a la línea |
| Diff | Comparación lado a lado, navegación entre cambios |
| Privacidad | Sin analytics, sin telemetría, sin APIs remotas |
| Editor | CodeMirror 6, números de línea, búsqueda, plegado, guías de matching |

## Privacidad

> Tu plantilla se procesa localmente en el navegador. El contenido no se envía a servidores externos.

- Solo se usa `chrome.storage.local` para preferencias (tema, sangría, tamaño de fuente, paneles).
- El guardado automático del contenido del editor está **desactivado por defecto**.
- Puede eliminar los datos locales desde Configuración.
- El enlace a Ko-fi es opcional y solo se abre con un clic explícito.

## Requisitos

- Node.js 18+ (recomendado 20+)
- npm 9+
- Google Chrome / Chromium (Manifest V3)

## Instalación para desarrollo

```bash
git clone <url-del-repositorio>
cd Netsuite-_advance-_template-_PDF_HTML_friend
npm install
```

## Comandos

```bash
# Servidor de desarrollo (Vite)
npm run dev

# Tests unitarios (Vitest)
npm test

# Tests en modo watch
npm run test:watch

# Build de producción → carpeta dist/
npm run build
```

## Cargar la extensión en Chrome

1. Ejecute `npm run build`.
2. Abra `chrome://extensions`.
3. Active el **Modo de desarrollador**.
4. Pulse **Cargar descomprimida**.
5. Seleccione la carpeta `dist/` del proyecto.
6. Haga clic en el icono de la extensión: se abrirá `editor.html` en una pestaña dedicada.

## Empaquetado para Chrome Web Store

1. Actualice la versión en `package.json` y `public/manifest.json`.
2. Ejecute `npm run build` y `npm test`.
3. Compruebe que `dist/` contiene:
   - `manifest.json`
   - `editor.html`
   - `background.js`
   - `assets/*`
   - `icons/*`
   - `_locales/es/messages.json`
4. Comprima el **contenido** de `dist/` (no la carpeta padre) en un ZIP.
5. Suba el ZIP en la [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).

## Estructura del proyecto

```text
├── public/
│   ├── manifest.json
│   ├── icons/
│   └── _locales/es/
├── src/
│   ├── components/          # UI Vue (español)
│   ├── parser/              # Tokenizador + parser estructural
│   ├── formatter/           # Formateo por tokens
│   ├── validation/          # FreeMarker, XML, NetSuite
│   ├── editor/              # CodeMirror language, theme, fold, match
│   ├── services/            # storage, export, clipboard, diff
│   ├── utils/
│   ├── App.vue
│   ├── main.js
│   ├── background.js
│   └── styles.css
├── tests/
│   ├── fixtures/            # Plantillas de ejemplo
│   └── *.test.js
├── editor.html
├── vite.config.js
├── package.json
└── README.md
```

## Uso rápido

1. Pegue la plantilla Advanced PDF/HTML en el panel **Original**.
2. Pulse **Formatear**.
3. Revise el panel **Formateado**, el árbol **Estructura** y **Problemas detectados**.
4. Use **Copiar resultado** o **Descargar FTL**.
5. **Deshacer formato** restaura el original capturado antes del formateo.
6. **Comparar versiones** abre el modo diff local.

## Limitaciones conocidas

- No es un motor FreeMarker completo ni un renderizador PDF BFO.
- El formateo es estructural y conservador; no reescribe expresiones.
- Algunos casos HTML5 “sueltos” se tratan con prioridad XML (comportamiento Advanced PDF).
- La vista previa PDF no forma parte del MVP (seguridad y complejidad del motor BFO).
- Plantillas enormes (>500 KB) pueden tardar más; la UI muestra un indicador de progreso.
- El resaltado de sintaxis usa un stream parser (CodeMirror) y puede no cubrir 100 % de casos edge.

## Seguridad

- Sin `eval` ni `new Function`.
- Sin scripts remotos ni CDN.
- CSP de extensión: `script-src 'self'; object-src 'self'`.
- El código pegado se muestra solo como texto en el editor (no se ejecuta HTML).
- Permisos mínimos: `storage`.

## Licencia

Proyecto de utilidad para desarrolladores y consultores NetSuite. Ajuste el enlace de Ko-fi en `src/utils/constants.js` (`KOFI_URL`).

## Créditos

Nombre del producto: **NetSuite Advanced Template PDF/HTML Friend**.  
Diseño original (graphite / navy / naranja forge). No utiliza logotipos oficiales de NetSuite u Oracle.
