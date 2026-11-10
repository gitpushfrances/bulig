import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import AuthProvider from '../auth/AuthProvider.tsx'
import type { AccountStore, GoogleSignInResult } from '../auth/store.ts'
import LoginPage from '../pages/LoginPage.tsx'
import SignupPage from '../pages/SignupPage.tsx'

// A fake Google: renderButton draws a plain button that hands back an ID token, like the real popup.
const google = vi.hoisted(() => ({ ua: null as string | null }))
vi.mock('../auth/google.ts', async (orig) => {
  const real = await orig<typeof import('../auth/google.ts')>()
  let callback: ((token: string) => void) | null = null
  const id = {
    initialize: () => {},
    renderButton: (parent: HTMLElement, options: { text?: string }) => {
      const b = document.createElement('button')
      b.type = 'button'
      b.textContent = options.text === 'signup_with' ? 'Sign up with Google' : 'Continue with Google'
      b.onclick = () => callback?.('id-token-from-google')
      parent.appendChild(b)
    },
    disableAutoSelect: () => {},
  }
  return {
    ...real,
    GOOGLE_CLIENT_ID: 'test-client.apps.googleusercontent.com',
    inAppBrowser: () => google.ua,
    loadGoogle: async () => id,
    listenForGoogle: (_id: unknown, _client: string, cb: (token: string) => void) => {
      callback = cb
    },
  }
})

function fakeStore(answer: GoogleSignInResult) {
  const signInWithGoogle = vi.fn(async () => answer)
  const store = {
    online: true,
    restore: () => null,
    refresh: async () => null,
    loadSaved: async () => [],
    setSaved: async () => 'ok',
    canManage: () => true,
    signInWithGoogle,
  } as unknown as AccountStore
  return { store, signInWithGoogle }
}

function renderAt(path: string, store: AccountStore) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider store={store}>
        <Routes>
          <Route path="login" element={<LoginPage />} />
          <Route path="signup" element={<SignupPage />} />
          <Route path="*" element={<p>Landed</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

const account = { email: 'ana@gmail.com', name: 'Ana', role: 'user' as const, areas: [], hasPassword: false, google: true }

describe('Continue with Google', () => {
  it('signs in with the token from Google and goes where the person was heading', async () => {
    google.ua = null
    const { store, signInWithGoogle } = fakeStore({ ok: true, account, created: true })
    renderAt('/login?next=/saved', store)

    expect(screen.getByText(/By continuing with Google you agree to the/)).toBeInTheDocument()
    fireEvent.click(await screen.findByRole('button', { name: 'Continue with Google' }))

    expect(await screen.findByText('Landed')).toBeInTheDocument()
    expect(signInWithGoogle).toHaveBeenCalledWith('id-token-from-google')
  })

  it('comes first on Create account', async () => {
    google.ua = null
    const { store } = fakeStore({ ok: true, account, created: true })
    renderAt('/signup', store)
    fireEvent.click(screen.getByRole('button', { name: 'Skip intro' }))
    const googleButton = await screen.findByRole('button', { name: 'Sign up with Google' })
    const create = screen.getByRole('button', { name: 'Create account' })
    expect(googleButton.compareDocumentPosition(create) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByText('or use your email')).toBeInTheDocument()
  })

  it('says why it failed and stays on the login', async () => {
    google.ua = null
    const { store } = fakeStore({ ok: false, reason: 'invalid' })
    renderAt('/login', store)
    fireEvent.click(await screen.findByRole('button', { name: 'Continue with Google' }))
    expect(await screen.findByText("Google couldn't confirm your sign-in. Try again.")).toBeInTheDocument()
    expect(screen.queryByText('Landed')).not.toBeInTheDocument()
  })

  it('inside Messenger, says to open Chrome instead of showing a button that fails', async () => {
    google.ua = 'Messenger'
    const { store } = fakeStore({ ok: true, account, created: false })
    renderAt('/login', store)
    expect(screen.getByText(/Google sign-in doesn.t work inside Messenger/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy the link' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Continue with Google' })).not.toBeInTheDocument()
  })
})
