import { supabase } from '../lib/supabase'
import type { Database, Json } from '../types/database'

export type AssetRow = Database['public']['Tables']['assets']['Row']

export interface ExternalAssetLinkDraft {
  label: string
  externalUrl: string
}

export const deletedAssetLinkAction = 'deleted' as const

function requireClient() {
  if (!supabase) throw new Error('云端服务尚未配置，请稍后重试。')
  return supabase
}

function requiredLabel(value: string) {
  const label = value.trim()
  if (!label || label.length > 120) throw new Error('素材标签需为 1–120 个字符。')
  return label
}

export function normalizeExternalAssetLink(labelValue: string, externalUrlValue: string): ExternalAssetLinkDraft {
  const label = requiredLabel(labelValue)
  const source = externalUrlValue.trim()
  if (!source || source.length > 2048) throw new Error('请填写有效的 HTTPS 素材链接。')
  let parsed: URL
  try {
    parsed = new URL(source)
  } catch {
    throw new Error('请填写有效的 HTTPS 素材链接。')
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
    throw new Error('素材链接必须是有效的 HTTPS 地址，且不能包含账号或密码。')
  }
  return { label, externalUrl: parsed.toString() }
}

export function toAssetLinkActivityDetails(contentId: string, label: string): Json {
  return { content_id: contentId, label, source: 'external_https_link' }
}

async function assertActiveContent(workspaceId: string, contentId: string) {
  const client = requireClient()
  const { data, error } = await client
    .from('content_items')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('id', contentId)
    .is('deleted_at', null)
    .maybeSingle()
  if (error || !data) throw error ?? new Error('关联内容不存在或已归档。')
}

async function writeAssetActivity(
  workspaceId: string,
  actorId: string,
  assetId: string,
  action: Database['public']['Enums']['activity_action'],
  details: Json
) {
  const client = requireClient()
  const { error } = await client.from('activity_logs').insert({
    workspace_id: workspaceId,
    actor_id: actorId,
    entity_type: 'asset',
    entity_id: assetId,
    action,
    details
  })
  if (error) throw error
}

export async function listExternalAssetLinks(workspaceId: string, contentId: string): Promise<AssetRow[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('assets')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('content_id', contentId)
    .not('external_url', 'is', null)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createExternalAssetLink(
  workspaceId: string,
  actorId: string,
  contentId: string,
  draft: ExternalAssetLinkDraft
): Promise<AssetRow> {
  const client = requireClient()
  const normalized = normalizeExternalAssetLink(draft.label, draft.externalUrl)
  await assertActiveContent(workspaceId, contentId)
  const { data, error } = await client
    .from('assets')
    .insert({
      workspace_id: workspaceId,
      content_id: contentId,
      storage_path: null,
      external_url: normalized.externalUrl,
      label: normalized.label,
      created_by: actorId
    })
    .select()
    .single()
  if (error || !data) throw error ?? new Error('未能保存素材链接。')
  await writeAssetActivity(workspaceId, actorId, data.id, 'created', toAssetLinkActivityDetails(contentId, normalized.label))
  return data
}

export async function deleteExternalAssetLink(workspaceId: string, actorId: string, contentId: string, assetId: string): Promise<void> {
  const client = requireClient()
  const { data, error } = await client
    .from('assets')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('content_id', contentId)
    .eq('id', assetId)
    .not('external_url', 'is', null)
    .select('id, label')
    .maybeSingle()
  if (error || !data) throw error ?? new Error('素材链接不存在或无权删除。')
  await writeAssetActivity(workspaceId, actorId, assetId, deletedAssetLinkAction, toAssetLinkActivityDetails(contentId, data.label ?? '未命名素材'))
}
