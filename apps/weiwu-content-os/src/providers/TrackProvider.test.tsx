import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { expect, it } from 'vitest'
import { TrackProvider, useTrack } from './TrackProvider'

function Probe() {
  const { trackFilter, setTrackFilter } = useTrack()
  return (
    <>
      <span>{trackFilter}</span>
      <button type="button" onClick={() => setTrackFilter('coaching_c2c')}>switch</button>
    </>
  )
}

it('defaults to B端 and switches filter state', async () => {
  const user = userEvent.setup()
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <TrackProvider><Probe /></TrackProvider>
    </MemoryRouter>
  )

  expect(screen.getByText('weiwu_b2b')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'switch' }))
  expect(screen.getByText('coaching_c2c')).toBeInTheDocument()
})

it('falls back to B端 for an invalid URL filter', () => {
  render(
    <MemoryRouter initialEntries={['/dashboard?track=not-a-track']}>
      <TrackProvider><Probe /></TrackProvider>
    </MemoryRouter>
  )

  expect(screen.getByText('weiwu_b2b')).toBeInTheDocument()
})
