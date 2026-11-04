import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BusyContent } from './Spinner.tsx'

describe('BusyContent', () => {
  it('shows the label when idle', () => {
    render(
      <button type="submit">
        <BusyContent busy={false} busyLabel="Saving…">
          Save changes
        </BusyContent>
      </button>,
    )
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('swaps the label for only the ring while busy, keeping its width', () => {
    render(
      <button type="submit" aria-busy>
        <BusyContent busy busyLabel="Saving…">
          Save changes
        </BusyContent>
      </button>,
    )
    // The label stays in the layout (so the button keeps its size) but is hidden and silent.
    expect(screen.getByText('Save changes')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('Saving…')
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeInTheDocument()
  })
})
