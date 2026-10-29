import { act, fireEvent, render, screen } from '@testing-library/react'
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

    // Home's location line, between the services and the emergency numbers.
    expect(await screen.findByText('Cebu City · Cebu')).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Area' })).not.toBeInTheDocument()
    expect(localStorage.getItem('bulig.area')).toBe('ph-cebu-cebu-city')
  })

  it('lists only nearby places, with their distance', async () => {
    fakeGeo(CEBU)
    renderAt('/services/tire-repair')

    const nearest = await screen.findByRole('article', { name: 'Sample Uptown Vulcanizing' })
    expect(nearest).toHaveTextContent('810 m away')
    expect(screen.queryByRole('list', { name: 'More vulcanizing shops' })).not.toBeInTheDocument()
  })

  it('asks for a fresh fix when the refresh button is tapped', async () => {
    const geo = fakeGeo(CEBU)
    renderAt('/')

    await screen.findByText('Cebu City · Cebu')
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Update my location' })))
    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1)
  })

  it('shows the barangay and municipality from the address lookup', async () => {
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

    // The full address as one line of text: barangay, city or municipality, province, ZIP code.
    expect(await screen.findByText('Lahug · Cebu City · Cebu · 6000')).toBeInTheDocument()
    expect(screen.getByText(/^Updated /)).toBeInTheDocument()
    // The position is rounded to about 100 m before it leaves the phone.
    const url = String(lookup.mock.calls.find(([u]) => String(u).includes('nominatim'))?.[0])
    expect(url).toContain('lat=10.31&lon=123.89')
    expect(JSON.parse(localStorage.getItem('bulig.address') ?? '{}').address.postcode).toBe('6000')
  })

  it('falls back to the nearest listed town when the lookup fails', async () => {
    fakeGeo(CEBU)
    renderAt('/')

    expect(await screen.findByText('Cebu City · Cebu')).toBeInTheDocument()
  })

  it('falls back to picking an area when location is denied', async () => {
    fakeGeo('denied')
    renderAt('/')

    expect(await screen.findByRole('combobox', { name: 'Area' })).toBeInTheDocument()
  })
})
