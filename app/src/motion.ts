import { flushSync } from 'react-dom'

// Smooth adds and removes (John, 2026-11-06). Runs a state change inside a View Transition where the
// phone has one (Chrome on Android 111+): elements given a view-transition-name, such as the cards on
// Saved, glide to their new place and a removed one fades out. The page itself doesn't crossfade
// (index.css, "View transitions"). Elsewhere, and under reduced motion, the change simply happens.
type WithTransitions = Document & { startViewTransition?: (update: () => void) => unknown }

export function reducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function smoothly(update: () => void): void {
  const doc = document as WithTransitions
  if (typeof doc.startViewTransition !== 'function' || reducedMotion() || document.visibilityState !== 'visible') {
    update()
    return
  }
  try {
    doc.startViewTransition(() => flushSync(update))
  } catch {
    update()
  }
}

// A view-transition-name for a list item: a valid CSS name, unique per list.
export function transitionName(prefix: string, id: string): string {
  return `${prefix}-${id.replace(/[^a-zA-Z0-9_-]/g, '_')}`
}
