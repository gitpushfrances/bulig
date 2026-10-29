import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../App.tsx'
import Mascot, { REACTION_MS } from './Mascot.tsx'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('Mascot', () => {
  it('is a decorative image, hidden from assistive technology', () => {
    render(<Mascot variant="friendly" />)

    const ropi = screen.getByTestId('mascot')
    expect(ropi).toHaveAttribute('aria-hidden', 'true')
    const img = ropi.querySelector('img')
    expect(img).toHaveAttribute('src', '/assets/mascot/ropi-friendly.webp')
    expect(img).toHaveAttribute('alt', '')
    expect(img).toHaveAttribute('width', '354')
    expect(img).toHaveAttribute('height', '480')
    expect(img).toHaveAttribute('loading', 'lazy')
  })

  it('reacts once to a tap, then stands still again', () => {
    vi.useFakeTimers()
    render(<Mascot variant="thinking" />)
    const ropi = screen.getByTestId('mascot')
    expect(ropi.querySelectorAll('svg')).toHaveLength(0)

    fireEvent.click(ropi)
    expect(ropi).toHaveClass('playing')
    expect(ropi.querySelectorAll('svg')).toHaveLength(2) // a "?" and a lightbulb

    // A second tap mid-reaction does not restart it.
    act(() => vi.advanceTimersByTime(REACTION_MS - 100))
    fireEvent.click(ropi)
    act(() => vi.advanceTimersByTime(100))
    expect(ropi).not.toHaveClass('playing')
    expect(ropi.querySelectorAll('svg')).toHaveLength(0)
  })
})

describe('Where Ropi appears', () => {
  it('never on Home or Emergency', async () => {
    renderAt('/')
    await screen.findByRole('list', { name: 'Nearest places' })
    expect(screen.queryByTestId('mascot')).not.toBeInTheDocument()
  })

  it('never on Emergency, even offline with nothing cached', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))
    renderAt('/emergency')

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load data")
    expect(screen.queryByTestId('mascot')).not.toBeInTheDocument()
  })

  it('friendly, on an empty Saved list', async () => {
    localStorage.setItem('bulig.session', 'test@bulig.com')
    renderAt('/saved')

    expect(await screen.findByText('Tap the heart on any place to save it here.')).toBeInTheDocument()
    expect(screen.getByTestId('mascot')).toHaveAttribute('data-variant', 'friendly')
  })

  it('thinking, offline with nothing cached', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))
    renderAt('/services')

    expect(await screen.findByRole('alert')).toHaveTextContent('No signal, and nothing saved here yet.')
    expect(screen.getByTestId('mascot')).toHaveAttribute('data-variant', 'thinking')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('walking, while a list loads', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    renderAt('/services')

    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Loading…')
    const loader = screen.getByTestId('ropi-loader')
    expect(loader).toHaveAttribute('aria-hidden', 'true')
    expect(loader.querySelector('img')).toHaveAttribute('src', '/assets/mascot/ropi-walk.webp')
  })

  it.each(['/', '/emergency'])('not walking while %s loads', (path) => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    renderAt(path)

    expect(screen.getAllByText('Loading…').length).toBeGreaterThan(0)
    expect(screen.queryByTestId('ropi-loader')).not.toBeInTheDocument()
  })

  it('ready, on About', () => {
    renderAt('/about')
    expect(screen.getByTestId('mascot')).toHaveAttribute('data-variant', 'ready')
  })

  it('the head as the default avatar, on Profile and its tab', () => {
    renderAt('/profile')
    const heads = document.querySelectorAll('img[src="/assets/mascot/ropi-head.webp"]')
    expect(heads.length).toBe(2) // the Profile header and the Profile tab
  })

  it("gives way to the person's photo once they add one", () => {
    localStorage.setItem('bulig.profile.test@bulig.com', JSON.stringify({ name: 'Test traveller', photo: 'data:image/webp;base64,AAAA' }))
    renderAt('/profile')
    expect(document.querySelectorAll('img[src="data:image/webp;base64,AAAA"]').length).toBe(2)
    expect(document.querySelector('img[src="/assets/mascot/ropi-head.webp"]')).toBeNull()
  })
})
