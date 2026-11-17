import fs from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

const logoIco = fileURLToPath(new URL('../configuration/logo/logo.ico', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
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
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
