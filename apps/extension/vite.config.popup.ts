import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

// Popup UI built as an IIFE referenced by popup.html via <script src>.
// emptyOutDir is false so it lands alongside content.js (built first).
export default defineConfig({
  plugins: [preact()],
  build: {
    lib: {
      entry: 'src/popup/popup.tsx',
      name: 'TackPopup',
      formats: ['iife'],
      fileName: () => 'popup.js',
    },
    outDir: 'dist',
    emptyOutDir: false,
    minify: true,
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
})
