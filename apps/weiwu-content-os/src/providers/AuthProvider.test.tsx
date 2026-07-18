import { render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
    }
  }
}))

import { AuthProvider, useAuth } from './AuthProvider'

function Probe() {
  const { user, isBootstrapping } = useAuth()
  return <span>{isBootstrapping ? 'loading' : user ? 'signed-in' : 'signed-out'}</span>
}

it('finishes signed out without session', async () => {
  render(<AuthProvider><Probe /></AuthProvider>)
  expect(await screen.findByText('signed-out')).toBeInTheDocument()
})
