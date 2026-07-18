import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ShootEditor } from './ShootEditor'

vi.mock('../../repositories/assetRepository', () => ({
  listExternalAssetLinks: vi.fn().mockResolvedValue([{ id: 'asset-1', label: '现场原片', external_url: 'https://drive.example.com/a' }]),
  createExternalAssetLink: vi.fn(),
  deleteExternalAssetLink: vi.fn()
}))

afterEach(() => cleanup())

it('keeps external asset links visible but hides all asset mutations for readonly members', async () => {
  render(
    <ShootEditor
      workspaceId="workspace-1"
      actorId="reader-1"
      readOnly
      options={[{ id: 'content-1', title: '量房现场怎么拍', productionStage: 'ready_to_shoot', plannedFor: null, latestShotList: [] }]}
      onCancel={vi.fn()}
      onSave={vi.fn()}
    />
  )

  expect(await screen.findByText('现场原片')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: '记录链接' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /移除 现场原片 链接/ })).not.toBeInTheDocument()
})
