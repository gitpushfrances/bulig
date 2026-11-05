import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import App from '../App.tsx'
import { EMPTY_DRAFT, type Draft } from '../contribute/draft.ts'

vi.mock('../contribute/photo.ts', () => ({
  shrinkPhoto: async () => ({ photo: new Blob(['x'], { type: 'image/webp' }), thumb: 'data:image/jpeg;base64,AA==' }),
}))

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

const as = (email: string) => localStorage.setItem('bulig.session', email)

describe('Add button', () => {
  it('is not in the tab bar for a plain user', async () => {
    renderAt('/')
    await screen.findByRole('heading', { name: 'What do you need?' })
    const nav = screen.getByRole('navigation', { name: 'Main' })
    expect(within(nav).queryByRole('link', { name: 'Add a place' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^Updates/ })).not.toBeInTheDocument()
  })

  it('sits in the middle of the bar for a contributor, with the bell on Home', async () => {
    as('contributor@bulig.com')
    renderAt('/')
    await screen.findByRole('heading', { name: 'What do you need?' })
    const links = within(screen.getByRole('navigation', { name: 'Main' })).getAllByRole('link')
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['/', '/services', '/add', '/map', '/saved'])
    expect(await screen.findByRole('link', { name: 'Updates' })).toHaveAttribute('href', '/updates')
  })

  it('sends a plain user who opens /add back to Home', async () => {
    renderAt('/add')
    expect(await screen.findByRole('heading', { name: 'What do you need?' })).toBeInTheDocument()
  })
})

describe('Add a place', () => {
  it('asks for what is missing before moving on', async () => {
    as('contributor@bulig.com')
    renderAt('/add')
    expect(await screen.findByRole('heading', { name: 'What is it?' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Pick what kind of place it is.')

    fireEvent.click(screen.getByRole('button', { name: /Vulcanizing/ }))
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Aling Nena Vulcanizing' } })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByRole('heading', { name: 'Where is it?' })).toBeInTheDocument()
    // jsdom draws no map: the fallback is offered instead.
    expect(await screen.findByRole('button', { name: /Use where I'm standing/ })).toBeInTheDocument()
    // And the form is kept on the phone.
    expect(JSON.parse(localStorage.getItem('bulig.drafts.new-place.contributor@bulig.com')!).name).toBe(
      'Aling Nena Vulcanizing',
    )
  })

  it('takes a photo, then checks and sends, and the update shows as waiting', async () => {
    as('contributor@bulig.com')
    const draft: Draft = {
      ...EMPTY_DRAFT,
      category: 'tire_repair',
      name: 'Aling Nena Vulcanizing',
      lat: 11.03,
      lng: 125.72,
      area: 'ph-eastern-samar-guiuan',
      landmark: 'Beside the Petron',
      opens: '06:00',
      closes: '20:00',
    }
    localStorage.setItem('bulig.drafts.new-place.contributor@bulig.com', JSON.stringify(draft))
    renderAt('/add')
    await screen.findByRole('heading', { name: 'What is it?' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Next' }))
    expect(await screen.findByRole('heading', { name: 'Hours and services' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Air pump' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(await screen.findByRole('heading', { name: 'Photos' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Check and send' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Add at least one photo of the place.')

    const file = new File(['x'], 'shop.jpg', { type: 'image/jpeg' })
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:shop')
    globalThis.URL.revokeObjectURL = vi.fn()
    expect(screen.getByTestId('camera-input')).toHaveAttribute('capture', 'environment')
    fireEvent.change(screen.getByTestId('camera-input'), { target: { files: [file] } })
    const preview = await screen.findByRole('dialog', { name: 'Use this photo?' })
    expect(within(preview).getByRole('button', { name: 'Retake' })).toBeInTheDocument()
    fireEvent.click(within(preview).getByRole('button', { name: 'Use photo' }))
    expect(await screen.findByRole('img', { name: 'Photo 1' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Check and send' }))
    expect(await screen.findByRole('heading', { name: 'Check and send' })).toBeInTheDocument()
    expect(screen.getByText('6:00 AM to 8:00 PM, every day')).toBeInTheDocument()
    expect(screen.getByText('Air pump')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    expect(await screen.findByRole('heading', { name: 'Sent' })).toBeInTheDocument()
    expect(screen.getByText(/A moderator checks it before anyone sees it/)).toBeInTheDocument()
    expect(localStorage.getItem('bulig.drafts.new-place.contributor@bulig.com')).toBeNull()

    fireEvent.click(screen.getByRole('link', { name: 'See my updates' }))
    expect(await screen.findByText('Aling Nena Vulcanizing')).toBeInTheDocument()
    expect(screen.getAllByText('Waiting').length).toBeGreaterThan(0)
  })
})
