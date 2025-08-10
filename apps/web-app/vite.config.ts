import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    process.env.ANALYZE && visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@almus/shared-types': path.resolve(
        __dirname,
        '../../libs/shared-types/dist'
      ),
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@tanstack/react-query',
      '@supabase/supabase-js',
      'react-router-dom',
      'react-hot-toast',
      'react-i18next',
      'date-fns',
      'clsx',
    ],
    exclude: ['@radix-ui/react-dialog', '@radix-ui/react-popover'], // Lazy load heavy UI components
    force: false, // Prevent unnecessary re-bundling
  },
  server: {
    port: 3000,
    host: true,
    hmr: {
      overlay: false, // Reduce HMR overlay interference
      timeout: 5000, // Reduced timeout for faster feedback
    },
    watch: {
      usePolling: false, // Use native file watching for better performance
      interval: 100, // Reduced polling interval if usePolling is true
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV !== 'production',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        passes: 2,
      },
      mangle: {
        safari10: true,
      },
    },
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core React chunks
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react-vendor';
          }
          
          // Supabase and database
          if (id.includes('@supabase') || id.includes('supabase')) {
            return 'supabase';
          }
          
          // React Query and state management
          if (id.includes('@tanstack/react-query') || id.includes('@reduxjs')) {
            return 'state-management';
          }
          
          // Router
          if (id.includes('react-router')) {
            return 'router';
          }
          
          // UI libraries - split into smaller chunks
          if (id.includes('@radix-ui')) {
            return 'radix-ui';
          }
          
          if (id.includes('lucide-react')) {
            return 'icons';
          }
          
          // Charts and data visualization
          if (id.includes('recharts') || id.includes('react-beautiful-dnd')) {
            return 'charts-dnd';
          }
          
          // Virtualization and performance
          if (id.includes('react-window') || id.includes('react-virtualized')) {
            return 'virtualization';
          }
          
          // Utilities
          if (id.includes('date-fns') || id.includes('clsx') || id.includes('class-variance-authority')) {
            return 'utils';
          }
          
          // Excel and file handling
          if (id.includes('xlsx') || id.includes('socket.io')) {
            return 'file-socket';
          }
          
          // Internationalization
          if (id.includes('react-i18next') || id.includes('i18next')) {
            return 'i18n';
          }
          
          // Toast and notifications
          if (id.includes('react-hot-toast')) {
            return 'notifications';
          }
          
          // Break down large vendor packages
          if (id.includes('node_modules')) {
            // Separate specific large libraries
            if (id.includes('@radix-ui') || id.includes('radix-ui')) {
              return 'radix-ui';
            }
            if (id.includes('react-beautiful-dnd')) {
              return 'dnd';
            }
            if (id.includes('react-window') || id.includes('react-virtualized')) {
              return 'virtualization';
            }
            if (id.includes('recharts')) {
              return 'charts';
            }
            // Other smaller packages
            return 'vendor';
          }
        },
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop().replace(/\.\w+$/, '')
            : 'chunk';
          return `assets/[name]-[hash].js`;
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
});
