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

function submitSignIn(email: string, password: string) {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } })
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
}

function fillRegister(name: string, email: string, password: string) {
  fireEvent.click(screen.getByRole('tab', { name: 'Create account' }))
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: name } })
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } })
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
}

describe('Test sign-in', () => {
  it('signs in with the test login and shows the role', async () => {
    renderAt('/profile')

    submitSignIn(' Test@Bulig.com ', 'password')
    expect(await screen.findByRole('heading', { name: 'Test traveller' })).toBeInTheDocument()
    expect(screen.getByText(/Role: User/)).toBeInTheDocument()
    expect(localStorage.getItem('bulig.session')).toBe('test@bulig.com')
  })

  it('says what went wrong for a bad password and stays signed out', async () => {
    renderAt('/profile')

    submitSignIn('test@bulig.com', 'wrong')
    expect(await screen.findByRole('alert')).toHaveTextContent("don't match")
    expect(localStorage.getItem('bulig.session')).toBeNull()
  })

  it.each([
    ['User', 'Test traveller'],
    ['Moderator', 'Test moderator'],
    ['Admin', 'Test admin'],
  ])('fills in the %s test login', async (role, name) => {
    renderAt('/profile')

    fireEvent.click(screen.getByRole('button', { name: `Fill in test login: ${role}` }))
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('heading', { name })).toBeInTheDocument()
    expect(screen.getByText(new RegExp(`Role: ${role}`))).toBeInTheDocument()
  })

  it('signs out and forgets the session', () => {
    localStorage.setItem('bulig.session', 'test@bulig.com')
    renderAt('/profile')

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    expect(localStorage.getItem('bulig.session')).toBeNull()
  })
})

describe('Create account', () => {
  it('creates a user on this phone, signs in, and never stores the password', async () => {
    renderAt('/profile')

    fillRegister('Ana Reyes', 'Ana@Example.com', 'long enough')
    expect(await screen.findByRole('heading', { name: 'Ana Reyes' })).toBeInTheDocument()
    expect(screen.getByText(/Role: User/)).toBeInTheDocument()
    expect(localStorage.getItem('bulig.session')).toBe('ana@example.com')
    expect(localStorage.getItem('bulig.accounts')).not.toContain('long enough')

    // Signs back in with the same password after signing out.
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    submitSignIn('ana@example.com', 'long enough')
    expect(await screen.findByRole('heading', { name: 'Ana Reyes' })).toBeInTheDocument()
  })

  it('checks each field and blocks a short password', () => {
    renderAt('/profile')

    fillRegister('', 'not-an-email', 'short')
    expect(screen.getByText('Enter your name.')).toBeInTheDocument()
    expect(screen.getByText('Enter an email like name@example.com.')).toBeInTheDocument()
    expect(screen.getByText('Use at least 8 characters.')).toBeInTheDocument()
    expect(localStorage.getItem('bulig.accounts')).toBeNull()
  })

  it('refuses an email that already has an account, and offers sign in', async () => {
    renderAt('/profile')

    fillRegister('Someone', 'test@bulig.com', 'long enough')
    expect(await screen.findByRole('alert')).toHaveTextContent('already has an account')
    fireEvent.click(screen.getByRole('button', { name: 'Sign in instead' }))
    expect(screen.getByRole('tab', { name: 'Sign in' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByLabelText('Email')).toHaveValue('test@bulig.com')
  })
})

describe('Welcome', () => {
  it('greets a first-time visitor on / with Ropi, and no emergency button', () => {
    localStorage.removeItem('bulig.welcomed')
    renderAt('/')

    expect(screen.getByRole('heading', { name: 'Welcome to Bulig' })).toBeInTheDocument()
    expect(screen.getByTestId('mascot')).toHaveAttribute('data-variant', 'ready')
    expect(screen.queryByRole('link', { name: /911/ })).not.toBeInTheDocument()
  })

  it('skips to Home, where 911 is first, and does not come back', async () => {
    localStorage.removeItem('bulig.welcomed')
    renderAt('/')

    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }))
    expect(await screen.findByRole('heading', { name: 'What do you need?' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /911/ })).toHaveAttribute('href', 'tel:911')
    expect(localStorage.getItem('bulig.welcomed')).toBe('1')
  })

  it('goes to Home after signing in', async () => {
    localStorage.removeItem('bulig.welcomed')
    renderAt('/')

    submitSignIn('admin@bulig.com', 'password')
    expect(await screen.findByRole('heading', { name: 'What do you need?' })).toBeInTheDocument()
  })

  it('never stops a shared link', async () => {
    localStorage.removeItem('bulig.welcomed')
    renderAt('/emergency')

    expect(await screen.findByRole('region', { name: 'National Emergency Hotline' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Welcome to Bulig' })).not.toBeInTheDocument()
  })
})

describe('Saving', () => {
  it('asks a signed-out traveller to sign in first', async () => {
    renderAt('/services/mechanic')

    const link = await screen.findByRole('link', { name: 'Sign in to save Sample Motor Repair' })
    expect(link).toHaveAttribute('href', '/profile?next=%2Fservices%2Fmechanic')
  })

  it('saves a place and shows it on Saved', async () => {
    localStorage.setItem('bulig.session', 'test@bulig.com')
    renderAt('/services/mechanic')

    const save = await screen.findByRole('button', { name: 'Save Sample Motor Repair' })
    fireEvent.click(save)
    expect(save).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', { name: 'Saved' }))
    const saved = screen.getByRole('list', { name: 'Saved places' })
    expect(within(saved).getByText('Sample Motor Repair')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('bulig.saved.test@bulig.com') ?? '[]')).toEqual([
      'ph-eastern-samar-guiuan-sample-mechanic',
    ])
  })

  it('keeps Emergency Help open without an account', async () => {
    renderAt('/emergency')

    const hotline = await screen.findByRole('region', { name: 'National Emergency Hotline' })
    expect(within(hotline).getByRole('link', { name: /911/ })).toHaveAttribute('href', 'tel:911')
  })
})
