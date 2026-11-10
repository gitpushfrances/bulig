import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import App from '../App.tsx'
import { canApplyAgain, createApiScout, type ScoutRequest } from '../contribute/scout.ts'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

const as = (email: string) => localStorage.setItem('bulig.session', email)

describe('Become a Bulig Scout', () => {
  it('shows a regular user the Profile row, the explainer, then the form and a waiting request', async () => {
    as('test@bulig.com')
    renderAt('/profile')
    const row = await screen.findByRole('link', { name: /Become a Bulig Scout/ })
    expect(row).toHaveAttribute('href', '/profile/scout')
    fireEvent.click(row)

    expect(await screen.findByRole('heading', { name: 'What Scouts do' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'How it works' })).toBeInTheDocument()
    expect(screen.getByText(/Not a rescuer/)).toBeInTheDocument()
    // Never claims Bulig or a Scout sends help.
    expect(document.body.textContent).not.toMatch(/help is on the way|request help|location sent/i)

    fireEvent.click(screen.getByRole('button', { name: 'Apply to be a Scout' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Send request' }))
    expect(await screen.findByText('Enter the barangay and town you know well.')).toBeInTheDocument()
    expect(screen.getByText('Pick at least one.')).toBeInTheDocument()
    expect(screen.getByText('Tick both to send your request.')).toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox', { name: 'Barangay and town you know well' }), {
      target: { value: 'Surok, Guiuan' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Tricycle' }))
    fireEvent.click(screen.getByRole('checkbox', { name: /Scout rules/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /18 or older/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Send request' }))
    // A clear success screen first, with what was sent.
    expect(await screen.findByRole('heading', { name: 'Request sent' })).toBeInTheDocument()
    expect(screen.getByText('Tricycle')).toBeInTheDocument()
    // Coming back later shows the waiting request, with Take back.
    fireEvent.click(screen.getByRole('link', { name: 'Back to Profile' }))
    expect(await screen.findByText('Waiting')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: /Become a Bulig Scout/ }))
    expect(await screen.findByText(/for Surok, Guiuan/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Take back my request' }))
    expect(await screen.findByRole('button', { name: 'Apply to be a Scout' })).toBeInTheDocument()
  })

  it('shows Scouts their tools instead of the form, and no Profile row', async () => {
    as('contributor@bulig.com')
    renderAt('/profile')
    expect(await screen.findByText('Scout')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Become a Bulig Scout/ })).not.toBeInTheDocument()
  })

  it('tells a Scout on the page what they can do', async () => {
    as('contributor@bulig.com')
    renderAt('/profile/scout')
    expect(await screen.findByText("You're a Bulig Scout")).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'My updates' })).toHaveAttribute('href', '/updates')
  })
})

describe('Scout request API', () => {
  const reply = (status: number, body: unknown) =>
    Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))

  it('sends the area, the optional words and the agreement', async () => {
    const calls: [string, string, unknown][] = []
    const store = createApiScout('https://api.test/api/v1', (url, init) => {
      calls.push([String(init?.method), String(url), init?.body ? JSON.parse(String(init.body)) : undefined])
      return reply(201, { request: { id: 'scr_1', status: 'pending' } })
    })
    const r = await store.apply({ area: ' Surok, Guiuan ', travel: ['tricycle'], why: '  ' })
    expect(r.ok).toBe(true)
    expect(calls[0]).toEqual([
      'POST',
      'https://api.test/api/v1/me/contributor-request',
      { area: 'Surok, Guiuan', travel: ['tricycle'], agreed: true, adult: true },
    ])
  })

  it('reads 409 and 429 into plain reasons', async () => {
    const pending = createApiScout('x', () => reply(409, { code: 'pending' }))
    expect(await pending.apply({ area: 'Guiuan', travel: [] })).toEqual({ ok: false, reason: 'pending' })
    const already = createApiScout('x', () => reply(409, { code: 'already_contributor' }))
    expect(await already.apply({ area: 'Guiuan', travel: [] })).toEqual({ ok: false, reason: 'already' })
    const soon = createApiScout('x', () => reply(429, { canApplyAgainAt: '2026-12-10' }))
    expect(await soon.apply({ area: 'Guiuan', travel: [] })).toEqual({ ok: false, reason: 'too_soon', canApplyAgainAt: '2026-12-10' })
  })

  it('lets a declined person ask again only after the date', () => {
    const declined = { status: 'declined', canApplyAgainAt: '2026-12-10T00:00:00Z' } as ScoutRequest
    expect(canApplyAgain(declined, new Date('2026-12-01'))).toBe(false)
    expect(canApplyAgain(declined, new Date('2026-12-11'))).toBe(true)
    expect(canApplyAgain(null)).toBe(true)
  })
})
