import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Regenerate the app icons with: npx pwa-assets-generator, then move the files it writes in brand/ to public/.
// brand/bulig-icon.png is brand/bulig-logo.png trimmed and centred on a white square.
export default defineConfig({
  preset: minimal2023Preset,
  images: ['brand/bulig-icon.png'],
})
