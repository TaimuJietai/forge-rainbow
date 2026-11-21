import { defineConfig } from 'vite'
import { resolve } from 'node:path'

/**
 * Android evaluateJavascript 对带注释的源码易出错。
 * 产物必须：单文件 IIFE、ES5、terser 去掉全部注释。
 */
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      ecma: 5,
      compress: { ecma: 5 },
      mangle: true,
      format: {
        ecma: 5,
        comments: false,
      },
    },
    lib: {
      entry: resolve(__dirname, 'src/web-view-host.js'),
      formats: ['iife'],
      name: '__webViewHostBundle__',
      fileName: () => 'web-view-host.min.js',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        // IIFE 入口副作用：挂 window.webViewHost，不依赖默认导出名
        intro: '',
      },
    },
  },
})
