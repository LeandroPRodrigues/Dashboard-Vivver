import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    target: 'esnext',
    assetsInlineLimit: 100000000, // Força inlinar tudo (CSS, imagens, SVG)
    chunkSizeWarningLimit: 100000000,
    cssCodeSplit: false, // Coloca todo CSS no mesmo arquivo
    brotliSize: false,
    rollupOptions: {
      inlineDynamicImports: true, // Garante que não haja code-splitting
      output: {
        manualChunks: undefined,
      },
    },
  },
});