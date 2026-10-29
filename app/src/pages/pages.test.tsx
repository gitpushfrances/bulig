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

describe('Nearby filters and Place details', () => {
  it('filters with chips, and clears them when nothing matches', async () => {
    renderAt('/nearby/flat-tire')

    expect(await screen.findByText(/^10 vulcanizing shops in all areas/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Tubeless' }))
    expect(screen.getByRole('button', { name: 'Tubeless' })).toHaveAttribute('aria-pressed', 'true')
    const lead = screen.getByText(/vulcanizing shops? in all areas/).textContent ?? ''
    expect(Number(lead.split(' ')[0])).toBeLessThan(10)
    // The nearest card shows what it offers.
    expect(within(screen.getByRole('article')).getByRole('list', { name: 'What it offers' })).toHaveTextContent('Tubeless')
  })

  it('shows a place with its week, features, check date, and Call, Route and Share', async () => {
    renderAt('/place/ph-cebu-cebu-city-sample-vulcanizing')

    expect(await screen.findByRole('heading', { level: 1, name: 'Sample Uptown Vulcanizing' })).toBeInTheDocument()
    const week = screen.getByRole('heading', { name: 'Usual hours' }).parentElement!
    expect(within(week).getByText('Monday').closest('div')).toHaveTextContent('6 AM – 10 PM')
    expect(within(week).getByText('Today')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'What it offers' }).parentElement).toHaveTextContent('Air pump')
    expect(screen.getByRole('link', { name: 'Call Sample Uptown Vulcanizing' })).toHaveAttribute('href', 'tel:+639000000251')
    expect(screen.getByRole('link', { name: 'Route to Sample Uptown Vulcanizing' })).toHaveAttribute(
      'href',
      '/map?to=ph-cebu-cebu-city-sample-vulcanizing',
    )
    expect(screen.getByRole('button', { name: 'Share Sample Uptown Vulcanizing' })).toBeInTheDocument()
  })

  it('says when hours are not recorded, and never invents them', async () => {
    const lodging = 'ph-metro-manila-quezon-city-sample-lodging'
    renderAt(`/place/${lodging}`)
    await screen.findByRole('heading', { level: 1 })
    // Either real hours (24h front desk) or the honest "not recorded" line; never both.
    const hours = screen.getByRole('heading', { name: 'Usual hours' }).parentElement!
    expect(hours.textContent).toMatch(/Open 24 hours|aren.t recorded yet/)
  })

  it('opens a place from a Nearby row', async () => {
    renderAt('/nearby/flat-tire')

    const more = await screen.findByRole('list', { name: 'More vulcanizing shops' })
    const first = within(more).getAllByRole('link')[0]
    expect(first).toHaveAttribute('href', expect.stringMatching(/^\/place\//))
  })

  it('shows not found for an unknown place', async () => {
    renderAt('/place/nope')
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })
})
