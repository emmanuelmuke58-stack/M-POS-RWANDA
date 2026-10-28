import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['apple-touch-icon.png', 'icon.svg'],
        manifest: {
          id: '/',
          name: 'Fresh & More M-POS',
          short_name: 'Fresh M-POS',
          description: 'High-speed handheld Mobile Point of Sale (M-POS) for retail and grocery checkouts.',
          theme_color: '#0c4a26',
          background_color: '#0c4a26',
          display: 'standalone',
          orientation: 'portrait-primary',
          start_url: '/',
          scope: '/',
          categories: ['business', 'shopping', 'finance'],
          shortcuts: [
            {
              name: 'New Sale Register',
              short_name: 'Register',
              description: 'Open M-POS checkout terminal',
              url: '/?tab=pos',
            },
            {
              name: 'Scan Barcode',
              short_name: 'Scan',
              description: 'Quick barcode product scanner',
              url: '/?tab=pos&scan=1',
            },
            {
              name: 'Orders & Receipts',
              short_name: 'Receipts',
              description: 'View sales ledger and reprint receipts',
              url: '/?tab=sales',
            },
          ],
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^\/api\/time/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'time-api-cache',
                networkTimeoutSeconds: 2,
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: false,
    },
  };
});
