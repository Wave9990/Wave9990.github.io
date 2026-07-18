import { describe, expect, it } from 'vitest'
import {
  getNextScriptVersion,
  shouldSetReadyToShootStage,
  shouldSetScriptingStage,
  toContentStageActivityTarget,
  toReadyToShootStageAudit,
  toScriptListQuery
} from './scriptRepository'

describe('script helpers', () => {
  it('creates the next script version from the maximum existing version', () => {
    expect(getNextScriptVersion([{ version: 1 }, { version: 3 }])).toBe(4)
  })

  it('only moves a no-script topic into scripting', () => {
    expect(shouldSetScriptingStage('no_script')).toBe(true)
    expect(shouldSetScriptingStage('ready_to_shoot')).toBe(false)
  })

  it('moves a ready script from scripting to ready-to-shoot without reopening later stages', () => {
    expect(shouldSetReadyToShootStage('scripting', 'ready')).toBe(true)
    expect(shouldSetReadyToShootStage('no_script', 'ready')).toBe(false)
    expect(shouldSetReadyToShootStage('ready_to_shoot', 'ready')).toBe(false)
    expect(shouldSetReadyToShootStage('scripting', 'draft')).toBe(false)
    expect(toReadyToShootStageAudit()).toEqual({
      from: 'scripting',
      to: 'ready_to_shoot',
      trigger: 'script_marked_ready'
    })
    expect(toContentStageActivityTarget('content-1')).toEqual({ entityType: 'content_item', entityId: 'content-1' })
  })

  it('keeps all tracks unfiltered and preserves a specific track query', () => {
    expect(toScriptListQuery('workspace-1', 'all')).toEqual({ workspaceId: 'workspace-1', trackCode: null })
    expect(toScriptListQuery('workspace-1', 'coaching_c2c')).toEqual({ workspaceId: 'workspace-1', trackCode: 'coaching_c2c' })
  })
})
