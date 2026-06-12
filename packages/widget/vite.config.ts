import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

export default defineConfig({
  plugins: [preact()],
  build: {
    lib: {
      entry: 'src/index.tsx',
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
