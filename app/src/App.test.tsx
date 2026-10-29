import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import App from './App.tsx'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

function tabLinks() {
  return within(screen.getByRole('navigation', { name: 'Main' }))
    .getAllByRole('link')
    .filter((link) => link.getAttribute('aria-label') !== 'Bulig home')
}

describe('App shell', () => {
  it.each([
    ['/', 'What do you need?', 'Home'],
    ['/services', 'What we offer', 'Services'],
    ['/services/fuel', 'Out of gas', 'Services'],
    ['/nearby/flat-tire', 'Flat tire', 'Services'],
    ['/map', 'Map of places near you', 'Map'],
    ['/saved', 'Saved', 'Saved'],
    ['/profile', 'Profile', 'Profile'],
    ['/about', 'About Bulig', 'Profile'],
    ['/terms', 'Terms of Use', 'Profile'],
  ])('%s shows its page and marks its tab active', async (path, heading, tab) => {
    renderAt(path)

    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
    const active = tabLinks().filter((link) => link.getAttribute('aria-current') === 'page')
    expect(active.map((link) => link.textContent)).toEqual([tab])
  })

  it('always shows the five tabs in order', () => {
    renderAt('/services')

    expect(tabLinks().map((link) => link.textContent)).toEqual(['Home', 'Services', 'Map', 'Saved', 'Profile'])
  })

  it('opens Emergency from the red button on any screen, with no tab marked, and goes back', async () => {
    renderAt('/services')

    fireEvent.click(screen.getByRole('link', { name: 'Emergency numbers' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Emergency Help' })).toBeInTheDocument()
    expect(tabLinks().filter((link) => link.getAttribute('aria-current') === 'page')).toEqual([])
    expect(screen.queryByRole('link', { name: 'Emergency numbers' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'What we offer' })).toBeInTheDocument()
  })

  it('shows a not found page for unknown paths', () => {
    renderAt('/nope')

    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })
})
