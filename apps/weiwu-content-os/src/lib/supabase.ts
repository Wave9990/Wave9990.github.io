import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { readPublicEnv } from './env'
import type { Database } from '../types/database'

function createConfiguredClient(): SupabaseClient<Database> | null {
  try {
    const env = readPublicEnv(import.meta.env)
    return createClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    })
  } catch {
    // A real project URL/key is intentionally not committed.  Keeping this
    // nullable lets contributors run the visual shell before cloud setup,
    // while login remains explicitly unavailable instead of using fake keys.
    return null
  }
}

export const supabase = createConfiguredClient()

export const isSupabaseConfigured = supabase !== null
