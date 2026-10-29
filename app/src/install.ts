import { useSyncExternalStore } from 'react'

// "Install Bulig": the only way a website gets a full-screen, app-like window without the
// browser's address bar. Android/Chrome offers a prompt we can trigger; iPhone needs
// Share > Add to Home Screen, so we explain that instead.

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: InstallPromptEvent | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // keep the browser's own mini bar away; Profile offers the install instead
    deferred = e as InstallPromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    notify()
  })
}

export function isInstalled(): boolean {
  if (typeof window === 'undefined') return false
  const nav = navigator as Navigator & { standalone?: boolean }
  return !!nav.standalone || (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches)
}

export function isIos(): boolean {
  return typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false
  await deferred.prompt()
  const { outcome } = await deferred.userChoice
  deferred = null
  notify()
  return outcome === 'accepted'
}

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  return () => listeners.delete(onChange)
}

export function useInstall() {
  const canPrompt = useSyncExternalStore(subscribe, () => deferred !== null)
  return { canPrompt, installed: isInstalled(), ios: isIos() }
}
