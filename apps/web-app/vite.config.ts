import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
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
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          query: ['@tanstack/react-query'],
          router: ['react-router-dom'],
          ui: ['react-hot-toast', 'react-i18next'],
          radix: ['@radix-ui/react-dialog', '@radix-ui/react-popover', '@radix-ui/react-select'],
          'radix-ui': [
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-label',
            '@radix-ui/react-separator',
            '@radix-ui/react-tabs'
          ],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
});
