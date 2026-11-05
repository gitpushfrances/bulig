import { act, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { usePhoneLocation } from './context.ts'
import { fromGeolocation, keepFix, type GpsFix } from './fixes.ts'
import LocationProvider from './LocationProvider.tsx'

// Guiuan: 0.001° of latitude is about 111 m.
const fix = (lat: number, accuracy: number, at: number): GpsFix => ({ lat, lng: 125.7228, accuracy, at })

describe('keepFix', () => {
  it('takes the first fix, however rough', () => {
    expect(keepFix(null, fix(11.035, 1500, 0))).toBe(true)
  })

  it('takes a sharper fix and a similar one', () => {
    expect(keepFix(fix(11.035, 900, 0), fix(11.0351, 12, 2_000))).toBe(true)
    expect(keepFix(fix(11.035, 10, 0), fix(11.0351, 15, 2_000))).toBe(true)
  })

  it('ignores a rough guess soon after a good fix when it lands inside its own error circle', () => {
    // 10 m fix, then a 800 m Wi-Fi guess 200 m away: the phone guessing, not the rider moving.
    expect(keepFix(fix(11.035, 10, 0), fix(11.0368, 800, 3_000))).toBe(false)
  })

  it('takes a rough fix that is clearly a real move, or once the good one is old', () => {
    // 2 km away with a 500 m circle: they moved.
    expect(keepFix(fix(11.035, 10, 0), fix(11.053, 500, 3_000))).toBe(true)
    expect(keepFix(fix(11.035, 10, 0), fix(11.0368, 800, 31_000))).toBe(true)
  })
})

describe('fromGeolocation', () => {
  it('reads the phone fix, treating a missing accuracy as unknown', () => {
    const p = { coords: { latitude: 11, longitude: 125, accuracy: 25 } } as GeolocationPosition
    expect(fromGeolocation(p, 5)).toEqual({ lat: 11, lng: 125, accuracy: 25, at: 5 })
    const none = { coords: { latitude: 11, longitude: 125 } } as GeolocationPosition
    expect(fromGeolocation(none, 5).accuracy).toBe(Infinity)
  })
})

describe('LocationProvider with a moving phone', () => {
  it('passes on the newest fix after a burst, and ignores a rough guess after a good fix', async () => {
    let send: PositionCallback = () => {}
    let started = false
    const geo = {
      watchPosition: (ok: PositionCallback) => {
        started = true
        send = ok
        return 1
      },
      getCurrentPosition: () => {},
      clearWatch: () => {},
    } as unknown as Geolocation
    const at = (lat: number, accuracy: number) =>
      ({ coords: { latitude: lat, longitude: 125.7228, accuracy } }) as GeolocationPosition
    function Probe() {
      const { position, accuracy } = usePhoneLocation()
      return <p data-testid="fix">{position ? `${position.lat} ±${accuracy}` : 'none'}</p>
    }
    render(
      <MemoryRouter initialEntries={['/']}>
        <LocationProvider geo={geo}>
          <Probe />
        </LocationProvider>
      </MemoryRouter>,
    )
    await waitFor(() => expect(started).toBe(true))
    act(() => send(at(11.035, 12)))
    expect(screen.getByTestId('fix').textContent).toBe('11.035 ±12')
    // A Wi-Fi guess 200 m off with an 800 m circle: ignored.
    act(() => send(at(11.0368, 800)))
    // Then two real fixes while the rider moves, inside the 3 s wait: the newer one arrives.
    act(() => send(at(11.0352, 10)))
    act(() => send(at(11.0354, 9)))
    expect(screen.getByTestId('fix').textContent).toBe('11.035 ±12')
    await waitFor(() => expect(screen.getByTestId('fix').textContent).toBe('11.0354 ±9'), { timeout: 4_000 })
  }, 8_000)
})
