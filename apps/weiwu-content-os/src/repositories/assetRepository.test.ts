import { describe, expect, it } from 'vitest'
import { deletedAssetLinkAction, normalizeExternalAssetLink, toAssetLinkActivityDetails } from './assetRepository'

describe('external asset link helpers', () => {
  it('accepts a labelled HTTPS link without pretending to upload a file', () => {
    expect(normalizeExternalAssetLink('  现场原片  ', 'https://drive.example.com/folder/a?x=1')).toEqual({
      label: '现场原片',
      externalUrl: 'https://drive.example.com/folder/a?x=1'
    })
  })

  it('rejects insecure or malformed external links', () => {
    expect(() => normalizeExternalAssetLink('原片', 'http://example.com/file')).toThrow('HTTPS')
    expect(() => normalizeExternalAssetLink('', 'https://example.com/file')).toThrow('标签')
    expect(() => normalizeExternalAssetLink('原片', 'not a url')).toThrow('有效的 HTTPS')
  })

  it('keeps the activity record scoped to the linked content', () => {
    expect(toAssetLinkActivityDetails('content-1', '现场原片')).toEqual({
      content_id: 'content-1',
      label: '现场原片',
      source: 'external_https_link'
    })
  })

  it('uses a truthful permanent-deletion activity action for a hard-deleted link', () => {
    expect(deletedAssetLinkAction).toBe('deleted')
  })
})
