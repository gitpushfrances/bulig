import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import AuthProvider from '../auth/AuthProvider.tsx'
import { localContribute, type ContributeStore, type PlaceReport } from '../contribute/store.ts'
import type { Service } from '../types.ts'
import { ServiceCard } from './Cards.tsx'
import ReportPlace from './ReportPlace.tsx'

// jsdom has no showModal: Dialog falls back to the open attribute, like old iOS.

describe('Report wrong info', () => {
  it('sends the reason and note for this place, then thanks the person', async () => {
    const sent: PlaceReport[] = []
    const store: ContributeStore = {
      ...localContribute,
      reportPlace: vi.fn(async (r: PlaceReport) => (sent.push(r), { ok: true as const, id: 'sub_1' })),
    }
    render(<ReportPlace id="ph-osm-node-1" name="Bong Vulcanizing" store={store} />)

    fireEvent.click(screen.getByRole('button', { name: 'Report wrong info' }))
    fireEvent.click(screen.getByLabelText('Wrong place on the map'))
    fireEvent.change(screen.getByLabelText(/What did you see/), { target: { value: 'It is across the bridge' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send report' }))

    expect(await screen.findByText(/A moderator will check it/)).toBeInTheDocument()
    expect(sent).toEqual([
      { recordId: 'ph-osm-node-1', recordName: 'Bong Vulcanizing', reason: 'wrong_location', note: 'It is across the bridge' },
    ])
  })

  it('says why when it could not send', async () => {
    const store: ContributeStore = { ...localContribute, reportPlace: async () => ({ ok: false, reason: 'busy' }) }
    render(<ReportPlace id="x" name="X" store={store} />)

    fireEvent.click(screen.getByRole('button', { name: 'Report wrong info' }))
    fireEvent.click(screen.getByRole('button', { name: 'Send report' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/sent a lot today/)
  })
})

describe('An OpenStreetMap place nobody has checked', () => {
  const place: Service = {
    id: 'ph-osm-node-1',
    country: 'PH',
    area: 'ph-eastern-samar-guiuan',
    category: 'tire_repair',
    name: 'Bong Vulcanizing',
    landmark: 'See the map pin',
    verifiedAt: '2024-05-01',
    source: 'OpenStreetMap (edited 2024-05-01), not checked by Bulig',
    unchecked: true,
  }

  it('says so instead of "Last checked"', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <ul>
            <ServiceCard service={place} labels={null} />
          </ul>
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByText('From OpenStreetMap, not checked yet')).toBeInTheDocument()
    expect(screen.queryByText(/Last checked/)).not.toBeInTheDocument()
  })
})
