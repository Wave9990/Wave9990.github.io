import { supabase } from '../lib/supabase'
import type { Database, Json } from '../types/database'
import type { ProductionStage, TrackFilter } from '../types/domain'

type ScriptRow = Database['public']['Tables']['scripts']['Row']
type ContentRow = Database['public']['Tables']['content_items']['Row']

export interface ShotListItem { shot: string; note?: string }

export interface ScriptDraft {
  title: string
  hook: string
  body: string
  shotList: ShotListItem[]
  caption?: string | null
  hashtags?: string[]
  estimatedSeconds?: number | null
  status: 'draft' | 'ready'
}

export type ScriptWithContent = ScriptRow & { content_items: Pick<ContentRow, 'id' | 'title' | 'production_stage'> }

export function getNextScriptVersion(existing: Array<{ version: number }>) {
  return existing.reduce((max, item) => Math.max(max, item.version), 0) + 1
}

export function shouldSetScriptingStage(stage: ProductionStage) {
  return stage === 'no_script'
}

export function shouldSetReadyToShootStage(stage: ProductionStage, scriptStatus: ScriptDraft['status']) {
  return stage === 'scripting' && scriptStatus === 'ready'
}

export function toReadyToShootStageAudit() {
  return { from: 'scripting', to: 'ready_to_shoot', trigger: 'script_marked_ready' }
}

export function toContentStageActivityTarget(contentId: string) {
  return { entityType: 'content_item', entityId: contentId }
}

export function toScriptListQuery(workspaceId: string, trackFilter: TrackFilter) {
  return { workspaceId, trackCode: trackFilter === 'all' ? null : trackFilter }
}

function requireClient() {
  if (!supabase) throw new Error('云端服务尚未配置，请稍后重试。')
  return supabase
}

function requiredText(value: string, label: string, maximum: number) {
  const text = value.trim()
  if (!text || text.length > maximum) throw new Error(`${label}需为 1–${maximum} 个字符。`)
  return text
}

function normalizeHashtags(hashtags: string[] = []) {
  return [...new Set(hashtags.map((item) => item.trim().replace(/^#/, '')).filter(Boolean))]
}

function normalizeShots(shots: ShotListItem[]): Json {
  return shots
    .map((item) => ({ shot: item.shot.trim(), ...(item.note?.trim() ? { note: item.note.trim() } : {}) }))
    .filter((item) => item.shot)
}

function toScriptInsert(workspaceId: string, contentId: string, actorId: string, version: number, draft: ScriptDraft) {
  const estimatedSeconds = draft.estimatedSeconds ?? null
  if (estimatedSeconds !== null && (!Number.isInteger(estimatedSeconds) || estimatedSeconds < 1)) {
    throw new Error('预计时长需为正整数。')
  }
  return {
    workspace_id: workspaceId,
    content_id: contentId,
    created_by: actorId,
    version,
    title: requiredText(draft.title, '脚本标题', 160),
    hook: requiredText(draft.hook, '开头钩子', 800),
    body: requiredText(draft.body, '脚本正文', 20000),
    shot_list: normalizeShots(draft.shotList),
    caption: draft.caption?.trim() || null,
    hashtags: normalizeHashtags(draft.hashtags),
    estimated_seconds: estimatedSeconds,
    status: draft.status
  }
}

async function writeActivity(
  workspaceId: string,
  actorId: string,
  entityType: string,
  entityId: string,
  action: Database['public']['Enums']['activity_action'],
  details: Json
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

async function findContent(workspaceId: string, contentId: string): Promise<ContentRow> {
  const client = requireClient()
  const { data, error } = await client
    .from('content_items')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('id', contentId)
    .is('deleted_at', null)
    .maybeSingle()
  if (error || !data) throw error ?? new Error('关联选题不存在或已归档。')
  return data
}

async function advanceParentToReadyToShoot(
  workspaceId: string,
  actorId: string,
  contentId: string,
  currentStage: ProductionStage,
  scriptStatus: ScriptDraft['status']
) {
  if (!shouldSetReadyToShootStage(currentStage, scriptStatus)) return false
  const client = requireClient()
  const { data, error } = await client
    .from('content_items')
    .update({ production_stage: 'ready_to_shoot' })
    .eq('workspace_id', workspaceId)
    .eq('id', contentId)
    .is('deleted_at', null)
    .eq('production_stage', 'scripting')
    .select('id')
    .maybeSingle()
  if (error) throw error
  if (!data) return false
  const target = toContentStageActivityTarget(contentId)
  await writeActivity(workspaceId, actorId, target.entityType, target.entityId, 'stage_changed', toReadyToShootStageAudit())
  return true
}

export async function listScripts(workspaceId: string, trackFilter: TrackFilter = 'all'): Promise<ScriptWithContent[]> {
  const client = requireClient()
  const parsed = toScriptListQuery(workspaceId, trackFilter)
  let query = client
    .from('scripts')
    .select('*, content_items!inner(id, title, production_stage, tracks!inner(code))')
    .eq('workspace_id', parsed.workspaceId)
    .order('updated_at', { ascending: false })
  if (parsed.trackCode) query = query.eq('content_items.tracks.code', parsed.trackCode)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as unknown as ScriptWithContent[]
}

export async function getScript(workspaceId: string, scriptId: string): Promise<ScriptWithContent | null> {
  const client = requireClient()
  const { data, error } = await client
    .from('scripts')
    .select('*, content_items!inner(id, title, production_stage)')
    .eq('workspace_id', workspaceId)
    .eq('id', scriptId)
    .maybeSingle()
  if (error) throw error
  return data as unknown as ScriptWithContent | null
}

export async function createScriptRevision(workspaceId: string, actorId: string, contentId: string, draft: ScriptDraft): Promise<ScriptRow> {
  const client = requireClient()
  const content = await findContent(workspaceId, contentId)
  const { data: existing, error: existingError } = await client
    .from('scripts')
    .select('version')
    .eq('workspace_id', workspaceId)
    .eq('content_id', contentId)
  if (existingError) throw existingError

  const version = getNextScriptVersion(existing ?? [])
  const { data, error } = await client
    .from('scripts')
    .insert(toScriptInsert(workspaceId, contentId, actorId, version, draft))
    .select()
    .single()
  if (error || !data) throw error ?? new Error('未能创建脚本版本。')

  let stageAfterCreate = content.production_stage as ProductionStage
  if (shouldSetScriptingStage(stageAfterCreate)) {
    const { data: stageChanged, error: stageError } = await client
      .from('content_items')
      .update({ production_stage: 'scripting' })
      .eq('workspace_id', workspaceId)
      .eq('id', contentId)
      .is('deleted_at', null)
      .eq('production_stage', 'no_script')
      .select('id')
      .maybeSingle()
    if (stageError) throw stageError
    if (stageChanged) {
      stageAfterCreate = 'scripting'
      const target = toContentStageActivityTarget(contentId)
      await writeActivity(workspaceId, actorId, target.entityType, target.entityId, 'stage_changed', {
        from: 'no_script', to: 'scripting', trigger: 'first_script_revision'
      })
    }
  }
  await writeActivity(workspaceId, actorId, 'script', data.id, 'created', { content_id: contentId, version })
  await advanceParentToReadyToShoot(
    workspaceId,
    actorId,
    contentId,
    stageAfterCreate,
    draft.status
  )
  return data
}

export async function updateDraftScript(workspaceId: string, actorId: string, scriptId: string, draft: ScriptDraft): Promise<ScriptRow> {
  const client = requireClient()
  const { data: existing, error: existingError } = await client
    .from('scripts')
    .select('id, content_id, version, status')
    .eq('workspace_id', workspaceId)
    .eq('id', scriptId)
    .maybeSingle()
  if (existingError || !existing) throw existingError ?? new Error('脚本不存在。')
  if (existing.status !== 'draft') throw new Error('已就绪脚本不可覆盖，请创建新版本。')

  const patch = toScriptInsert(workspaceId, existing.content_id, actorId, existing.version, draft)
  const { workspace_id: _workspaceId, content_id: _contentId, created_by: _createdBy, version: _version, ...editable } = patch
  const { data, error } = await client
    .from('scripts')
    .update(editable)
    .eq('workspace_id', workspaceId)
    .eq('id', scriptId)
    .eq('status', 'draft')
    .select()
    .single()
  if (error || !data) throw error ?? new Error('未能更新草稿脚本。')
  await writeActivity(workspaceId, actorId, 'script', scriptId, 'updated', { version: existing.version })
  const content = await findContent(workspaceId, existing.content_id)
  await advanceParentToReadyToShoot(
    workspaceId,
    actorId,
    existing.content_id,
    content.production_stage as ProductionStage,
    draft.status
  )
  return data
}
