// The splash in index.html stays at least this long from the start of the page load, so a fast
// start doesn't blink it, then fades out (index.html, "splash-out") and is removed.
const MIN_VISIBLE_MS = 600
const FADE_MS = 200

export function hideSplash(): void {
  const splash = document.getElementById('splash')
  if (!splash) return
  if (getComputedStyle(splash).display === 'none') {
    splash.remove()
    return
  }
  const wait = Math.max(0, MIN_VISIBLE_MS - performance.now())
  window.setTimeout(() => {
    splash.classList.add('splash-out')
    window.setTimeout(() => splash.remove(), FADE_MS)
  }, wait)
}
