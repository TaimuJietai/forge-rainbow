import fs from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'node:path'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

const root = fileURLToPath(new URL('.', import.meta.url))
const logoIco = fileURLToPath(new URL('../configuration/logo/logo.ico', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  // Relative asset URLs so native WebViews can load file:// / asset / rawfile bundles.
  base: './',
  server: {
    host: true,
    port: 7003,
    allowedHosts: ['dv.phb.plus', '.phb.plus'],
    // Accessed via https://dv.phb.plus (reverse proxy) → localhost:7003
    hmr: {
      host: 'dv.phb.plus',
      protocol: 'wss',
      clientPort: 443,
    },
  },
  build: {
    // 多页面不可再强制单文件 IIFE + inlineDynamicImports。
    // 远程 https 页使用 ES module；file:// 本地包请走 CDN / 远程 url。
    cssCodeSplit: true,
    modulePreload: false,
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        test: resolve(root, 'test.html'),
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
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
      // 去掉 crossorigin，便于部分 WebView；保留 type="module"（MPA 有共享 chunk）
      name: 'native-webview-html',
      apply: 'build',
      transformIndexHtml(html) {
        return html.replace(/\s+crossorigin(="[^"]*")?/g, '')
      },
    },
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
