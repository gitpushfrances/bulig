import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Regenerate the app icons from favicon.svg with: npx pwa-assets-generator
export default defineConfig({
  preset: minimal2023Preset,
  images: ['public/favicon.svg'],
})
