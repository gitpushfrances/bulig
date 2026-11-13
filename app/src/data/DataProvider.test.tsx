import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import LocationProvider from '../location/LocationProvider.tsx'
import type { Envelope, Service } from '../types.ts'
import { useAppData } from './context.ts'
import DataProvider from './DataProvider.tsx'
import type { DataSource, PlaceQuery } from './DataSource.ts'
import { jsonSource } from './JsonSource.ts'

function Names() {
  const { data } = useAppData()
  return <p data-testid="names">{data.status === 'ready' ? data.services.map((s) => s.name).join(', ') : data.status}</p>
}

const added = {
  id: 'ph-eastern-samar-guiuan-new-shop',
  country: 'PH',
  area: 'ph-eastern-samar-guiuan',
  category: 'tire_repair',
  name: 'Added in the panel',
  landmark: 'Near the port',
  verifiedAt: '2026-11-04',
  source: 'Called',
} satisfies Service

function renderWith(source: DataSource, children: ReactNode) {
  return render(
    <MemoryRouter>
      <LocationProvider geo={undefined}>
        <DataProvider source={source} wakeRetryMs={[10]}>
          {children}
        </DataProvider>
      </LocationProvider>
    </MemoryRouter>,
  )
}

// The 3×3 map squares around the picked town's centre, and the town itself (for places with no pin).
const HOME_SQUARES = 10

describe('DataProvider', () => {
  beforeEach(() => localStorage.setItem('bulig.area', 'ph-eastern-samar-guiuan'))

  it('tries the API again while the server wakes, and swaps in its data without a reload', async () => {
    let calls = 0
    // First read: the sleeping server timed out, so the bundled files answered. Second: it is awake.
    const source: DataSource = {
      ...jsonSource,
      services: async (cc, query) => {
        calls += 1
        const files = await jsonSource.services(cc, query)
        return calls <= HOME_SQUARES
          ? ({ ...files, fromBackup: true } as Envelope<Service>)
          : { ...files, items: [...files.items, added] }
      },
    }

    renderWith(source, <Names />)

    await screen.findByText(/Sample/)
    expect(screen.getByTestId('names').textContent).not.toContain('Added in the panel')
    expect(await screen.findByText(/Added in the panel/)).toBeInTheDocument()
    expect(calls).toBe(HOME_SQUARES * 2)
  })

  it('does not retry when the API answered', async () => {
    let calls = 0
    const source: DataSource = { ...jsonSource, services: (cc, query) => (calls++, jsonSource.services(cc, query)) }

    renderWith(source, <Names />)

    await screen.findByText(/Sample/)
    await new Promise((r) => setTimeout(r, 50))
    expect(calls).toBe(HOME_SQUARES)
  })

  it('loads only the squares around the town and the town, never the whole country', async () => {
    const asked: PlaceQuery[] = []
    const source: DataSource = { ...jsonSource, services: (cc, query) => (asked.push(query), jsonSource.services(cc, query)) }

    renderWith(source, <Names />)

    await screen.findByText(/Sample/)
    expect(asked).toHaveLength(HOME_SQUARES)
    expect(asked.filter((q) => 'bbox' in q)).toHaveLength(9)
    expect(asked).toContainEqual({ area: 'ph-eastern-samar-guiuan' })
    expect(screen.getByTestId('names').textContent).not.toContain('Tacloban')
  })

  it('loads nothing until it knows where the person is', async () => {
    localStorage.removeItem('bulig.area')
    let calls = 0
    const source: DataSource = { ...jsonSource, services: (cc, query) => (calls++, jsonSource.services(cc, query)) }

    renderWith(source, <Names />)

    await waitFor(() => expect(screen.getByTestId('names').textContent).toBe(''))
    expect(calls).toBe(0)
  })

  it('loads a place far away by ID once, and tells which IDs are gone', async () => {
    const asked: PlaceQuery[] = []
    const source: DataSource = { ...jsonSource, services: (cc, query) => (asked.push(query), jsonSource.services(cc, query)) }
    function Far() {
      const { data, ensurePlaces, missingPlaces } = useAppData()
      const far = data.status === 'ready' ? data.services.find((s) => s.id === 'ph-leyte-tacloban-sample-fuel') : undefined
      return (
        <>
          <button type="button" onClick={() => ensurePlaces({ ids: ['ph-leyte-tacloban-sample-fuel', 'gone'] })}>
            Load
          </button>
          <p data-testid="far">{far?.name ?? 'none'}</p>
          <p data-testid="missing">{[...missingPlaces].join(',')}</p>
        </>
      )
    }

    renderWith(source, <Far />)
    await waitFor(() => expect(asked).toHaveLength(HOME_SQUARES))
    fireEvent.click(screen.getByText('Load'))
    fireEvent.click(screen.getByText('Load'))

    await waitFor(() => expect(screen.getByTestId('missing').textContent).toBe('gone'))
    expect(screen.getByTestId('far').textContent).not.toBe('none')
    expect(asked.filter((q) => 'ids' in q)).toEqual([{ ids: ['ph-leyte-tacloban-sample-fuel', 'gone'] }])
  })
})
