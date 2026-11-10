import { fireEvent, render, screen, within } from '@testing-library/react'
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
const as = (email: string) => localStorage.setItem('bulig.session', email)

describe('Become a contributor', () => {
  it('is a Profile row for users only', async () => {
    renderAt('/profile')
    expect(await screen.findByRole('link', { name: 'Become a contributor' })).toHaveAttribute('href', '/profile/contributor')
  })

  it('is not offered to contributors', async () => {
    as('contributor@bulig.com')
    renderAt('/profile')
    expect(await screen.findByRole('link', { name: 'My updates' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Become a contributor' })).not.toBeInTheDocument()
  })

  it('explains the role, then sends a request that shows as waiting', async () => {
    renderAt('/profile/contributor')
    expect(await screen.findByRole('heading', { name: 'Become a contributor' })).toBeInTheDocument()
    // The four steps, and the table that shows what changes.
    expect(within(screen.getByRole('region', { name: 'How an update travels' })).getAllByRole('listitem')).toHaveLength(4)
    const table = screen.getByRole('table')
    expect(within(table).getByRole('rowheader', { name: 'Add a new place' })).toBeInTheDocument()
    expect(screen.getByText(/can't change 911/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Send my request' }))
    expect(screen.getByText(/Tell us the towns or roads you know/)).toBeInTheDocument()
    expect(screen.getByText('Tick the box to agree.')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Where do you travel or know well?'), { target: { value: 'Guiuan to Mercedes' } })
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Send my request' }))

    expect(await screen.findByText(/We got your request on/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Send my request' })).not.toBeInTheDocument()
  })

  it('shows "Waiting" on Profile while a request is pending', async () => {
    localStorage.setItem(
      'bulig.contributorRequest.test@bulig.com',
      JSON.stringify({ status: 'pending', area: 'Guiuan', createdAt: '2026-11-10' }),
    )
    renderAt('/profile')
    expect(await screen.findByRole('link', { name: /Become a contributor\s*Waiting/ })).toBeInTheDocument()
  })

  it('says when a declined person can ask again', async () => {
    localStorage.setItem(
      'bulig.contributorRequest.test@bulig.com',
      JSON.stringify({ status: 'declined', area: 'Guiuan', createdAt: '2026-11-01', canAskAgainOn: '2999-01-01' }),
    )
    renderAt('/profile/contributor')
    expect(await screen.findByText('Not this time.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Send my request' })).not.toBeInTheDocument()
  })
})

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

describe('Staff: contributor requests', () => {
  it('lists who asked and makes them a contributor', async () => {
    as('moderator@bulig.com')
    renderAt('/manage')
    fireEvent.click(await screen.findByRole('button', { name: /Asked to contribute/ }))
    const row = await screen.findByRole('link', { name: /Maria Santos/ })
    expect(row).toHaveTextContent('Asked')
    expect(screen.queryByRole('link', { name: /Juan Dela Cruz/ })).not.toBeInTheDocument()

    fireEvent.click(row)
    expect(await screen.findByText('Guiuan to Mercedes, Eastern Samar')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Make them a contributor' }))
    expect(await screen.findByText('Now a contributor. They can add places.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Asked to be a contributor' })).not.toBeInTheDocument()
  })

  it('answers "Not now"', async () => {
    as('moderator@bulig.com')
    renderAt('/manage/users/usr_maria')
    fireEvent.click(await screen.findByRole('button', { name: 'Not now' }))
    expect(await screen.findByText(/They can ask again in 30 days/)).toBeInTheDocument()
  })
})
