import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hideSplash, whenSplashGone } from './splash.ts'

describe('splash', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    document.body.innerHTML = '<div id="splash"></div>'
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    document.documentElement.classList.remove('no-splash')
    document.head.querySelector('style[data-test]')?.remove()
  })

  it('stays 700ms from when it first showed, even if the app starts late, then fades and goes', async () => {
    // The HTML arrived late: the splash first painted at 1500ms, the app was ready at 1600ms.
    vi.spyOn(performance, 'getEntriesByName').mockReturnValue([{ startTime: 1500 } as PerformanceEntry])
    vi.spyOn(performance, 'now').mockReturnValue(1600)
    const gone = vi.fn()
    whenSplashGone().then(gone)
    hideSplash()

    const splash = document.getElementById('splash')!
    vi.advanceTimersByTime(599)
    expect(splash).not.toHaveClass('splash-out')
    vi.advanceTimersByTime(1)
    expect(splash).toHaveClass('splash-out')
    expect(gone).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(319)
    expect(document.getElementById('splash')).not.toBeNull()
    await vi.advanceTimersByTimeAsync(1)
    expect(document.getElementById('splash')).toBeNull()
    expect(gone).toHaveBeenCalled()
  })

  it('goes at once when it was never shown (a second open, or Emergency)', () => {
    document.head.insertAdjacentHTML('beforeend', '<style data-test>.no-splash #splash { display: none }</style>')
    document.documentElement.classList.add('no-splash')
    hideSplash()

    expect(document.getElementById('splash')).toBeNull()
  })
})
