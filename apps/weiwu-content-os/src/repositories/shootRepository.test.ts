import { expect, it, vi } from 'vitest'
import {
  createShootTask,
  buildShootCompletionPatch,
  isShootSelectableStage,
  isShootCompletionAdvanceSource,
  shouldAdvanceAfterCompletion,
  completeShootTask,
  shouldStartShootingForTask,
  toShootStageAdvanceAudit,
  toShootingStageStartAudit
} from './shootRepository'

const mockedClient = vi.hoisted(() => ({ from: vi.fn() }))

vi.mock('../lib/supabase', () => ({ supabase: mockedClient }))

it('marks a task completed', () => {
  expect(completeShootTask('2026-07-18T09:00:00.000Z'))
    .toEqual({ status: 'completed', completed_at: '2026-07-18T09:00:00.000Z' })
})

it('advances only with no planned task', () => {
  expect(shouldAdvanceAfterCompletion(['completed', 'cancelled'])).toBe(true)
  expect(shouldAdvanceAfterCompletion(['completed', 'planned'])).toBe(false)
})

it('persists the final shot checklist before task completion', () => {
  expect(buildShootCompletionPatch([{ shot: '门口第一视角', done: true }, { shot: '业主需求补充' }], '2026-07-18T09:00:00.000Z'))
    .toEqual({
      required_shots: [{ shot: '门口第一视角', done: true }, { shot: '业主需求补充' }],
      status: 'completed',
      completed_at: '2026-07-18T09:00:00.000Z'
    })
})

it('only advances a parent from an active pre-edit shooting stage', () => {
  expect(isShootCompletionAdvanceSource('scripting')).toBe(true)
  expect(isShootCompletionAdvanceSource('ready_to_shoot')).toBe(true)
  expect(isShootCompletionAdvanceSource('shooting')).toBe(true)
  expect(isShootCompletionAdvanceSource('ready_to_publish')).toBe(false)
  expect(isShootCompletionAdvanceSource('published')).toBe(false)
})

it('audits the real parent stage instead of a hardcoded stage', () => {
  expect(toShootStageAdvanceAudit('ready_to_shoot')).toEqual({
    from: 'ready_to_shoot',
    to: 'shot_waiting_edit',
    trigger: 'all_shoot_tasks_complete'
  })
})

it('starts shooting only for the first active shoot task and records the transition', () => {
  expect(shouldStartShootingForTask('ready_to_shoot', 'planned')).toBe(true)
  expect(shouldStartShootingForTask('ready_to_shoot', 'cancelled')).toBe(false)
  expect(shouldStartShootingForTask('shooting', 'planned')).toBe(false)
  expect(toShootingStageStartAudit()).toEqual({
    from: 'ready_to_shoot',
    to: 'shooting',
    trigger: 'first_active_shoot_task'
  })
})

it('only offers content that has reached the shooting handoff to the shooting workflow', () => {
  expect(isShootSelectableStage('scripting')).toBe(false)
  expect(isShootSelectableStage('ready_to_shoot')).toBe(true)
  expect(isShootSelectableStage('shooting')).toBe(true)
  expect(isShootSelectableStage('shot_waiting_edit')).toBe(true)
  expect(isShootSelectableStage('published')).toBe(false)
})

it('rejects a scripting content item before reaching the shoot-task insert path', async () => {
  const contentQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'content-1', production_stage: 'scripting' }, error: null })
  }
  contentQuery.select.mockReturnValue(contentQuery)
  contentQuery.eq.mockReturnValue(contentQuery)
  contentQuery.is.mockReturnValue(contentQuery)
  mockedClient.from.mockImplementation((table: string) => {
    if (table === 'content_items') return contentQuery
    throw new Error(`unexpected repository call: ${table}`)
  })

  await expect(createShootTask('workspace-1', 'user-1', { contentId: 'content-1' }))
    .rejects.toThrow('脚本标记为就绪')

  expect(mockedClient.from).toHaveBeenCalledWith('content_items')
  expect(mockedClient.from).not.toHaveBeenCalledWith('shoot_tasks')
})
