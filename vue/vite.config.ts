import fs from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

const logoIco = fileURLToPath(new URL('../configuration/logo/logo.ico', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  // Relative asset URLs so native WebViews can load file:// / asset / rawfile bundles.
  base: './',
  server: {
    host: true,
    port: 7003,
    allowedHosts: ['dv.phb.plus', '.phb.plus'],
  },
  build: {
    // ES modules + crossorigin fail under file:// / resource:// (CORS / null origin).
    // IIFE + classic <script> works in Android / iOS / OHOS embedded WebViews.
    cssCodeSplit: false,
    modulePreload: false,
    rollupOptions: {
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  plugins: [
    vue(),
    vueDevTools(),
    {
      name: 'favicon',
      configureServer(server) {
        server.middlewares.use('/configuration/logo/logo.ico', (_req, res) => {
          res.setHeader('Content-Type', 'image/x-icon')
          fs.createReadStream(logoIco).pipe(res)
        })
      },
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'configuration/logo/logo.ico',
          source: fs.readFileSync(logoIco),
        })
      },
    },
    {
      // Only rewrite HTML for native WebView bundles — never in `vite`/`vite preview` HTML.
      name: 'native-webview-html',
      apply: 'build',
      transformIndexHtml(html) {
        return html
          .replace(/\s+crossorigin(="[^"]*")?/g, '')
          .replace(/\s+type="module"/g, '')
          .replace(/<script(\s[^>]*?)?\ssrc=/g, '<script$1 defer src=')
          .replace(/<script defer defer /g, '<script defer ')
      },
    },

  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})


