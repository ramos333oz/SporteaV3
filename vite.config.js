import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
// ✅ Tailwind v4 - Use dedicated Vite plugin for better performance
// import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    // tailwindcss(), // ✅ Uncomment when migrating to v4
    react()
  ],
  server: {
    port: 3000,
    open: true,
    strictPort: false
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx'
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    commonjsOptions: {
      include: [/node_modules/],
      extensions: ['.js', '.jsx']
    }
  }
})
