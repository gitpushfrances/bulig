// Getting MapLibre onto the page, and telling apart the reasons it can't be.
//
// Why the map used to fall back to the list for no clear reason:
// - After a deploy, a phone still running the old app asks for the old MapLibre file, which is gone.
//   The service worker now keeps the one it last loaded (vite.config.ts), and a failed chunk reloads
//   the app once (main.tsx, "vite:preloadError"), which brings the new version.
// - Weak signal: the 270 kB download fails or the tiles never arrive. The Map tab gives up after
//   LOAD_TIMEOUT_MS and offers Try again, instead of a spinner forever.
// - No WebGL (some cheap phones, some in-app browsers): the map can't be drawn at all.

export type MapProblem = 'offline' | 'no-webgl' | 'failed'

// From creating the map to its first full draw (style, fonts and the first tiles).
export const LOAD_TIMEOUT_MS = 20_000

export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

const RELOAD_KEY = 'bulig.chunk-reload'
const RELOAD_GAP_MS = 60_000

// A lazily loaded file failed: usually a deploy replaced it. Reload once to get the new app, but
// never twice within a minute, so a real outage doesn't become a reload loop.
export function reloadOnceForNewBuild(now = Date.now()): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0)
    if (now - last < RELOAD_GAP_MS) return false
    sessionStorage.setItem(RELOAD_KEY, String(now))
  } catch {
    return false // storage blocked: can't guard against a loop, so don't reload
  }
  window.location.reload()
  return true
}

// What the fallback list says, per reason. Never "needs a connection" when the signal is fine.
export const PROBLEM_TEXT: Record<MapProblem, { lead: string; hint?: string }> = {
  offline: { lead: 'No signal, so no map right now.' },
  'no-webgl': {
    lead: "This browser can't draw the map.",
    hint: 'If you opened Bulig from Messenger or Facebook, open it in Chrome instead.',
  },
  failed: { lead: "The map didn't load." },
}
