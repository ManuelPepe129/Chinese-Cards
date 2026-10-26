import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Relative base so the build works under any sub-path (GitHub Pages project sites).
  base: './',
  plugins: [
    react(),
    VitePWA({
      // The new service worker activates immediately and the page reloads, so a redeploy
      // (new data.json included) shows up on every device without manual cache clearing.
      registerType: 'autoUpdate',
      includeAssets: ['icons/favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Mandarin cards',
        short_name: 'Mandarin',
        description: 'Flashcards for learning Mandarin, with Italian translations.',
        lang: 'en',
        display: 'standalone',
        orientation: 'any',
        start_url: './',
        scope: './',
        background_color: '#eef1ee',
        theme_color: '#17695c',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the app shell and the dataset so everything works offline after the first load.
        globPatterns: ['**/*.{js,css,html,svg,png,json,webmanifest}'],
        globIgnores: ['**/data.schema.json'], // editor-only
        // Any navigation (including ?tags=… bookmarks) gets the app shell.
        navigateFallback: 'index.html',
      },
    }),
  ],
  // Listen on all interfaces so phones/tablets on the same network can open the dev and preview servers.
  server: { host: true },
  preview: { host: true },
  test: { environment: 'node', include: ['src/**/*.test.{ts,tsx}'] },
});
