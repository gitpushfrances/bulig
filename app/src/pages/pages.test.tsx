import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import App from '../App.tsx'

// jsdom has no GPS, so these run the "location unavailable" path: all areas, with a manual picker.
function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('Home', () => {
  it('keeps the national number one tap away and links to every section', async () => {
    renderAt('/')

    const hotline = await screen.findByRole('region', { name: 'National Emergency Hotline' })
    expect(within(hotline).getByRole('link', { name: /911/ })).toHaveAttribute('href', 'tel:911')
    // The bento is "What's wrong?": the problem over the kind of place, opening Nearby results.
    expect(await screen.findByRole('link', { name: /^Flat tire/ })).toHaveAttribute('href', '/nearby/flat-tire')
    expect(screen.getByRole('link', { name: 'All emergency numbers' })).toHaveAttribute('href', '/emergency')
    expect(screen.getByRole('list', { name: 'Nearest places' })).toBeInTheDocument()
  })
})

describe('Emergency page', () => {
  it('shows the national number first as a call link', async () => {
    renderAt('/emergency')

    const hotline = await screen.findByRole('region', { name: 'National Emergency Hotline' })
    expect(within(hotline).getByRole('link', { name: /911/ })).toHaveAttribute('href', 'tel:911')
  })

  it('hides the sample contact that is older than 180 days', async () => {
    renderAt('/emergency')

    await screen.findByRole('list', { name: 'Local emergency numbers' })
    expect(screen.queryByText(/expired on purpose/)).not.toBeInTheDocument()
    expect(screen.getByText('Mercedes Fire Station (SAMPLE)')).toBeInTheDocument()
  })

  it('narrows to the area picked while location is off, and remembers it', async () => {
    renderAt('/emergency')

    fireEvent.change(await screen.findByRole('combobox', { name: 'Area' }), {
      target: { value: 'ph-eastern-samar-guiuan' },
    })
    expect(screen.queryByText('Mercedes Fire Station (SAMPLE)')).not.toBeInTheDocument()
    expect(screen.getByText('Guiuan Police Station (SAMPLE)')).toBeInTheDocument()
    expect(localStorage.getItem('bulig.area')).toBe('ph-eastern-samar-guiuan')
  })

  it('still offers the national number when data fails to load', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))
    renderAt('/emergency')

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load data")
    expect(screen.getByRole('link', { name: /911/ })).toHaveAttribute('href', 'tel:911')
  })
})

describe('What we offer', () => {
  it('shows a card for every kind of service, with its count', async () => {
    renderAt('/services')

    const offers = await screen.findByRole('navigation', { name: 'Services' })
    expect(within(offers).getAllByRole('link')).toHaveLength(8)
    expect(within(offers).getByRole('link', { name: /^Hotel and inn/ })).toHaveTextContent('9 places')
  })

  it('opens Nearby results from a card: the nearest big, the rest as rows', async () => {
    renderAt('/services')

    fireEvent.click(await screen.findByRole('link', { name: /^Vulcanizing/ }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Flat tire' })).toBeInTheDocument()
    const nearest = screen.getAllByRole('article')
    expect(nearest).toHaveLength(1)
    expect(within(nearest[0]).getByRole('link', { name: /^Call / })).toHaveAttribute('href', expect.stringMatching(/^tel:/))
    // Route opens the in-app route on the Map, not another app.
    expect(within(nearest[0]).getByRole('link', { name: /^Route to / })).toHaveAttribute('href', expect.stringMatching(/^\/map\?to=/))
    const more = screen.getByRole('list', { name: 'More vulcanizing shops' })
    expect(within(more).getAllByRole('listitem')).toHaveLength(9)
    expect(screen.getByRole('link', { name: 'Show on map' })).toHaveAttribute('href', '/map?cat=tire_repair')
    expect(screen.getAllByText('SAMPLE').length).toBeGreaterThan(0)
  })

  it('opens the same page from /nearby/<need>, and points hospital seekers at 911', async () => {
    renderAt('/nearby/hospital')

    expect(await screen.findByRole('heading', { level: 1, name: 'Hospital' })).toBeInTheDocument()
    expect(within(screen.getByRole('article')).getByRole('link', { name: /^Call / })).toHaveTextContent('Call hospital')
    expect(screen.getByRole('link', { name: /Life-threatening\?/ })).toHaveAttribute('href', '/emergency')
  })

  it('says so when a category has nothing in the area', async () => {
    localStorage.setItem('bulig.area', 'ph-eastern-samar-mercedes')
    renderAt('/services/lodging')

    expect(await screen.findByText('No hotels and inns listed near Mercedes yet.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'See other services' })).toHaveAttribute('href', '/services')
    expect(screen.getByTestId('mascot')).toHaveAttribute('data-variant', 'thinking')
  })

  it('shows not found for an unknown category', () => {
    renderAt('/services/spaceships')

    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })
})
