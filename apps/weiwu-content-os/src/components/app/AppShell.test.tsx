import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { TrackProvider } from '../../providers/TrackProvider'
import { AppShell } from './AppShell'
import { QuickCaptureDialog } from './QuickCaptureDialog'

let role: 'owner' | 'readonly' = 'owner'

vi.mock('../../providers/AuthProvider', () => ({
  useAuth: () => ({ workspace: { name: '测试工作区' }, membership: { role }, signOut: vi.fn() })
}))

afterEach(() => { role = 'owner'; cleanup() })

it('preserves the active content line in desktop and mobile navigation links', () => {
  render(
    <MemoryRouter initialEntries={['/dashboard?track=coaching_c2c']}>
      <TrackProvider><AppShell /></TrackProvider>
    </MemoryRouter>
  )

  for (const link of screen.getAllByRole('link')) {
    expect(link).toHaveAttribute('href', expect.stringContaining('track=coaching_c2c'))
  }
})

it('closes the quick capture dialog with Escape and returns focus to its trigger', async () => {
  const user = userEvent.setup()
  render(
    <MemoryRouter>
      <TrackProvider><QuickCaptureDialog onCapture={vi.fn()} /></TrackProvider>
    </MemoryRouter>
  )

  const trigger = screen.getByRole('button', { name: '+ 快速记录' })
  await user.click(trigger)
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  expect(screen.getByLabelText('选题或一句想法')).toHaveFocus()

  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  await waitFor(() => expect(trigger).toHaveFocus())
})

it('keeps keyboard focus inside quick capture dialog', async () => {
  const user = userEvent.setup()
  render(
    <MemoryRouter>
      <TrackProvider><QuickCaptureDialog onCapture={vi.fn()} /></TrackProvider>
    </MemoryRouter>
  )

  await user.click(screen.getByRole('button', { name: '+ 快速记录' }))
  const closeButton = screen.getByRole('button', { name: '关闭快速记录' })
  closeButton.focus()
  await user.keyboard('{Shift>}{Tab}{/Shift}')
  expect(screen.getByRole('button', { name: '取消' })).toHaveFocus()
})

it('makes readonly workspace access explicit and hides quick capture', () => {
  role = 'readonly'
  render(
    <MemoryRouter>
      <TrackProvider><AppShell /></TrackProvider>
    </MemoryRouter>
  )

  expect(screen.getByText(/仅查看 · 当前账号无法创建/)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: '+ 快速记录' })).not.toBeInTheDocument()
})
