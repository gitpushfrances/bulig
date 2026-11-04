import { afterEach, describe, expect, it, vi } from 'vitest'
import { reloadOnceForNewBuild } from './loadMap.ts'

describe('reloadOnceForNewBuild', () => {
  const reload = vi.fn()
  afterEach(() => {
    sessionStorage.clear()
    reload.mockReset()
    vi.unstubAllGlobals()
  })

  function stubReload() {
    vi.stubGlobal('location', { ...window.location, reload })
  }

  it('reloads once after a deploy replaced a file, then not again within a minute', () => {
    stubReload()
    expect(reloadOnceForNewBuild(1_000_000)).toBe(true)
    expect(reload).toHaveBeenCalledTimes(1)
    expect(reloadOnceForNewBuild(1_030_000)).toBe(false)
    expect(reload).toHaveBeenCalledTimes(1)
    expect(reloadOnceForNewBuild(1_070_000)).toBe(true)
  })

  it('never reloads while offline: the page shows its own fallback', () => {
    stubReload()
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValueOnce(false)
    expect(reloadOnceForNewBuild(1_000_000)).toBe(false)
    expect(reload).not.toHaveBeenCalled()
  })
})
