// The splash in index.html. index.html marks the moment it first shows ('bulig-splash'), and it
// stays at least MIN_VISIBLE_MS from then, so on a slow network (the HTML arriving late) it is still
// seen, and on a fast one it doesn't blink. Then it fades out (index.html, "splash-out").
const MIN_VISIBLE_MS = 700
const FADE_MS = 320

let resolveGone: () => void = () => {}
const gone = new Promise<void>((resolve) => {
  resolveGone = resolve
})

function shownAt(): number {
  return performance.getEntriesByName('bulig-splash')[0]?.startTime ?? 0
}

function remove(splash: HTMLElement) {
  splash.remove()
  resolveGone()
}

export function hideSplash(): void {
  const splash = document.getElementById('splash')
  if (!splash || getComputedStyle(splash).display === 'none') {
    if (splash) remove(splash)
    else resolveGone()
    return
  }
  const wait = Math.max(0, shownAt() + MIN_VISIBLE_MS - performance.now())
  window.setTimeout(() => {
    splash.classList.add('splash-out')
    window.setTimeout(() => remove(splash), FADE_MS)
  }, wait)
}

// Resolves once the splash is off the screen (at once when there was none), so nothing, such as
// the location permission prompt, appears over it.
export function whenSplashGone(): Promise<void> {
  if (!document.getElementById('splash')) resolveGone()
  return gone
}
