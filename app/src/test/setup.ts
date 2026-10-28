import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

// Serve public/data/** to fetch() so pages load the real sample files in tests.
const dataFiles = import.meta.glob<unknown>('../../public/data/**/*.json', { eager: true, import: 'default' })

function fakeFetch(input: RequestInfo | URL): Promise<Response> {
  const path = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url
  const data = dataFiles[`../../public${path}`]
  return Promise.resolve(
    data === undefined
      ? new Response('Not found', { status: 404 })
      : new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } }),
  )
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(fakeFetch))
  localStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
