import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it } from 'vitest'
import { TopicCard } from './TopicCard'

it('preserves the active track in an editor link', () => {
  render(
    <MemoryRouter>
      <TopicCard
        search="?track=coaching_c2c"
        item={{
          id: 'topic-1', workspace_id: 'workspace-1', track_id: 'track-1', title: '测试选题', insight: null,
          audience: null, content_type: null, keyword: null, objective: null, priority: 'medium', topic_status: 'inbox',
          production_stage: 'no_script', planned_for: null, deleted_at: null, created_by: 'user-1',
          created_at: '2026-07-18T00:00:00.000Z', updated_at: '2026-07-18T00:00:00.000Z',
          tracks: { code: 'coaching_c2c', name: '陪跑 · C端获客' }
        }}
      />
    </MemoryRouter>
  )
  expect(screen.getByRole('link', { name: '测试选题' })).toHaveAttribute('href', '/topics/topic-1?track=coaching_c2c')
})
