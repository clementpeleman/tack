import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

// ESM library build of the widget so other workspace packages (the browser
// extension) can `import { mountTackWidget }`. The widget code, its deps
// (preact, @medv/finder, modern-screenshot, @tack/shared) and the CSS are all
// bundled and pre-compiled, so consumers get a self-contained module with no
// node_modules-transform concerns.
export default defineConfig({
  plugins: [preact()],
  build: {
    lib: {
      entry: 'src/index.tsx',
      formats: ['es'],
      fileName: () => 'index.js',
    },
    outDir: 'dist',
    // Coexist with the IIFE build (tack-widget.js) produced by vite.config.ts.
    emptyOutDir: false,
    minify: false,
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
})
