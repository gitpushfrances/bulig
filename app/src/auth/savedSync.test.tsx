import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AuthProvider from './AuthProvider.tsx'
import { useAuth } from './context.ts'
import type { AccountStore } from './store.ts'
import type { Account } from './types.ts'

// Saved places with server accounts (John, 2026-11-05: "I save a place, reload, and it's gone").
// The list used to come back empty whenever GET /me/saved failed (asleep server, weak signal).

const ana: Account = { email: 'ana@example.com', name: 'Ana', role: 'user', areas: [] }

function fakeStore(loadSaved: AccountStore['loadSaved'], setSaved: AccountStore['setSaved'] = async () => true) {
  return {
    online: true,
    restore: () => ana,
    refresh: async () => undefined,
    signOut: async () => {},
    canManage: () => true,
    loadSaved: vi.fn(loadSaved),
    setSaved: vi.fn(setSaved),
  } as unknown as AccountStore & { loadSaved: ReturnType<typeof vi.fn> }
}

function Probe() {
  const { saved, savedStatus, toggleSaved, retrySaved } = useAuth()
  return (
    <div>
      <p data-testid="ids">{saved.join(',')}</p>
      <p data-testid="status">{savedStatus}</p>
      <button onClick={() => toggleSaved('ph-new')}>toggle</button>
      <button onClick={retrySaved}>retry</button>
    </div>
  )
}

const flush = () => act(async () => {})
const ids = () => screen.getByTestId('ids').textContent
const status = () => screen.getByTestId('status').textContent

afterEach(() => {
  localStorage.clear()
  vi.useRealTimers()
})

describe('saved places with server accounts', () => {
  it('loads from the server and keeps a copy on the phone', async () => {
    render(
      <AuthProvider store={fakeStore(async () => ['ph-a', 'ph-b'])}>
        <Probe />
      </AuthProvider>,
    )
    expect(status()).toBe('loading')
    await flush()
    expect(ids()).toBe('ph-a,ph-b')
    expect(status()).toBe('ready')
    expect(JSON.parse(localStorage.getItem('bulig.savedCache.ana@example.com') ?? 'null')).toEqual(['ph-a', 'ph-b'])
  })

  it('shows the phone copy at once, and keeps it when the server does not answer', async () => {
    localStorage.setItem('bulig.savedCache.ana@example.com', JSON.stringify(['ph-a']))
    render(
      <AuthProvider store={fakeStore(async () => null)}>
        <Probe />
      </AuthProvider>,
    )
    expect(ids()).toBe('ph-a')
    await flush()
    expect(ids()).toBe('ph-a')
    expect(status()).toBe('stale')
  })

  it('says so when there is nothing to show, then tries again on its own and on Try again', async () => {
    vi.useFakeTimers()
    let answer: string[] | null = null
    const store = fakeStore(async () => answer)
    render(
      <AuthProvider store={store}>
        <Probe />
      </AuthProvider>,
    )
    await flush()
    expect(status()).toBe('error')
    expect(store.loadSaved).toHaveBeenCalledTimes(1)
    await act(async () => {
      vi.advanceTimersByTime(5_000)
    })
    expect(store.loadSaved).toHaveBeenCalledTimes(2)
    answer = ['ph-a']
    fireEvent.click(screen.getByText('retry'))
    await flush()
    expect(store.loadSaved).toHaveBeenCalledTimes(3)
    expect(ids()).toBe('ph-a')
    expect(status()).toBe('ready')
  })

  it('keeps a heart tapped while the list was still loading', async () => {
    let finish: (ids: string[]) => void = () => {}
    render(
      <AuthProvider store={fakeStore(() => new Promise((resolve) => (finish = resolve)))}>
        <Probe />
      </AuthProvider>,
    )
    fireEvent.click(screen.getByText('toggle'))
    await act(async () => finish(['ph-a']))
    expect(ids()).toBe('ph-a,ph-new')
  })

  it('forgets the phone copy on sign out', async () => {
    localStorage.setItem('bulig.savedCache.ana@example.com', JSON.stringify(['ph-a']))
    function SignOut() {
      const { signOut } = useAuth()
      return <button onClick={signOut}>out</button>
    }
    render(
      <AuthProvider store={fakeStore(async () => ['ph-a'])}>
        <SignOut />
      </AuthProvider>,
    )
    await flush()
    fireEvent.click(screen.getByText('out'))
    expect(localStorage.getItem('bulig.savedCache.ana@example.com')).toBeNull()
  })
})
