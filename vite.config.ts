import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  build: {
    chunkSizeWarningLimit: 450,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/framer-motion')) {
            return 'motion-vendor';
          }
          return undefined;
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/apple-touch-icon.png', 'brand/flash-gordon-logo.png'],
      manifest: {
        id: '/',
        name: 'Fargo Climb - Elite Pool Training',
        short_name: 'Fargo Climb',
        description: 'One-hour-per-day training program from 550 to 800+ Fargo rating',
        theme_color: '#080f18',
        background_color: '#080f18',
        lang: 'en',
        scope: '/',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone', 'minimal-ui', 'browser'],
        orientation: 'portrait',
        start_url: '/',
        prefer_related_applications: false,
        categories: ['sports', 'education', 'productivity'],
        icons: [
          {
            src: '/icons/pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/pwa-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: '/icons/pwa-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
          },
        ],
        shortcuts: [
          {
            name: 'Today Session',
            short_name: 'Session',
            url: '/session/today',
            description: 'Jump directly into your current training session',
            icons: [
              {
                src: '/icons/pwa-192.png',
                sizes: '192x192',
                type: 'image/png',
              },
            ],
          },
          {
            name: 'KPI Tracker',
            short_name: 'KPI',
            url: '/kpi',
            description: 'Open KPI tracking and weekly benchmark status',
            icons: [
              {
                src: '/icons/pwa-192.png',
                sizes: '192x192',
                type: 'image/png',
              },
            ],
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,json}'],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
});
