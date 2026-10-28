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

describe('App shell', () => {
  it.each([
    ['/', 'Emergency Help', 'Emergency'],
    ['/services', 'Services', 'Services'],
    ['/about', 'About Bulig', 'About'],
  ])('%s shows its page and marks its tab active', (path, heading, tab) => {
    renderAt(path)

    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Main' })
    expect(within(nav).getByRole('link', { name: tab })).toHaveAttribute('aria-current', 'page')
  })

  it('always shows the three tabs in order', () => {
    renderAt('/services')

    const links = within(screen.getByRole('navigation', { name: 'Main' })).getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual(['Emergency', 'Services', 'About'])
  })

  it('shows a not found page for unknown paths', () => {
    renderAt('/nope')

    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })
})
