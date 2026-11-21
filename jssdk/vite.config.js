import { defineConfig } from 'vite'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
const version = String(pkg.version || '0.0.0')
const outFile = `jssdk.${version}.min.js`

/**
 * H5 业务侧 JSSDK。依赖原生 / 微信侧已提供的 window.webViewHost。
 * 产物文件名带 package.json version，避免 CDN / WebView 缓存旧脚本。
 */
export default defineConfig({
  define: {
    __JSSDK_VERSION__: JSON.stringify(version),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      ecma: 5,
      compress: { ecma: 5 },
      mangle: true,
      format: { ecma: 5, comments: false },
    },
    lib: {
      entry: resolve(root, 'src/index.js'),
      formats: ['iife'],
      name: '__rainbowJssdkBundle__',
      fileName: () => outFile,
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
})
