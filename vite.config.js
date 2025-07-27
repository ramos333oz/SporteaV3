import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const isProduction = mode === 'production'

  return {
    plugins: [
      react({
        jsxImportSource: '@emotion/react',
        babel: {
          plugins: ['@emotion/babel-plugin']
        }
      })
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
    assetsInclude: ['**/*.PNG', '**/*.jpeg', '**/*.jpg'],
    optimizeDeps: {
      force: true,
      include: [
        'react',
        'react-dom',
        'react/jsx-dev-runtime',
        'react/jsx-runtime',
        '@emotion/react',
        '@emotion/styled',
        '@emotion/cache',
        '@emotion/serialize',
        '@emotion/utils',
        '@mui/material',
        '@mui/icons-material',
        '@mui/material/styles',
        '@mui/material/utils',
        '@mui/material/AppBar',
        '@mui/material/Toolbar',
        '@mui/material/Typography',
        '@mui/material/IconButton',
        '@mui/material/Drawer',
        '@mui/material/List',
        '@mui/material/ListItem',
        '@mui/material/ListItemButton',
        '@mui/material/ListItemIcon',
        '@mui/material/ListItemText',
        '@mui/material/Box',
        '@mui/material/Avatar',
        '@mui/material/Divider',
        '@mui/system',
        '@mui/styled-engine',
        '@mui/x-date-pickers',
        '@mui/x-date-pickers/DatePicker',
        '@mui/x-date-pickers/LocalizationProvider',
        '@mui/x-date-pickers/AdapterDateFns'
      ],
      exclude: [
        // Exclude problematic dependencies that should be handled by Vite naturally
      ],
      esbuildOptions: {
        loader: {
          '.js': 'jsx'
        }
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: !isProduction, // Disable source maps in production for security
      minify: isProduction ? 'terser' : 'esbuild',
      target: 'es2015', // Better browser compatibility
      rollupOptions: {
        output: {
          manualChunks: {
            // Split vendor chunks for better caching and smaller uploads
            vendor: ['react', 'react-dom'],
            supabase: ['@supabase/supabase-js', '@supabase/auth-helpers-react'],
            ui: ['antd'],
            mui: ['@mui/material', '@mui/icons-material'],
            maps: ['leaflet', 'react-leaflet', 'leaflet.markercluster'],
            utils: ['date-fns', 'moment', 'uuid'],
            charts: ['recharts']
          }
        }
      },
      commonjsOptions: {
        include: [/node_modules/],
        extensions: ['.js', '.jsx']
      },
      // Production optimizations
      ...(isProduction && {
        terserOptions: {
          compress: {
            drop_console: true, // Remove console.logs in production
            drop_debugger: true
          }
        }
      })
    },
    // Environment-specific settings
    define: {
      __DEV__: !isProduction
    }
  }
})
