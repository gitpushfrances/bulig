import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import { forgetMyUpdates } from '../contribute/useMyUpdates.ts'
import { resetLocalStaff } from '../staff/local.ts'
import { forgetStaff } from '../staff/snapshot.ts'

// Serve the test copy of the data (with its SAMPLE places and numbers) to fetch(), so pages have
// something to show. The app itself ships no sample records (public/data/ holds only real ones).
const dataFiles = import.meta.glob<unknown>('./fixtures/data/**/*.json', { eager: true, import: 'default' })

function fakeFetch(input: RequestInfo | URL): Promise<Response> {
  const path = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url
  const data = dataFiles[`./fixtures${path}`]
  return Promise.resolve(
    data === undefined
      ? new Response('Not found', { status: 404 })
      : new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } }),
  )
}

// jsdom has no layout, so it can't scroll. Layout scrolls a new page to its top.
window.scrollTo = () => {}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(fakeFetch))
  localStorage.clear()
  forgetMyUpdates()
  forgetStaff()
  resetLocalStaff()
  // Signed in as the test user by default, since every screen but Emergency needs an account.
  // Tests about signing in, guests and the login wall remove this first.
  localStorage.setItem('bulig.session', 'test@bulig.com')
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
