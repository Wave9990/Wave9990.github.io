import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

function response(request: Request, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Access-Control-Allow-Origin': request.headers.get('origin') ?? '' }
  })
}

function normalizeEmail(value: unknown) {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 320) throw new Error('请输入有效的邮箱地址。')
  return email
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: { ...corsHeaders, 'Access-Control-Allow-Origin': request.headers.get('origin') ?? '' } })
  if (request.method !== 'POST') return response(request, { error: '仅支持 POST 请求。' }, 405)

  try {
    const authorization = request.headers.get('Authorization')
    if (!authorization) return response(request, { error: '请先登录后再邀请成员。' }, 401)

    const url = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const callerClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } })
    const admin = createClient(url, serviceRoleKey)
    const { data: { user }, error: userError } = await callerClient.auth.getUser()
    if (userError || !user) return response(request, { error: '登录状态已失效，请重新登录。' }, 401)

    const body = await request.json()
    const workspaceId = typeof body.workspaceId === 'string' ? body.workspaceId : ''
    const email = normalizeEmail(body.email)
    if (!workspaceId) return response(request, { error: '工作区信息缺失，请刷新后重试。' }, 400)
    if (email === user.email?.toLowerCase()) return response(request, { error: '不能邀请当前拥有者自己。' }, 400)

    const { data: ownerMembership } = await admin
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .maybeSingle()
    if (!ownerMembership) return response(request, { error: '只有工作区拥有者可以邀请成员。' }, 403)

    const { data: existingInvitation } = await admin
      .from('workspace_invitations')
      .select('id, revoked_at')
      .eq('workspace_id', workspaceId)
      .eq('email', email)
      .maybeSingle()
    if (existingInvitation && !existingInvitation.revoked_at) return response(request, { error: '这个邮箱已经在成员邀请列表中。' }, 409)

    let invitedUserId: string | null = null
    let needsAccountSetup = false
    const { data: users, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (usersError) return response(request, { error: usersError.message }, 500)

    const existingUser = users.users.find((candidate) => candidate.email?.toLowerCase() === email)
    if (existingUser) {
      invitedUserId = existingUser.id
    } else {
      const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${request.headers.get('origin') ?? ''}/set-password`
      })
      if (inviteError || !invited.user) return response(request, { error: '邀请邮件暂时未能发送，请稍后重试。' }, 400)
      invitedUserId = invited.user.id
      needsAccountSetup = true
    }

    const invitation = {
      workspace_id: workspaceId,
      email,
      role: 'readonly',
      invited_by: user.id,
      invited_user_id: invitedUserId,
      revoked_at: null,
      accepted_at: existingUser ? new Date().toISOString() : null
    }
    const { error: invitationError } = await admin
      .from('workspace_invitations')
      .upsert(invitation, { onConflict: 'workspace_id,email' })
    if (invitationError) return response(request, { error: '未能保存成员邀请，请稍后重试。' }, 400)

    const { error: membershipError } = await admin
      .from('workspace_members')
      .upsert({ workspace_id: workspaceId, user_id: invitedUserId, role: 'readonly' }, { onConflict: 'workspace_id,user_id' })
    if (membershipError) return response(request, { error: '未能授予只读权限，请稍后重试。' }, 400)

    await admin.from('activity_logs').insert({
      workspace_id: workspaceId,
      actor_id: user.id,
      entity_type: 'workspace_invitation',
      entity_id: invitedUserId,
      action: 'created',
      details: { email, role: 'readonly' }
    })

    return response(request, {
      email,
      needsAccountSetup,
      message: needsAccountSetup ? '邀请邮件已发送，对方完成设置密码后即可只读访问。' : '已授予只读权限；请通知对方使用该邮箱登录。'
    })
  } catch (error) {
    return response(request, { error: error instanceof Error ? error.message : '邀请失败，请稍后重试。' }, 500)
  }
})
