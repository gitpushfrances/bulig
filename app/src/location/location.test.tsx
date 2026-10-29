import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../App.tsx'

type Result = { lat: number; lng: number } | 'denied'

// A stand-in for navigator.geolocation that answers on the next tick.
function fakeGeo(result: Result) {
  const answer = (ok: PositionCallback, fail?: PositionErrorCallback | null) =>
    queueMicrotask(() =>
      result === 'denied'
        ? fail?.({ code: 1 } as GeolocationPositionError)
        : ok({ coords: { latitude: result.lat, longitude: result.lng } } as GeolocationPosition),
    )
  const geo = {
    watchPosition: vi.fn((ok: PositionCallback, fail?: PositionErrorCallback | null) => {
      answer(ok, fail)
      return 1
    }),
    getCurrentPosition: vi.fn(answer),
    clearWatch: vi.fn(),
  }
  Object.defineProperty(navigator, 'geolocation', { value: geo, configurable: true })
  return geo
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'geolocation')
})

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

// A point in downtown Cebu City, a few km from the sample places there.
const CEBU = { lat: 10.31, lng: 123.89 }

describe('Location from GPS', () => {
  it('finds the area by itself, with no picker', async () => {
    fakeGeo(CEBU)
    renderAt('/')

    expect(await screen.findByText('Near you')).toBeInTheDocument()
    expect(screen.getAllByText('Cebu City').length).toBeGreaterThan(0)
    expect(await screen.findByRole('heading', { level: 1, name: 'Help near you' })).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Area' })).not.toBeInTheDocument()
    expect(localStorage.getItem('bulig.area')).toBe('ph-cebu-cebu-city')
  })

  it('lists only nearby places, with their distance', async () => {
    fakeGeo(CEBU)
    renderAt('/services/tire-repair')

    await screen.findByText('Near you')
    const places = await screen.findByRole('list', { name: 'Places' })
    const items = within(places).getAllByRole('listitem')
    expect(items).toHaveLength(1)
    expect(items[0]).toHaveTextContent('Sample Uptown Vulcanizing')
    expect(items[0]).toHaveTextContent('810 m away')
  })

  it('asks for a fresh fix when the refresh button is tapped', async () => {
    const geo = fakeGeo(CEBU)
    renderAt('/')

    await screen.findByText('Near you')
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Update my location' })))
    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1)
  })

  it('shows the barangay, municipality, province and ZIP code from the address lookup', async () => {
    fakeGeo(CEBU)
    const serveData = globalThis.fetch
    const lookup = vi.fn((input: RequestInfo | URL, init?: RequestInit) =>
      String(input).startsWith('https://nominatim.openstreetmap.org/reverse')
        ? Promise.resolve(
            Response.json({ address: { village: 'Lahug', city: 'Cebu City', state: 'Cebu', postcode: '6000' } }),
          )
        : serveData(input, init),
    )
    vi.stubGlobal('fetch', lookup)
    renderAt('/')

    expect(await screen.findByText('Lahug, Cebu City')).toBeInTheDocument()
    const card = screen.getByRole('region', { name: 'Your location' })
    expect(within(card).getByText('Barangay').nextElementSibling).toHaveTextContent('Lahug')
    expect(within(card).getByText('ZIP code').nextElementSibling).toHaveTextContent('6000')
    // The position is rounded to about 100 m before it leaves the phone.
    const url = String(lookup.mock.calls.find(([u]) => String(u).includes('nominatim'))?.[0])
    expect(url).toContain('lat=10.31&lon=123.89')
    expect(JSON.parse(localStorage.getItem('bulig.address') ?? '{}').address.postcode).toBe('6000')
  })

  it('falls back to the nearest town when the lookup fails', async () => {
    fakeGeo(CEBU)
    renderAt('/')

    const card = await screen.findByRole('region', { name: 'Your location' })
    expect(await within(card).findByText('Approximate, from the nearest town')).toBeInTheDocument()
    expect(within(card).getByText('Province').nextElementSibling).toHaveTextContent('Cebu')
    expect(within(card).getByText('ZIP code').nextElementSibling).toHaveTextContent('—')
  })

  it('falls back to picking an area when location is denied', async () => {
    fakeGeo('denied')
    renderAt('/')

    expect(await screen.findByRole('combobox', { name: 'Area' })).toBeInTheDocument()
  })
})
