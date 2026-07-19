import { supabase } from '../lib/supabase'
import type { Database } from '../types/database'

export type WorkspaceInvitation = Database['public']['Tables']['workspace_invitations']['Row']

function requireClient() {
  if (!supabase) throw new Error('云端服务尚未配置，请稍后重试。')
  return supabase
}

export async function listWorkspaceInvitations(workspaceId: string): Promise<WorkspaceInvitation[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('workspace_invitations')
    .select('*')
    .eq('workspace_id', workspaceId)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

async function invokeMemberAction<T>(name: 'invite-workspace-member' | 'revoke-workspace-member', body: Record<string, string>): Promise<T> {
  const client = requireClient()
  const { data, error } = await client.functions.invoke<T>(name, { body })
  if (error) throw new Error('成员权限操作暂时无法完成，请稍后重试。')
  if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') throw new Error(data.error)
  if (!data) throw new Error('成员权限操作未返回结果，请稍后重试。')
  return data
}

export async function inviteReadonlyMember(workspaceId: string, email: string) {
  return invokeMemberAction<{ message: string }>('invite-workspace-member', { workspaceId, email: email.trim().toLowerCase() })
}

export async function revokeReadonlyMember(workspaceId: string, invitationId: string) {
  return invokeMemberAction<{ message: string }>('revoke-workspace-member', { workspaceId, invitationId })
}
