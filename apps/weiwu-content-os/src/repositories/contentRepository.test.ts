import { describe, expect, it } from 'vitest'
import { toContentListQuery, toSoftDeletePatch } from './contentRepository'

describe('content helpers', () => {
  it('keeps all tracks unfiltered', () => {
    expect(toContentListQuery('workspace-1', 'all')).toEqual({
      workspaceId: 'workspace-1',
      trackCode: null,
      includeDeleted: false
    })
  })

  it('soft deletes with timestamp', () => {
    expect(toSoftDeletePatch(new Date('2026-07-18T00:00:00.000Z'))).toEqual({
      deleted_at: '2026-07-18T00:00:00.000Z'
    })
  })
})
