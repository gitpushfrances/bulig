import { render, screen, within } from '@testing-library/react'
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
    ['/services/fuel', 'Gas station', 'Services'],
    ['/emergency', 'Emergency Help', 'Emergency'],
    ['/saved', 'Saved', 'Saved'],
    ['/profile', 'Profile', 'Profile'],
    ['/about', 'About Bulig', 'Profile'],
  ])('%s shows its page and marks its tab active', async (path, heading, tab) => {
    renderAt(path)

    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
    const active = tabLinks().filter((link) => link.getAttribute('aria-current') === 'page')
    expect(active.map((link) => link.textContent)).toEqual([tab])
  })

  it('always shows the five tabs in order', () => {
    renderAt('/services')

    expect(tabLinks().map((link) => link.textContent)).toEqual(['Home', 'Services', 'Emergency', 'Saved', 'Profile'])
  })

  it('shows a not found page for unknown paths', () => {
    renderAt('/nope')

    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })
})
