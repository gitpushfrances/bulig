import { useEffect, useState } from 'react'
import { readSaved, writeSaved } from '../data/storage.ts'

// Home's welcome header: a greeting by the phone's clock and a short line that changes each visit.

// 5:00–11:59 morning, 12:00–16:59 afternoon, 17:00–23:59 evening, 0:00–4:59 "Up late?".
export function greeting(now: Date): string {
  const h = now.getHours()
  if (h < 5) return 'Up late?'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// Short enough for two lines at 360px. Bulig points people to help; it never sends help itself
// (CLAUDE.md), so nothing here says Bulig comes, dispatches or assists on the road.
export const WELCOME_MESSAGES = [
  'Help is just a tap away.',
  "Wherever you go, we've got your back.",
  'Need a hand? Bulig is here.',
  'Your journey matters. Travel with confidence.',
  'A little help goes a long way.',
  'Making every journey easier.',
  "We're here when you need a hand.",
  'Find help, find essentials, keep moving.',
  'Your everyday travel companion.',
  'Wherever the road takes you, Bulig is here.',
  'Travel easier. Worry less.',
  'Ready to help you along the way.',
  'Your next helping hand is just a tap away.',
  'Making roadside help easier to find.',
  'Explore nearby essentials with ease.',
  'Wherever you are, help is within reach.',
  'Flat tire? Empty tank? We know where to go.',
  'Ride safe. We have the numbers you need.',
  'Every road is easier with a little bulig.',
] as const

const LAST_KEY = 'bulig.welcome'

// Any message but the last one shown. `random` is injectable for tests.
export function pickWelcome(last: number | null, random: () => number = Math.random): number {
  const n = WELCOME_MESSAGES.length
  if (last === null || last < 0 || last >= n) return Math.floor(random() * n)
  // Pick among the n-1 others, then skip over `last`.
  const i = Math.floor(random() * (n - 1))
  return i >= last ? i + 1 : i
}

function nextWelcome(): number {
  const saved = Number.parseInt(readSaved(LAST_KEY) ?? '', 10)
  const index = pickWelcome(Number.isNaN(saved) ? null : saved)
  writeSaved(LAST_KEY, String(index))
  return index
}

// Back after this long in the background counts as opening the app again.
export const REOPEN_MS = 5 * 60 * 1000

// The greeting and message for this visit. Picked once when Home mounts (opening the app, or coming
// back to Home from another tab), never on a re-render. Returning to the app re-reads the clock, and
// after REOPEN_MS away it also picks a new message.
export function useWelcome(): { greeting: string; message: string } {
  const [state, setState] = useState(() => ({ greeting: greeting(new Date()), index: nextWelcome() }))

  useEffect(() => {
    let hiddenAt: number | null = null
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now()
        return
      }
      const away = hiddenAt === null ? 0 : Date.now() - hiddenAt
      hiddenAt = null
      setState((s) => {
        const g = greeting(new Date())
        if (away >= REOPEN_MS) return { greeting: g, index: nextWelcome() }
        return g === s.greeting ? s : { ...s, greeting: g }
      })
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  return { greeting: state.greeting, message: WELCOME_MESSAGES[state.index] }
}
