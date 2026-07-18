import { describe, expect, it } from 'vitest'
import { readPublicEnv } from './env'

describe('readPublicEnv', () => {
  it('returns browser-safe Supabase values', () => {
    expect(readPublicEnv({
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example'
    } as ImportMetaEnv)).toEqual({
      supabaseUrl: 'https://example.supabase.co',
      supabasePublishableKey: 'sb_publishable_example'
    })
  })

  it('rejects a missing public key', () => {
    expect(() => readPublicEnv({ VITE_SUPABASE_URL: 'https://example.supabase.co' } as ImportMetaEnv))
      .toThrow('VITE_SUPABASE_PUBLISHABLE_KEY is required')
  })
})
