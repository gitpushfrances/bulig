import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import App from '../../App.tsx'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

const as = (email: string) => localStorage.setItem('bulig.session', email)
const tabs = () => within(screen.getByRole('navigation', { name: 'Main' })).getAllByRole('link')

describe('Moderator app', () => {
  it('gives staff Home, Review, Add, Map and Manage, with 911 in the top bar and no floating button', async () => {
    as('moderator@bulig.com')
    renderAt('/')
    expect(await screen.findByRole('heading', { name: 'Hi, Test!' })).toBeInTheDocument()
    expect(tabs().map((l) => l.getAttribute('href'))).toEqual(['/', '/review', '/add', '/map', '/manage'])
    const sos = screen.getByRole('link', { name: 'Emergency numbers' })
    expect(sos).toHaveAttribute('href', '/emergency')
    expect(sos.closest('header')).not.toBeNull()
    expect(screen.getAllByRole('link', { name: 'Emergency numbers' })).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'Your profile' })).toHaveAttribute('href', '/profile')
    // Counts, and the badge on Review: the moderator's own update isn't counted.
    expect(await screen.findByRole('link', { name: /3\s*Waiting to review/ })).toHaveAttribute('href', '/review')
    expect(within(screen.getByRole('navigation', { name: 'Main' })).getByText('3')).toBeInTheDocument()
  })

  it('keeps plain users and contributors out of the staff screens', async () => {
    as('contributor@bulig.com')
    renderAt('/manage')
    expect(await screen.findByRole('heading', { name: 'What do you need?' })).toBeInTheDocument()
    expect(tabs().map((l) => l.getAttribute('href'))).not.toContain('/manage')
  })

  it('approves only the ticked fields, then the item leaves the queue', async () => {
    as('moderator@bulig.com')
    renderAt('/review')
    const own = await screen.findByText('Your update. Someone else reviews it.')
    expect(own.closest('a')).toBeNull() // greyed, not a link
    fireEvent.click(screen.getByRole('link', { name: /Aling Nena Vulcanizing/ }))
    const approve = await screen.findByRole('button', { name: 'Approve ticked (0)' })
    expect(approve).toBeDisabled()
    for (const f of [/^Name/, /^Kind/, /^Town/, /^Landmark/]) fireEvent.click(screen.getByRole('checkbox', { name: f }))
    fireEvent.click(screen.getByRole('button', { name: 'Approve ticked (4)' }))
    expect(await screen.findByText('Approved. Phones see it within an hour.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Aling Nena Vulcanizing/ })).not.toBeInTheDocument()
  })

  it('needs name, kind, town and landmark before a new place can go live', async () => {
    as('moderator@bulig.com')
    renderAt('/review/sub_1')
    fireEvent.click(await screen.findByRole('checkbox', { name: /^Hours/ }))
    expect(screen.getByRole('button', { name: 'Approve ticked (1)' })).toBeDisabled()
    expect(screen.getByText(/needs its name, kind, town and landmark/)).toBeInTheDocument()
  })

  it('rejects with one of the six reasons', async () => {
    as('moderator@bulig.com')
    renderAt('/review/sub_2')
    fireEvent.click(await screen.findByRole('button', { name: 'Reject' }))
    const dialog = await screen.findByRole('dialog', { name: 'Why not?' })
    expect(within(dialog).getAllByRole('radio')).toHaveLength(6)
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Already up to date' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reject' }))
    expect(await screen.findByText('Rejected. The sender sees your reason.')).toBeInTheDocument()
  })

  it('switches a user to Scout, but never touches staff', async () => {
    as('moderator@bulig.com')
    const first = renderAt('/manage')
    expect(await screen.findByText(/ma…@yahoo.com/)).toBeInTheDocument()
    // No mobile numbers or full emails in the list.
    expect(screen.queryByText(/@yahoo\.com$/)).toBeNull()
    fireEvent.click(screen.getByRole('link', { name: /Maria Santos/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Scout' }))
    expect(await screen.findByText('Now a Scout. They can add places.')).toBeInTheDocument()
    first.unmount()

    renderAt('/manage/users/usr_mod')
    expect(await screen.findByText(/changed by an admin, in the web panel/)).toBeInTheDocument()
  })

  it('lists hotlines by province and municipality, filters the ones to check, and never offers 911', async () => {
    as('moderator@bulig.com')
    renderAt('/manage?tab=hotlines')
    expect(await screen.findByRole('heading', { name: 'Eastern Samar · province' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Guiuan · municipality' })).toBeInTheDocument()
    expect(screen.queryByText(/National Emergency Hotline/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'To check' }))
    expect(screen.getByRole('link', { name: /MDRRMO Guiuan/ })).toHaveTextContent('Hidden')
    expect(screen.queryByRole('link', { name: /BFP Guiuan/ })).toBeNull()
  })

  it('adds a hotline for a municipality, and checks the number first', async () => {
    as('moderator@bulig.com')
    renderAt('/manage/hotlines/new')
    fireEvent.change(await screen.findByRole('combobox', { name: 'Covers' }), {
      target: { value: 'ph-eastern-samar-mercedes' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: 'BFP Mercedes' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Number 1' }), { target: { value: '12' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('A number looks wrong')
    fireEvent.change(screen.getByRole('textbox', { name: 'Number 1' }), { target: { value: '0917 555 0100' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Hotline added. Phones get it within an hour.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /BFP Mercedes/ })).toHaveTextContent('0917 555 0100')
  })

  it('gives the everyday tabs back with "Use the app as: Traveller"', async () => {
    as('moderator@bulig.com')
    renderAt('/profile')
    fireEvent.click(await screen.findByRole('button', { name: 'Traveller' }))
    expect(tabs().map((l) => l.getAttribute('href'))).toEqual(['/', '/services', '/add', '/map', '/saved'])
    expect(screen.queryByRole('link', { name: 'Your profile' })).toBeNull()
  })

  it('lists Scout requests and makes a person a Scout from their request', async () => {
    as('moderator@bulig.com')
    renderAt('/')
    fireEvent.click(await screen.findByRole('link', { name: /1\s*Asked to be a Scout/ }))
    expect(await screen.findByRole('button', { name: 'Asked to be a Scout', pressed: true })).toBeInTheDocument()
    fireEvent.click(await screen.findByRole('link', { name: /Leo Pacaña/ }))
    expect(await screen.findByText('Tricycle driver, Guiuan to Mercedes every day.', { exact: false })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Make them a Scout' }))
    expect(await screen.findByText('Now a Scout. They can add places.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Make them a Scout' })).not.toBeInTheDocument()
  })
})
