import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Set base path for GitHub Pages deployment at /yotome/
  base: process.env.NODE_ENV === 'production' ? '/yotome/' : '/',
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Ensure assets are properly referenced with base path
    assetsDir: 'assets',
    // Better compatibility for CI environments
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
    // Ensure consistent builds across environments
    target: 'es2020',
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
  define: {
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify(
      process.env.VITE_API_BASE_URL || 'http://localhost:8000'
    ),
  },
})
