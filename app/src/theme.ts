import { useSyncExternalStore } from 'react'
import { readSaved, writeSaved } from './data/storage.ts'

// The person's theme choice. Light is the default (John, 2026-11-07); "system" follows the phone. index.html applies the saved choice
// before the app loads, so the page never flashes the wrong colours.
export type ThemeChoice = 'system' | 'light' | 'dark'

const KEY = 'bulig.theme'
// Matches --color-bg in index.css, for the browser and status bar colour.
const BAR = { light: '#f4f7f5', dark: '#09090b' }

const listeners = new Set<() => void>()
const darkQuery = () => (typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null)

export function readTheme(): ThemeChoice {
  const value = readSaved(KEY)
  return value === 'dark' || value === 'system' ? value : 'light'
}

// What is on screen now: the choice, or the phone's setting under "system".
export function resolvedTheme(choice = readTheme()): 'light' | 'dark' {
  return choice === 'system' ? (darkQuery()?.matches ? 'dark' : 'light') : choice
}

function apply(choice: ThemeChoice) {
  const root = document.documentElement
  if (choice === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', choice)
  // "only light" stops a dark-mode phone from force-darkening (inverting) the light page.
  const scheme = { system: 'light dark', light: 'only light', dark: 'dark' }[choice]
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', scheme)
  const bar = BAR[resolvedTheme(choice)]
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
    // A fixed choice overrides both media-specific tags; "system" restores them.
    m.setAttribute('content', choice === 'system' ? (m.getAttribute('media')?.includes('dark') ? BAR.dark : BAR.light) : bar)
  })
}

export function setTheme(choice: ThemeChoice) {
  // Nothing saved means light, the default.
  writeSaved(KEY, choice === 'light' ? null : choice)
  apply(choice)
  listeners.forEach((l) => l())
}

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  const query = darkQuery()
  query?.addEventListener('change', onChange)
  return () => {
    listeners.delete(onChange)
    query?.removeEventListener('change', onChange)
  }
}

export function useTheme(): { choice: ThemeChoice; resolved: 'light' | 'dark' } {
  const choice = useSyncExternalStore(subscribe, readTheme)
  const resolved = useSyncExternalStore(subscribe, () => resolvedTheme(choice))
  return { choice, resolved }
}
