import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { copyFileSync, mkdirSync, readdirSync, statSync, existsSync, writeFileSync, readFileSync } from 'fs'

function copyDirRecursive(src, dest) {
  mkdirSync(dest, { recursive: true })
  for (const file of readdirSync(src)) {
    const s = resolve(src, file)
    const d = resolve(dest, file)
    if (statSync(s).isDirectory()) copyDirRecursive(s, d)
    else copyFileSync(s, d)
  }
}

function chromeExtensionPlugin() {
  return {
    name: 'chrome-extension',
    closeBundle() {
      const dist = resolve(__dirname, 'dist')
      const publicDir = resolve(__dirname, 'public')

      // Copy manifest
      if (existsSync(resolve(publicDir, 'manifest.json'))) {
        copyFileSync(resolve(publicDir, 'manifest.json'), resolve(dist, 'manifest.json'))
      }

      // Copy icons
      const iconsSrc = resolve(publicDir, 'icons')
      const iconsDest = resolve(dist, 'icons')
      if (existsSync(iconsSrc)) {
        copyDirRecursive(iconsSrc, iconsDest)
      }

      // Copy locales (required when default_locale is set)
      const localesSrc = resolve(publicDir, '_locales')
      const localesDest = resolve(dist, '_locales')
      if (existsSync(localesSrc)) {
        copyDirRecursive(localesSrc, localesDest)
      }

      // Copy background service worker
      const bgSrc = resolve(__dirname, 'src/background.js')
      if (existsSync(bgSrc)) {
        copyFileSync(bgSrc, resolve(dist, 'background.js'))
      }

      // Ensure editor.html references relative assets correctly
      const editorHtml = resolve(dist, 'editor.html')
      if (existsSync(editorHtml)) {
        let html = readFileSync(editorHtml, 'utf-8')
        // Vite may emit absolute paths; force relative for extension
        html = html.replace(/(src|href)="\//g, '$1="./')
        // Fix favicon for packaged extension
        html = html.replace(/href="\.\/public\/icons\//g, 'href="./icons/')
        writeFileSync(editorHtml, html)
      }
    }
  }
}

export default defineConfig({
  plugins: [vue(), chromeExtensionPlugin()],
  base: './',
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        editor: resolve(__dirname, 'editor.html')
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    },
    sourcemap: false,
    minify: true,
    target: 'chrome110'
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js']
  }
})
