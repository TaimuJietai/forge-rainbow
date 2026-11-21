import { build } from 'vite'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const terserOptions = {
  ecma: 5,
  compress: { ecma: 5 },
  mangle: true,
  format: { ecma: 5, comments: false },
}

async function buildEntry({ entry, fileName, name, emptyOutDir }) {
  await build({
    configFile: false,
    root,
    build: {
      outDir: 'dist',
      emptyOutDir,
      target: 'es2015',
      minify: 'terser',
      terserOptions,
      lib: {
        entry: resolve(root, entry),
        formats: ['iife'],
        name,
        fileName: () => fileName,
      },
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
    },
  })
}

await buildEntry({
  entry: 'src/web-view-host.js',
  fileName: 'web-view-host.min.js',
  name: '__webViewHostBundle__',
  emptyOutDir: true,
})

await buildEntry({
  entry: 'src/wechat.js',
  fileName: 'wechat.min.js',
  name: '__webViewHostWechatBundle__',
  emptyOutDir: false,
})

console.log('built dist/web-view-host.min.js + dist/wechat.min.js')
