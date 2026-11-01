import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hideSplash } from './splash.ts'

describe('splash', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    document.body.innerHTML = '<div id="splash"></div>'
  })

  afterEach(() => {
    vi.useRealTimers()
    document.documentElement.classList.remove('no-splash')
    document.head.querySelector('style[data-test]')?.remove()
  })

  it('stays a moment, fades out, then leaves the page', () => {
    vi.spyOn(performance, 'now').mockReturnValue(100)
    hideSplash()

    const splash = document.getElementById('splash')!
    vi.advanceTimersByTime(499)
    expect(splash).not.toHaveClass('splash-out')
    vi.advanceTimersByTime(1)
    expect(splash).toHaveClass('splash-out')
    vi.advanceTimersByTime(200)
    expect(document.getElementById('splash')).toBeNull()
  })

  it('goes at once when it was never shown (a second open, or Emergency)', () => {
    document.head.insertAdjacentHTML('beforeend', '<style data-test>.no-splash #splash { display: none }</style>')
    document.documentElement.classList.add('no-splash')
    hideSplash()

    expect(document.getElementById('splash')).toBeNull()
  })
})
