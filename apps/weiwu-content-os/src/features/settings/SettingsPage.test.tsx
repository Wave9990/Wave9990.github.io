import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { SettingsPage } from './SettingsPage'

const readonlyAuth = {
  workspace: { id: 'w1', name: '测试工作区' },
  user: { id: 'u1', email: 'reader@example.com' },
  membership: { role: 'readonly' as const }
}

vi.mock('../../providers/AuthProvider', () => ({
  useAuth: () => readonlyAuth
}))

vi.mock('../../repositories/exportRepository', () => ({
  listArchivedContentItems: vi.fn().mockResolvedValue([]),
  contentToCsv: vi.fn(),
  downloadTextFile: vi.fn(),
  getWorkspaceExportData: vi.fn(),
  parseWorkspaceBackup: vi.fn(),
  workspaceExportFilename: vi.fn()
}))

vi.mock('../../repositories/contentRepository', () => ({ restoreContentItem: vi.fn() }))

afterEach(() => cleanup())

it('shows readonly access and does not expose export or restore actions', () => {
  render(<SettingsPage />)

  expect(screen.getAllByText('仅查看').length).toBeGreaterThan(0)
  expect(screen.queryByRole('button', { name: /下载完整 JSON 备份/ })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /下载内容 CSV/ })).not.toBeInTheDocument()
  expect(screen.getByText('仅查看成员不可以恢复归档内容。')).toBeInTheDocument()
})
