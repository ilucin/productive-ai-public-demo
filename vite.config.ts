import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// Served from GitHub Pages under the repo name, so every asset URL is prefixed.
// `npm run dev` honours the same base — open http://localhost:5173/productive-ai-public-demo/
export default defineConfig({
  base: '/productive-ai-public-demo/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: 'query', test: /node_modules[\\/]@tanstack[\\/]/ },
            { name: 'radix', test: /node_modules[\\/]@radix-ui[\\/]/ },
            { name: 'vendor', test: /node_modules/ },
          ],
        },
      },
    },
  },
})
