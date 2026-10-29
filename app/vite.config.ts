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
  // MapLibre is one ~1 MB file (273 kB gzipped) that loads only on the Map tab; the app itself is small.
  build: { chunkSizeWarningLimit: 1100 },
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
        theme_color: '#fafafa',
        background_color: '#fafafa',
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
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
})
