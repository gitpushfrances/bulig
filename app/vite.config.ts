import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Bulig: Help Along the Way',
        short_name: 'Bulig',
        description: 'Checked emergency numbers and road services, even offline.',
        lang: 'en',
        start_url: '/',
        display: 'standalone',
        theme_color: '#f1f6f8',
        background_color: '#f1f6f8',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // The data files are precached with the app shell, so the first visit is enough to work
        // offline. Each deploy changes their hash and the service worker fetches the new ones.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}', 'data/**/*.json'],
        // Only the Latin font files go in the offline cache; other scripts load when a page needs them.
        globIgnores: ['**/*-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese}-wght-normal-*.woff2'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
})
