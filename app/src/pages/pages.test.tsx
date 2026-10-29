import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import App from '../App.tsx'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('Emergency page', () => {
  it('shows the national number first as a call link', async () => {
    renderAt('/')

    const hotline = await screen.findByRole('region', { name: 'National Emergency Hotline' })
    expect(within(hotline).getByRole('link', { name: /911/ })).toHaveAttribute('href', 'tel:911')
  })

  it('hides the sample contact that is older than 180 days', async () => {
    renderAt('/')

    await screen.findByRole('list', { name: 'Local emergency numbers' })
    expect(screen.queryByText(/expired on purpose/)).not.toBeInTheDocument()
    expect(screen.getByText('Mercedes Fire Station (SAMPLE)')).toBeInTheDocument()
  })

  it('narrows to the picked area and remembers it', async () => {
    renderAt('/')

    fireEvent.change(await screen.findByRole('combobox', { name: 'Area' }), {
      target: { value: 'ph-eastern-samar-guiuan' },
    })
    expect(screen.queryByText('Mercedes Fire Station (SAMPLE)')).not.toBeInTheDocument()
    expect(screen.getByText('Guiuan Police Station (SAMPLE)')).toBeInTheDocument()
    expect(localStorage.getItem('bulig.area')).toBe('ph-eastern-samar-guiuan')
  })

  it('still offers the national number when data fails to load', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))
    renderAt('/')

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load data")
    expect(screen.getByRole('link', { name: /911/ })).toHaveAttribute('href', 'tel:911')
  })
})

describe('Services page', () => {
  it('reaches a tire repair shop and its call button in a few taps', async () => {
    renderAt('/services')

    fireEvent.click(await screen.findByRole('button', { name: 'Vulcanizing' }))
    const places = screen.getByRole('list', { name: 'Places' })
    expect(within(places).getAllByRole('listitem')).toHaveLength(5)
    expect(within(places).getByRole('link', { name: 'Call Sample Vulcanizing Shop' })).toHaveAttribute(
      'href',
      'tel:+639000000101',
    )
  })

  it('searches by name or landmark', async () => {
    renderAt('/services')

    fireEvent.change(await screen.findByRole('searchbox', { name: 'Search' }), { target: { value: 'terminal' } })
    expect(within(screen.getByRole('list', { name: 'Places' })).getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByText('Sample Motor Repair')).toBeInTheDocument()
  })

  it('marks sample records', async () => {
    renderAt('/services')

    await screen.findByRole('list', { name: 'Places' })
    expect(screen.getAllByText('SAMPLE').length).toBeGreaterThan(0)
  })
})
