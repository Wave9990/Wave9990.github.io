import { expect, it } from 'vitest'
import { buildStageSummary, filterDashboardActivityByContentIds, sortTodayQueue } from './dashboardRepository'

it('sorts the current work queue by priority', () => {
  const rows = [
    { id: 'a', productionStage: 'scripting', priority: 'high', plannedFor: '2026-07-18' },
    { id: 'b', productionStage: 'ready_to_shoot', priority: 'medium', plannedFor: '2026-07-18' }
  ] as const
  expect(sortTodayQueue(rows, '2026-07-18').map((row) => row.id)).toEqual(['a', 'b'])
})

it('initializes every production stage at zero', () => {
  const summary = buildStageSummary([])
  expect(summary.no_script).toBe(0)
  expect(summary.ready_to_publish).toBe(0)
  expect(summary.reviewed).toBe(0)
})

it('keeps a selected track activity feed scoped through related content', () => {
  const result = filterDashboardActivityByContentIds(
    [
      { id: 'content-b2b', entity_type: 'content_item', entity_id: 'b2b' },
      { id: 'script-b2b', entity_type: 'script', entity_id: 'script-1' },
      { id: 'shoot-c2c', entity_type: 'shoot_task', entity_id: 'shoot-2' }
    ],
    new Set(['b2b']),
    new Map([['script-1', 'b2b']]),
    new Map([['shoot-2', 'c2c']])
  )
  expect(result.map((item) => item.id)).toEqual(['content-b2b', 'script-b2b'])
})
