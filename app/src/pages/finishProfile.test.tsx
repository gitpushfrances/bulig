import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import App from '../App.tsx'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('Finish your profile', () => {
  it('asks on Home for a photo and home area, and the X hides it for good', async () => {
    const { unmount } = renderAt('/')
    const card = await screen.findByRole('link', { name: /Finish your profile/ })
    expect(card).toHaveAttribute('href', '/profile/edit')
    expect(card).toHaveTextContent('Add a photo and your home area.')
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }))
    expect(screen.queryByRole('link', { name: /Finish your profile/ })).not.toBeInTheDocument()
    unmount()

    renderAt('/')
    expect(await screen.findByRole('heading', { name: 'What do you need?' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Finish your profile/ })).not.toBeInTheDocument()
  })

  it('stays on Profile until the details are in, and never asks for a mobile number', async () => {
    localStorage.setItem('bulig.finishProfile.test@bulig.com', 'closed')
    renderAt('/profile')
    const card = await screen.findByRole('link', { name: /Finish your profile/ })
    expect(card).not.toHaveTextContent(/mobile/i)
    expect(screen.queryByRole('button', { name: 'Not now' })).not.toBeInTheDocument()
  })
})
