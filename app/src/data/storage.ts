// localStorage can be missing or throw (private mode, blocked storage). Never let that break a page.

export function readSaved(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeSaved(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // Not saved; the choice still works until the page is closed.
  }
}
