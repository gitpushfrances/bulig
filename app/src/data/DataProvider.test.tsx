import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import LocationProvider from '../location/LocationProvider.tsx'
import type { Envelope, Service } from '../types.ts'
import { useAppData } from './context.ts'
import DataProvider from './DataProvider.tsx'
import type { DataSource } from './DataSource.ts'
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

describe('DataProvider', () => {
  it('tries the API again while the server wakes, and swaps in its data without a reload', async () => {
    let calls = 0
    // First read: the sleeping server timed out, so the bundled files answered. Second: it is awake.
    const source: DataSource = {
      ...jsonSource,
      services: async (cc) => {
        calls += 1
        const files = await jsonSource.services(cc)
        return calls === 1
          ? ({ ...files, fromBackup: true } as Envelope<Service>)
          : { ...files, items: [...files.items, added] }
      },
    }

    renderWith(source, <Names />)

    await screen.findByText(/Sample/)
    expect(screen.getByTestId('names').textContent).not.toContain('Added in the panel')
    expect(await screen.findByText(/Added in the panel/)).toBeInTheDocument()
    expect(calls).toBe(2)
  })

  it('does not retry when the API answered', async () => {
    let calls = 0
    const source: DataSource = { ...jsonSource, services: (cc) => (calls++, jsonSource.services(cc)) }

    renderWith(source, <Names />)

    await screen.findByText(/Sample/)
    await new Promise((r) => setTimeout(r, 50))
    expect(calls).toBe(1)
  })
})
