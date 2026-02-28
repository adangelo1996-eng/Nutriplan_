import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    outDir: 'dist',
    lib: {
      entry: resolve(__dirname, 'src/main.jsx'),
      name: 'CasaScene',
      fileName: 'casa-scene',
      formats: ['iife'],
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        assetFileNames: 'casa-scene.[ext]',
        banner: "(function(g){g.process=g.process||{env:{NODE_ENV:'production'}};})(typeof globalThis!=='undefined'?globalThis:typeof window!=='undefined'?window:this);",
      },
    },
  },
});
