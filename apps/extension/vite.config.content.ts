import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

// Content script: a single self-contained IIFE (MV3 content scripts cannot be
// ES modules). Bundles @tack/widget's ESM build, so build the widget first.
export default defineConfig({
  plugins: [preact()],
  build: {
    lib: {
      entry: 'src/content.ts',
      name: 'TackContent',
      formats: ['iife'],
      fileName: () => 'content.js',
    },
    outDir: 'dist',
    emptyOutDir: true,
    minify: true,
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
})
