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

function signIn(email: string, password: string) {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } })
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
}

describe('Test sign-in', () => {
  it('signs in with the test login and shows the role', () => {
    renderAt('/profile')

    signIn(' Test@Bulig.com ', 'password')
    expect(screen.getByRole('heading', { name: 'Test traveller' })).toBeInTheDocument()
    expect(screen.getByText(/Role: User/)).toBeInTheDocument()
    expect(localStorage.getItem('bulig.session')).toBe('test@bulig.com')
  })

  it('says what went wrong for a bad password and stays signed out', () => {
    renderAt('/profile')

    signIn('test@bulig.com', 'wrong')
    expect(screen.getByRole('alert')).toHaveTextContent("don't match")
    expect(localStorage.getItem('bulig.session')).toBeNull()
  })

  it('fills in the test login for testers', () => {
    renderAt('/profile')

    fireEvent.click(screen.getByRole('button', { name: 'Fill in test login' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
  })

  it('signs out and forgets the session', () => {
    localStorage.setItem('bulig.session', 'test@bulig.com')
    renderAt('/profile')

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    expect(localStorage.getItem('bulig.session')).toBeNull()
  })
})

describe('Saving', () => {
  it('asks a signed-out traveller to sign in first', async () => {
    renderAt('/services')

    const link = await screen.findByRole('link', { name: 'Sign in to save Sample Motor Repair' })
    expect(link).toHaveAttribute('href', '/profile?next=%2Fservices')
  })

  it('saves a place and shows it on Saved', async () => {
    localStorage.setItem('bulig.session', 'test@bulig.com')
    renderAt('/services')

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
    renderAt('/')

    const hotline = await screen.findByRole('region', { name: 'National Emergency Hotline' })
    expect(within(hotline).getByRole('link', { name: /911/ })).toHaveAttribute('href', 'tel:911')
  })
})
