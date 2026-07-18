import { supabase } from '../lib/supabase'
import type { Database, Json } from '../types/database'
import type { ProductionStage, TopicStatus, TrackFilter, TrackId } from '../types/domain'

type ContentRow = Database['public']['Tables']['content_items']['Row']
type TrackRow = Database['public']['Tables']['tracks']['Row']
type Priority = Database['public']['Enums']['priority_level']

export type ContentItemWithTrack = ContentRow & { tracks: Pick<TrackRow, 'code' | 'name'> }

export interface ContentListFilters {
  workspaceId: string
  trackFilter: TrackFilter
  topicStatus?: TopicStatus | 'all'
  priority?: Priority | 'all'
  contentType?: string | 'all'
  search?: string
}

export interface ContentDraft {
  title: string
  trackCode: TrackId
  insight?: string | null
  audience?: string | null
  contentType?: string | null
  keyword?: string | null
  objective?: string | null
  priority?: Priority
  topicStatus?: TopicStatus
  productionStage?: ProductionStage
  plannedFor?: string | null
}

export interface ContentUpdate extends Omit<Partial<ContentDraft>, 'trackCode'> {
  trackCode?: TrackId
}

export function toContentListQuery(workspaceId: string, trackFilter: TrackFilter) {
  return { workspaceId, trackCode: trackFilter === 'all' ? null : trackFilter, includeDeleted: false }
}

export function toSoftDeletePatch(at: Date) {
  return { deleted_at: at.toISOString() }
}

function requireClient() {
  if (!supabase) throw new Error('云端服务尚未配置，请稍后重试。')
  return supabase
}

function requiredTitle(value: string) {
  const title = value.trim()
  if (!title || title.length > 160) throw new Error('选题标题需为 1–160 个字符。')
  return title
}

function optionalText(value: string | null | undefined) {
  const text = value?.trim()
  return text ? text : null
}

async function resolveTrackId(workspaceId: string, trackCode: TrackId) {
  const client = requireClient()
  const { data, error } = await client
    .from('tracks')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('code', trackCode)
    .maybeSingle()
  if (error || !data) throw error ?? new Error('未找到当前内容线。')
  return data.id
}

async function writeActivity(
  workspaceId: string,
  actorId: string,
  entityType: string,
  entityId: string,
  action: Database['public']['Enums']['activity_action'],
  details: Json = {}
) {
  const client = requireClient()
  const { error } = await client.from('activity_logs').insert({
    workspace_id: workspaceId,
    actor_id: actorId,
    entity_type: entityType,
    entity_id: entityId,
    action,
    details
  })
  if (error) throw error
}

export async function listContentItems(filters: ContentListFilters): Promise<ContentItemWithTrack[]> {
  const client = requireClient()
  const parsed = toContentListQuery(filters.workspaceId, filters.trackFilter)
  let query = client
    .from('content_items')
    .select('*, tracks!inner(code, name)')
    .eq('workspace_id', parsed.workspaceId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })

  if (parsed.trackCode) query = query.eq('tracks.code', parsed.trackCode)
  if (filters.topicStatus && filters.topicStatus !== 'all') query = query.eq('topic_status', filters.topicStatus)
  if (filters.priority && filters.priority !== 'all') query = query.eq('priority', filters.priority)
  if (filters.contentType && filters.contentType !== 'all') query = query.eq('content_type', filters.contentType)
  if (filters.search?.trim()) {
    const needle = filters.search.trim().replaceAll(',', ' ')
    query = query.or(`title.ilike.%${needle}%,keyword.ilike.%${needle}%,audience.ilike.%${needle}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as unknown as ContentItemWithTrack[]
}

export async function getContentItem(workspaceId: string, contentId: string): Promise<ContentItemWithTrack | null> {
  const client = requireClient()
  const { data, error } = await client
    .from('content_items')
    .select('*, tracks!inner(code, name)')
    .eq('workspace_id', workspaceId)
    .eq('id', contentId)
    .maybeSingle()
  if (error) throw error
  return data as unknown as ContentItemWithTrack | null
}

export async function createContentItem(workspaceId: string, actorId: string, draft: ContentDraft): Promise<ContentRow> {
  const client = requireClient()
  const trackId = await resolveTrackId(workspaceId, draft.trackCode)
  const { data, error } = await client
    .from('content_items')
    .insert({
      workspace_id: workspaceId,
      track_id: trackId,
      title: requiredTitle(draft.title),
      insight: optionalText(draft.insight),
      audience: optionalText(draft.audience),
      content_type: optionalText(draft.contentType),
      keyword: optionalText(draft.keyword),
      objective: optionalText(draft.objective),
      priority: draft.priority ?? 'medium',
      topic_status: draft.topicStatus ?? 'inbox',
      production_stage: draft.productionStage ?? 'no_script',
      planned_for: draft.plannedFor ?? null,
      created_by: actorId
    })
    .select()
    .single()
  if (error || !data) throw error ?? new Error('未能创建选题。')
  await writeActivity(workspaceId, actorId, 'content_item', data.id, 'created', { title: data.title })
  return data
}

export async function updateContentItem(
  workspaceId: string,
  actorId: string,
  contentId: string,
  update: ContentUpdate
): Promise<ContentRow> {
  const client = requireClient()
  const patch: Database['public']['Tables']['content_items']['Update'] = {}
  if (update.title !== undefined) patch.title = requiredTitle(update.title)
  if (update.insight !== undefined) patch.insight = optionalText(update.insight)
  if (update.audience !== undefined) patch.audience = optionalText(update.audience)
  if (update.contentType !== undefined) patch.content_type = optionalText(update.contentType)
  if (update.keyword !== undefined) patch.keyword = optionalText(update.keyword)
  if (update.objective !== undefined) patch.objective = optionalText(update.objective)
  if (update.priority !== undefined) patch.priority = update.priority
  if (update.topicStatus !== undefined) patch.topic_status = update.topicStatus
  if (update.productionStage !== undefined) patch.production_stage = update.productionStage
  if (update.plannedFor !== undefined) patch.planned_for = update.plannedFor
  if (update.trackCode !== undefined) patch.track_id = await resolveTrackId(workspaceId, update.trackCode)
  if (Object.keys(patch).length === 0) throw new Error('没有需要更新的内容。')

  const { data, error } = await client
    .from('content_items')
    .update(patch)
    .eq('workspace_id', workspaceId)
    .eq('id', contentId)
    .is('deleted_at', null)
    .select()
    .single()
  if (error || !data) throw error ?? new Error('未能更新选题。')
  await writeActivity(workspaceId, actorId, 'content_item', contentId, 'updated', { fields: Object.keys(patch) })
  return data
}

export async function softDeleteContentItem(workspaceId: string, actorId: string, contentId: string, at = new Date()) {
  const client = requireClient()
  const { data, error } = await client
    .from('content_items')
    .update(toSoftDeletePatch(at))
    .eq('workspace_id', workspaceId)
    .eq('id', contentId)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle()
  if (error || !data) throw error ?? new Error('该选题不存在或已归档。')
  await writeActivity(workspaceId, actorId, 'content_item', contentId, 'soft_deleted')
}

export async function restoreContentItem(workspaceId: string, actorId: string, contentId: string) {
  const client = requireClient()
  const { data, error } = await client
    .from('content_items')
    .update({ deleted_at: null })
    .eq('workspace_id', workspaceId)
    .eq('id', contentId)
    .not('deleted_at', 'is', null)
    .select('id')
    .maybeSingle()
  if (error || !data) throw error ?? new Error('该选题未处于已归档状态。')
  await writeActivity(workspaceId, actorId, 'content_item', contentId, 'restored')
}
