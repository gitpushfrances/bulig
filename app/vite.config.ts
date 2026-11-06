import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

// Shown in Profile: "Bulig v0.3.0 (build abc1234)". Cloudflare passes the commit; locally, ask git.
const version: string = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version
function buildId(): string {
  const fromCi = process.env.WORKERS_CI_COMMIT_SHA ?? process.env.CF_PAGES_COMMIT_SHA
  if (fromCi) return fromCi.slice(0, 7)
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return 'dev'
  }
}

// https://vite.dev/config/
export default defineConfig({
  build: {
    // Phones from about 2020 on, including old iPhones on iOS 14–15 and the in-app browsers
    // (Facebook, Messenger) that shared links open in: newer syntax is compiled down for them.
    target: ['es2020', 'chrome87', 'edge88', 'firefox78', 'safari14'],
    // MapLibre is one ~1 MB file (273 kB gzipped) that loads only on the Map tab; the app itself is small.
    chunkSizeWarningLimit: 1100,
  },
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __BUILD_ID__: JSON.stringify(buildId()),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Bulig: Help Along the Way',
        short_name: 'Bulig',
        description: 'Checked emergency numbers and road services, even offline.',
        lang: 'en',
        id: '/',
        start_url: '/',
        scope: '/',
        // Installed, Bulig opens without the browser's address bar, like any other app.
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        // Android paints background_color (with the icon) before the page loads. One colour only, so
        // it matches the splash in index.html in every theme: no white flash in dark mode.
        theme_color: '#09090b',
        background_color: '#09090b',
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
        globPatterns: ['**/*.{js,css,html,svg,png,webp,ico,woff2}', 'data/**/*.json'],
        // Only the Latin font files go in the offline cache; other scripts load when a page needs them.
        // The map library loads only on the Map tab and needs a connection anyway, so it stays out.
        globIgnores: [
          '**/*-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese}-wght-normal-*.woff2',
          '**/maplibre-gl-*.{js,css}',
        ],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        // With VITE_DATA_SOURCE=api: the last good API answers, for when the server is asleep or the
        // phone is offline (docs/API.md §1, Caching). The bundled JSON files stay the last resort.
        runtimeCaching: [
          // The map library, kept once it has loaded: the next visit draws the map without the 270 kB
          // download, and a phone on an older version still finds its file after a deploy.
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && /\/assets\/maplibre-gl-[^/]+\.(js|css)$/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'bulig-maplibre',
              expiration: { maxEntries: 4 },
              cacheableResponse: { statuses: [200] },
            },
          },
          // OpenFreeMap: the style, fonts, icons and the tile index (/planet, weekly) change rarely (use the copy, refresh behind it).
          {
            urlPattern: /^https:\/\/tiles\.openfreemap\.org\/((styles|fonts|sprites)\/|planet$)/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'bulig-map-style',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [200] },
            },
          },
          // Map tiles: their URLs carry the data version, so a stored tile never goes wrong. The last
          // ~500 viewed (a few towns, about 10-20 MB) come back instantly and on a weak signal.
          {
            urlPattern: /^https:\/\/tiles\.openfreemap\.org\/(planet|natural_earth)\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'bulig-map-tiles',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30, purgeOnQuotaError: true },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            urlPattern: /^https:\/\/[^/]+\/api\/v1\/(areas|emergency-contacts|services|labels)\?/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'bulig-api',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
})
