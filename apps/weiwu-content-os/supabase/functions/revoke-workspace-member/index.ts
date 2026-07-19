import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

function response(request: Request, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Access-Control-Allow-Origin': request.headers.get('origin') ?? '' } })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: { ...corsHeaders, 'Access-Control-Allow-Origin': request.headers.get('origin') ?? '' } })
  if (request.method !== 'POST') return response(request, { error: '仅支持 POST 请求。' }, 405)
  try {
    const authorization = request.headers.get('Authorization')
    if (!authorization) return response(request, { error: '请先登录后再管理成员。' }, 401)
    const url = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const callerClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } })
    const admin = createClient(url, serviceRoleKey)
    const { data: { user }, error: userError } = await callerClient.auth.getUser()
    if (userError || !user) return response(request, { error: '登录状态已失效，请重新登录。' }, 401)
    const body = await request.json()
    const workspaceId = typeof body.workspaceId === 'string' ? body.workspaceId : ''
    const invitationId = typeof body.invitationId === 'string' ? body.invitationId : ''
    if (!workspaceId || !invitationId) return response(request, { error: '成员信息缺失，请刷新后重试。' }, 400)

    const { data: ownerMembership } = await admin.from('workspace_members').select('id').eq('workspace_id', workspaceId).eq('user_id', user.id).eq('role', 'owner').maybeSingle()
    if (!ownerMembership) return response(request, { error: '只有工作区拥有者可以移除成员。' }, 403)
    const { data: invitation } = await admin.from('workspace_invitations').select('email, invited_user_id').eq('id', invitationId).eq('workspace_id', workspaceId).is('revoked_at', null).maybeSingle()
    if (!invitation) return response(request, { error: '这个成员邀请已不存在或已被撤销。' }, 404)
    if (invitation.invited_user_id === user.id) return response(request, { error: '不能移除当前拥有者。' }, 400)

    const { error: revokeError } = await admin.from('workspace_invitations').update({ revoked_at: new Date().toISOString() }).eq('id', invitationId)
    if (revokeError) return response(request, { error: '撤销成员失败，请稍后重试。' }, 400)
    if (invitation.invited_user_id) {
      const { error: membershipError } = await admin.from('workspace_members').delete().eq('workspace_id', workspaceId).eq('user_id', invitation.invited_user_id).eq('role', 'readonly')
      if (membershipError) return response(request, { error: '权限已撤销，但成员记录清理失败，请联系管理员。' }, 400)
    }
    await admin.from('activity_logs').insert({ workspace_id: workspaceId, actor_id: user.id, entity_type: 'workspace_invitation', entity_id: invitationId, action: 'deleted', details: { email: invitation.email } })
    return response(request, { message: `已撤销 ${invitation.email} 的只读权限。` })
  } catch (error) {
    return response(request, { error: error instanceof Error ? error.message : '撤销失败，请稍后重试。' }, 500)
  }
})
