import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type Auth } from '../auth/context.ts'
import { AppDataContext, type AppData, type DataState } from '../data/context.ts'
import ReadyGate, { GATE_MAX_MS } from './ReadyGate.tsx'

// After signing in, pages wait for the places and the saved list instead of drawing half-empty.

const ready: DataState = { status: 'ready', areas: [], emergency: [], services: [], labels: null }

function setup(data: DataState, savedStatus: Auth['savedStatus'], fromBackup = false, path = '/') {
  const auth = { account: { email: 'ana@example.com', name: 'Ana', role: 'user', areas: [] }, savedStatus } as unknown as Auth
  const app = { data, fromBackup } as unknown as AppData
  return render(
    <AuthContext.Provider value={auth}>
      <AppDataContext.Provider value={app}>
        <ReadyGate pathname={path}>
          <p>The page</p>
        </ReadyGate>
      </AppDataContext.Provider>
    </AuthContext.Provider>,
  )
}

afterEach(() => vi.useRealTimers())

describe('ReadyGate', () => {
  it('waits for the saved list, the places, and the server (not the bundled backup)', () => {
    setup({ status: 'loading' }, 'ready').unmount()
    setup(ready, 'loading').unmount()
    setup(ready, 'ready', true)
    expect(screen.getByText('Getting your places ready')).toBeInTheDocument()
    expect(screen.queryByText('The page')).not.toBeInTheDocument()
  })

  it('never stands in front of Emergency', () => {
    setup({ status: 'loading' }, 'loading', false, '/emergency')
    expect(screen.getByText('The page')).toBeInTheDocument()
  })

  it('gives up after a few seconds and shows the page with its skeletons', () => {
    vi.useFakeTimers()
    setup(ready, 'loading')
    act(() => {
      vi.advanceTimersByTime(GATE_MAX_MS)
    })
    expect(screen.getByText('The page')).toBeInTheDocument()
  })

  it('shows the page once everything is in', () => {
    setup(ready, 'ready')
    expect(screen.getByText('The page')).toBeInTheDocument()
  })
})
