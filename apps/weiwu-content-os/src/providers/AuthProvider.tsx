import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { authErrorMessage } from '../lib/errors'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database'

type Workspace = Database['public']['Tables']['workspaces']['Row']
type Membership = Database['public']['Tables']['workspace_members']['Row']

export interface AuthContextValue {
  session: Session | null
  user: User | null
  workspace: Workspace | null
  membership: Membership | null
  isBootstrapping: boolean
  configurationError: boolean
  signInWithEmail: (email: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  retryWorkspace: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

async function bootstrapWorkspace(session: Session): Promise<{ workspace: Workspace; membership: Membership | null }> {
  if (!supabase) throw new Error('Supabase is not configured')

  const { data: workspace, error: workspaceError } = await supabase.rpc('bootstrap_workspace')
  if (workspaceError || !workspace) throw workspaceError ?? new Error('Workspace bootstrap failed')

  const { data: membership, error: membershipError } = await supabase
    .from('workspace_members')
    .select('*')
    .eq('workspace_id', workspace.id)
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (membershipError) throw membershipError
  return { workspace, membership }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [membership, setMembership] = useState<Membership | null>(null)
  const [isBootstrapping, setIsBootstrapping] = useState(true)

  const applySession = useCallback(async (nextSession: Session | null, isMounted: () => boolean) => {
    if (!isMounted()) return
    setSession(nextSession)
    setWorkspace(null)
    setMembership(null)

    if (!nextSession) {
      setIsBootstrapping(false)
      return
    }

    setIsBootstrapping(true)
    try {
      const result = await bootstrapWorkspace(nextSession)
      if (!isMounted()) return
      setWorkspace(result.workspace)
      setMembership(result.membership)
    } catch {
      // Keep the authenticated session, but never expose a database/auth error
      // to the UI. RequireAuth presents a recoverable setup message instead.
      if (!isMounted()) return
      setWorkspace(null)
      setMembership(null)
    } finally {
      if (isMounted()) setIsBootstrapping(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    const isMounted = () => mounted

    if (!supabase) {
      setIsBootstrapping(false)
      return () => {
        mounted = false
      }
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void applySession(nextSession, isMounted)
    })

    void supabase.auth.getSession().then(({ data }) => applySession(data.session, isMounted))

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [applySession])

  const signInWithEmail = useCallback(async (email: string) => {
    if (!supabase) return { error: '云端服务尚未配置，请联系工作区管理员。' }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    })

    return { error: error ? authErrorMessage(error) : null }
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
  }, [])

  const retryWorkspace = useCallback(async () => {
    if (!session) return
    await applySession(session, () => true)
  }, [applySession, session])

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    workspace,
    membership,
    isBootstrapping,
    configurationError: supabase === null,
    signInWithEmail,
    signOut,
    retryWorkspace
  }), [isBootstrapping, membership, retryWorkspace, session, signInWithEmail, signOut, workspace])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
