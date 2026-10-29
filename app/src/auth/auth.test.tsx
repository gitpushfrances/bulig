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

function signedOut() {
  localStorage.removeItem('bulig.session')
}

function submitSignIn(email: string, password: string) {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } })
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
}

// Walks the onboarding to the account form: four Ropi steps, or "Skip intro".
function toSignupForm(skip = true) {
  if (skip) fireEvent.click(screen.getByRole('button', { name: 'Skip intro' }))
  else {
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    fireEvent.click(screen.getByRole('button', { name: "Let's get started" }))
  }
}

function fillSignup(name: string, email: string, password: string, agree = true) {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: name } })
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } })
  if (agree) fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
}

describe('Login', () => {
  it('opens on the first visit to /, with no test shortcuts or emergency button', () => {
    signedOut()
    renderAt('/')

    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Fill in test login/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /911/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute('href', '/forgot-password')
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute('href', '/signup')
  })

  it.each([
    ['test@bulig.com', 'Test traveller', 'User'],
    ['moderator@bulig.com', 'Test moderator', 'Moderator'],
    ['admin@bulig.com', 'Test admin', 'Admin'],
  ])('signs in %s and opens Home', async (email, name, role) => {
    signedOut()
    renderAt('/login')

    submitSignIn(` ${email.toUpperCase()} `, 'password')
    expect(await screen.findByRole('heading', { name: 'What do you need?' })).toBeInTheDocument()
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', { name: 'Profile' }))
    expect(screen.getByRole('heading', { name })).toBeInTheDocument()
    expect(screen.getByText(role)).toBeInTheDocument()
    expect(localStorage.getItem('bulig.session')).toBe(email)
  })

  it('says what went wrong for a bad password and stays signed out', async () => {
    signedOut()
    renderAt('/login')

    submitSignIn('test@bulig.com', 'wrong')
    expect(await screen.findByRole('alert')).toHaveTextContent("don't match")
    expect(localStorage.getItem('bulig.session')).toBeNull()
  })

  it('returns to the page that asked for sign-in', async () => {
    signedOut()
    renderAt('/services/mechanic')

    submitSignIn('test@bulig.com', 'password')
    expect(await screen.findByRole('heading', { level: 1, name: 'Breakdown' })).toBeInTheDocument()
  })

  it('signs out from Profile, back to the login', () => {
    renderAt('/profile')

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(localStorage.getItem('bulig.session')).toBeNull()
  })

  it('shows the reset confirmation without saying whether the email has an account', () => {
    signedOut()
    renderAt('/forgot-password')

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'nobody@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }))
    expect(screen.getByText(/If nobody@example.com has an account/)).toBeInTheDocument()
  })
})

describe('Continue without an account', () => {
  it('opens Emergency only, with 911 and local authorities', async () => {
    signedOut()
    renderAt('/login')

    fireEvent.click(screen.getByRole('button', { name: 'Continue without an account' }))
    const hotline = await screen.findByRole('region', { name: 'National Emergency Hotline' })
    expect(within(hotline).getByRole('link', { name: /911/ })).toHaveAttribute('href', 'tel:911')
    expect(await screen.findByRole('list', { name: 'Local emergency numbers' })).toBeInTheDocument()
  })

  it('asks a guest to sign in or sign up anywhere else', () => {
    signedOut()
    localStorage.setItem('bulig.guest', '1')
    renderAt('/services')

    expect(screen.getByRole('heading', { name: "Sign in to see what's near you" })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login?next=%2Fservices')
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute('href', '/signup?next=%2Fservices')
    expect(screen.queryByRole('navigation', { name: 'Services' })).not.toBeInTheDocument()
  })

  it('never blocks a shared Emergency link, even signed out', async () => {
    signedOut()
    renderAt('/emergency')

    expect(await screen.findByRole('region', { name: 'National Emergency Hotline' })).toBeInTheDocument()
  })
})

describe('Sign up (onboarding)', () => {
  it('walks through four Ropi steps before the account form', () => {
    signedOut()
    renderAt('/signup')

    expect(screen.getByText(/Hi, I'm Ropi!/)).toBeInTheDocument()
    expect(screen.getByTestId('mascot')).toHaveAttribute('data-variant', 'ready')
    toSignupForm(false)
    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument()
  })

  it('creates a user on this phone, signs in, and never stores the password', async () => {
    signedOut()
    renderAt('/signup')

    toSignupForm()
    fillSignup('Ana Reyes', 'Ana@Example.com', 'long enough')
    expect(await screen.findByRole('heading', { name: 'What do you need?' })).toBeInTheDocument()
    expect(localStorage.getItem('bulig.session')).toBe('ana@example.com')
    expect(localStorage.getItem('bulig.accounts')).not.toContain('long enough')
  })

  it('checks each field and the terms box', () => {
    signedOut()
    renderAt('/signup')

    toSignupForm()
    fillSignup('', 'not-an-email', 'short', false)
    expect(screen.getByText('Enter your name.')).toBeInTheDocument()
    expect(screen.getByText('Enter an email like name@example.com.')).toBeInTheDocument()
    expect(screen.getByText('Use at least 8 characters.')).toBeInTheDocument()
    expect(screen.getByText(/Agree to the Terms/)).toBeInTheDocument()
    expect(localStorage.getItem('bulig.accounts')).toBeNull()
  })

  it('refuses an email that already has an account, and offers sign in', async () => {
    signedOut()
    renderAt('/signup')

    toSignupForm()
    fillSignup('Someone', 'test@bulig.com', 'long enough')
    expect(await screen.findByRole('alert')).toHaveTextContent('already has an account')
    expect(screen.getByRole('link', { name: 'Sign in instead' })).toHaveAttribute('href', '/login')
  })
})

describe('Profile', () => {
  it('shows the account, the version and the legal pages', () => {
    renderAt('/profile')

    expect(screen.getByRole('heading', { name: 'Test traveller' })).toBeInTheDocument()
    expect(screen.getByText('Member since October 2026')).toBeInTheDocument()
    expect(screen.getByText(/Bulig v\d+\.\d+\.\d+ · build/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Terms of Use/ })).toHaveAttribute('href', '/terms')
    expect(screen.getByRole('link', { name: /Privacy Policy/ })).toHaveAttribute('href', '/privacy')
  })

  it('saves edited details on this phone', () => {
    renderAt('/profile/edit')

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Juan Dela Cruz' } })
    fireEvent.change(screen.getByLabelText('Mobile number (optional)'), { target: { value: '0917 123 4567' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(screen.getByRole('heading', { name: 'Juan Dela Cruz' })).toBeInTheDocument()
  })

  it('switches the theme and remembers it', () => {
    renderAt('/profile')

    fireEvent.click(screen.getByRole('button', { name: 'Dark' }))
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(localStorage.getItem('bulig.theme')).toBe('dark')
    fireEvent.click(screen.getByRole('button', { name: 'System' }))
    expect(document.documentElement).not.toHaveAttribute('data-theme')
  })

  it('deletes an account made on this phone only after typing "delete"', async () => {
    signedOut()
    renderAt('/signup')
    toSignupForm()
    fillSignup('Temp', 'temp@example.com', 'long enough')
    await screen.findByRole('heading', { name: 'What do you need?' })
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', { name: 'Profile' }))

    fireEvent.click(screen.getByRole('button', { name: 'Delete account' }))
    const confirm = screen.getAllByRole('button', { name: 'Delete account' }).at(-1)!
    expect(confirm).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Type "delete" to confirm'), { target: { value: 'delete' } })
    fireEvent.click(confirm)
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(localStorage.getItem('bulig.accounts')).toBe('[]')
  })
})

describe('Saving', () => {
  it('saves a place and shows it on Saved', async () => {
    localStorage.setItem('bulig.area', 'ph-cebu-cebu-city')
    renderAt('/nearby/breakdown')

    const save = await screen.findByRole('button', { name: 'Save Sample Cebu City Auto and Motor Repair' })
    fireEvent.click(save)
    expect(save).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', { name: 'Saved' }))
    const saved = screen.getByRole('list', { name: 'Saved places' })
    expect(within(saved).getByText('Sample Cebu City Auto and Motor Repair')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('bulig.saved.test@bulig.com') ?? '[]')).toEqual([
      'ph-cebu-cebu-city-sample-mechanic',
    ])
  })

  it('keeps Emergency Help open without an account', async () => {
    renderAt('/emergency')

    const hotline = await screen.findByRole('region', { name: 'National Emergency Hotline' })
    expect(within(hotline).getByRole('link', { name: /911/ })).toHaveAttribute('href', 'tel:911')
  })
})
