export interface PublicEnv {
  supabaseUrl: string
  supabasePublishableKey: string
}

export function readPublicEnv(source: ImportMetaEnv): PublicEnv {
  if (!source.VITE_SUPABASE_URL) throw new Error('VITE_SUPABASE_URL is required')
  if (!source.VITE_SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('VITE_SUPABASE_PUBLISHABLE_KEY is required')
  }

  return {
    supabaseUrl: source.VITE_SUPABASE_URL,
    supabasePublishableKey: source.VITE_SUPABASE_PUBLISHABLE_KEY
  }
}
