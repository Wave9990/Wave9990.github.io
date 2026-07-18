import { describe, expect, it } from 'vitest'
import { contentToCsv, createWorkspaceBackup, parseWorkspaceBackup } from './exportRepository'

describe('contentToCsv', () => {
  it('uses BOM and stable headers', () => {
    expect(contentToCsv([{ id: 'c1', title: '量房怎么拍', track: 'weiwu_b2b', topicStatus: 'approved' }]))
      .toBe('\uFEFFcontent_id,title,track,topic_status\nc1,量房怎么拍,weiwu_b2b,approved\n')
  })

  it('escapes spreadsheet-sensitive values deterministically', () => {
    expect(contentToCsv([{ id: 'c,1', title: '"量房"\n怎么拍', track: 'coaching_c2c', topicStatus: 'inbox' }]))
      .toBe('\uFEFFcontent_id,title,track,topic_status\n"c,1","""量房""\n怎么拍",coaching_c2c,inbox\n')
  })

  it('neutralizes spreadsheet formulas', () => {
    expect(contentToCsv([{ id: '=c1', title: '+量房', track: 'weiwu_b2b', topicStatus: 'approved' }]))
      .toBe("\uFEFFcontent_id,title,track,topic_status\n'=c1,'+量房,weiwu_b2b,approved\n")
  })
})

describe('workspace backups', () => {
  it('groups backup by workspace', () => {
    expect(createWorkspaceBackup('w1', [], [], []).workspaceId).toBe('w1')
  })

  it('accepts only the known backup shape', () => {
    const backup = createWorkspaceBackup('w1', [{ id: 'c1' }], [], [])
    expect(parseWorkspaceBackup(JSON.stringify(backup))).toMatchObject({ schemaVersion: 1, workspaceId: 'w1' })
    expect(() => parseWorkspaceBackup('{"workspaceId":"w1"}')).toThrow('备份文件格式无效')
  })
})
