import { describe, expect, it } from 'vitest'
import { defaultTrackFilter, isProductionStage, isTopicStatus } from './domain'

describe('content domain', () => {
  it('defaults to B端', () => expect(defaultTrackFilter()).toBe('weiwu_b2b'))

  it('accepts only defined production stages', () => {
    expect(isProductionStage('ready_to_shoot')).toBe(true)
    expect(isProductionStage('bad_stage')).toBe(false)
  })

  it('accepts only defined topic statuses', () => {
    expect(isTopicStatus('approved')).toBe(true)
    expect(isTopicStatus('published')).toBe(false)
  })
})
