import path from 'path';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: id => {
          // Vendor chunks
          if (id.includes('node_modules')) {
            // React core (split React and React DOM separately)
            if (id.includes('react/') || id.includes('react\\')) {
              return 'react-core';
            }
            if (id.includes('react-dom')) {
              return 'react-dom';
            }

            // React Router (separate from React core)
            if (id.includes('react-router')) {
              return 'react-router';
            }

            // Radix UI components (large UI library)
            if (id.includes('@radix-ui')) {
              return 'radix-ui';
            }

            // Chart library
            if (id.includes('recharts')) {
              return 'charts';
            }

            // Redux
            if (id.includes('@reduxjs') || id.includes('redux')) {
              return 'redux';
            }

            // Socket.io
            if (id.includes('socket.io')) {
              return 'socket';
            }

            // Icons library
            if (id.includes('lucide-react')) {
              return 'icons';
            }

            // Form libraries
            if (
              id.includes('react-hook-form') ||
              id.includes('@hookform') ||
              id.includes('zod')
            ) {
              return 'forms';
            }

            // Date utilities
            if (id.includes('date-fns')) {
              return 'date-utils';
            }

            // Axios and HTTP clients
            if (id.includes('axios')) {
              return 'http-client';
            }

            // Other vendor libraries
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
