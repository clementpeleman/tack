import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

export default defineConfig({
  plugins: [preact()],
  build: {
    // Class-field helpers for lower targets are emitted as top-level `var`s
    // outside the IIFE and leak onto the host page's window.
    target: 'es2022',
    lib: {
      entry: 'src/script-entry.tsx',
      name: 'TackWidget',
      formats: ['iife'],
      fileName: () => 'tack-widget.js',
    },
    outDir: 'dist',
    emptyOutDir: true,
    minify: true,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
})
