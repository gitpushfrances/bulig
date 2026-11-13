import { afterEach, describe, expect, it } from 'vitest'
import { setTheme } from './theme.ts'

// A phone in dark mode force-darkens (inverts) a page that only says "light". The light theme
// must say "only light" so Chrome's Auto Dark Theme and MIUI/Samsung force-dark leave it alone.
describe('theme colour scheme', () => {
  afterEach(() => {
    document.head.querySelector('meta[name="color-scheme"]')?.remove()
    localStorage.clear()
  })

  it('opts the light theme out of force-dark, and lets dark and System say so', () => {
    const meta = document.createElement('meta')
    meta.name = 'color-scheme'
    meta.content = 'light dark'
    document.head.append(meta)

    setTheme('light')
    expect(meta.content).toBe('only light')
    setTheme('dark')
    expect(meta.content).toBe('dark')
    setTheme('system')
    expect(meta.content).toBe('light dark')
  })
})
