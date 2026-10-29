import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Service } from '../types.ts'
import RouteSheet, { type RouteState } from './RouteSheet.tsx'

const PLACE: Service = {
  id: 'p1',
  country: 'PH',
  area: 'ph-cebu-cebu-city',
  category: 'hospital',
  name: 'Sample District Hospital',
  phone: '+63 900 000 0001',
  landmark: 'Sample landmark',
  lat: 10.31,
  lng: 123.89,
  verifiedAt: '2026-10-24',
  source: 'test',
  sample: true,
}
const READY: RouteState = { kind: 'ready', route: { path: [[123.88, 10.31]], metres: 1400, seconds: 180 } }

function setup(minimized: boolean) {
  const handlers = { onMode: vi.fn(), onMinimize: vi.fn(), onExpand: vi.fn(), onEnd: vi.fn() }
  render(<RouteSheet place={PLACE} route={READY} mode="car" minimized={minimized} {...handlers} />)
  return handlers
}

// jsdom has no pointer capture; the bar only needs it to keep the drag.
HTMLElement.prototype.setPointerCapture ??= () => {}

describe('RouteSheet', () => {
  it('minimizes instead of ending, and ends only from End route', () => {
    const h = setup(false)

    expect(screen.getByText('1.4 km · 3 min')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Minimize route' }))
    expect(h.onMinimize).toHaveBeenCalled()
    expect(h.onEnd).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'End route' }))
    expect(h.onEnd).toHaveBeenCalled()
  })

  it('opens again when the minimized bar is tapped', () => {
    const h = setup(true)
    const bar = screen.getByRole('button', { name: /^Route to Sample District Hospital, 1.4 km · 3 min/ })

    fireEvent.pointerDown(bar, { clientX: 100, pointerId: 1 })
    fireEvent.pointerUp(bar, { clientX: 100, pointerId: 1 })
    expect(h.onExpand).toHaveBeenCalled()
    expect(h.onEnd).not.toHaveBeenCalled()
  })

  it('ends the route when the bar is swiped away, and not on a short drag', () => {
    vi.useFakeTimers()
    const h = setup(true)
    const bar = screen.getByRole('button', { name: /^Route to/ })

    // A short drag snaps back.
    fireEvent.pointerDown(bar, { clientX: 200, pointerId: 1 })
    fireEvent.pointerMove(bar, { clientX: 150, pointerId: 1 })
    fireEvent.pointerUp(bar, { clientX: 150, pointerId: 1 })
    expect(h.onEnd).not.toHaveBeenCalled()
    expect(h.onExpand).not.toHaveBeenCalled()

    // A long swipe ends it once the bar has slid out.
    fireEvent.pointerDown(bar, { clientX: 200, pointerId: 1 })
    fireEvent.pointerMove(bar, { clientX: 40, pointerId: 1 })
    fireEvent.pointerUp(bar, { clientX: 40, pointerId: 1 })
    act(() => vi.advanceTimersByTime(200))
    expect(h.onEnd).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it('opens from the keyboard too', () => {
    const h = setup(true)
    fireEvent.keyDown(screen.getByRole('button', { name: /^Route to/ }), { key: 'Enter' })
    expect(h.onExpand).toHaveBeenCalled()
  })
})
