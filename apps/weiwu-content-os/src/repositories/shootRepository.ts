import { supabase } from '../lib/supabase'
import type { Database, Json } from '../types/database'
import type { ProductionStage, TrackFilter } from '../types/domain'

type ShootTaskRow = Database['public']['Tables']['shoot_tasks']['Row']
type ContentRow = Database['public']['Tables']['content_items']['Row']
type ScriptRow = Database['public']['Tables']['scripts']['Row']

export type ShootTaskStatus = 'planned' | 'completed' | 'cancelled'
export const SHOOT_SELECTABLE_STAGES = ['ready_to_shoot', 'shooting', 'shot_waiting_edit'] as const

export interface RequiredShot {
  shot: string
  note?: string
  done?: boolean
}

export interface ShootTaskDraft {
  contentId: string
  scheduledFor?: string | null
  location?: string | null
  people?: string[]
  requiredShots?: RequiredShot[]
  notes?: string | null
  status?: Exclude<ShootTaskStatus, 'completed'>
}

export interface ShootTaskWithContent extends ShootTaskRow {
  content_items: Pick<ContentRow, 'id' | 'title' | 'production_stage' | 'planned_for'> & {
    tracks?: Pick<Database['public']['Tables']['tracks']['Row'], 'code' | 'name'>
  }
}

export interface ShootContentOption {
  id: string
  title: string
  productionStage: ProductionStage
  plannedFor: string | null
  latestShotList: RequiredShot[]
}

export function completeShootTask(completedAt: string) {
  return { status: 'completed' as const, completed_at: completedAt }
}

export function buildShootCompletionPatch(requiredShots: RequiredShot[], completedAt: string) {
  return { required_shots: normalizeRequiredShots(requiredShots), ...completeShootTask(completedAt) }
}

export function isShootCompletionAdvanceSource(stage: ProductionStage) {
  return stage === 'scripting' || stage === 'ready_to_shoot' || stage === 'shooting'
}

export function toShootStageAdvanceAudit(from: ProductionStage) {
  return { from, to: 'shot_waiting_edit', trigger: 'all_shoot_tasks_complete' }
}

export function shouldStartShootingForTask(stage: ProductionStage, taskStatus: ShootTaskStatus) {
  return stage === 'ready_to_shoot' && taskStatus === 'planned'
}

export function toShootingStageStartAudit() {
  return { from: 'ready_to_shoot', to: 'shooting', trigger: 'first_active_shoot_task' }
}

export function shouldAdvanceAfterCompletion(statuses: string[]) {
  return statuses.length > 0 && statuses.every((status) => status === 'completed' || status === 'cancelled')
}

export function isShootSelectableStage(stage: ProductionStage) {
  return (SHOOT_SELECTABLE_STAGES as readonly ProductionStage[]).includes(stage)
}

export function assertShootTaskCreationStage(stage: ProductionStage) {
  if (!isShootSelectableStage(stage)) {
    throw new Error('请先将脚本标记为就绪，再创建拍摄任务。')
  }
}

function requireClient() {
  if (!supabase) throw new Error('云端服务尚未配置，请稍后重试。')
  return supabase
}

function optionalText(value: string | null | undefined) {
  const text = value?.trim()
  return text ? text : null
}

function normalizedPeople(people: string[] = []) {
  return [...new Set(people.map((person) => person.trim()).filter(Boolean))]
}

export function normalizeRequiredShots(requiredShots: RequiredShot[] = []): Json {
  return requiredShots
    .map((item) => ({
      shot: item.shot.trim(),
      ...(item.note?.trim() ? { note: item.note.trim() } : {}),
      ...(item.done ? { done: true } : {})
    }))
    .filter((item) => item.shot)
}

export function parseRequiredShots(value: Json | null | undefined): RequiredShot[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (typeof item === 'string') return item.trim() ? [{ shot: item.trim() }] : []
    if (!item || typeof item !== 'object' || Array.isArray(item) || !('shot' in item) || typeof item.shot !== 'string') return []
    const note = 'note' in item && typeof item.note === 'string' && item.note.trim() ? item.note.trim() : undefined
    return [{ shot: item.shot.trim(), ...(note ? { note } : {}), ...(item.done === true ? { done: true } : {}) }]
  }).filter((item) => item.shot)
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

async function findActiveContent(workspaceId: string, contentId: string) {
  const client = requireClient()
  const { data, error } = await client
    .from('content_items')
    .select('id, production_stage')
    .eq('workspace_id', workspaceId)
    .eq('id', contentId)
    .is('deleted_at', null)
    .maybeSingle()
  if (error || !data) throw error ?? new Error('关联选题不存在或已归档。')
  return data as Pick<ContentRow, 'id' | 'production_stage'>
}

async function startParentShootingIfNeeded(
  workspaceId: string,
  actorId: string,
  contentId: string,
  currentStage: ProductionStage,
  taskStatus: ShootTaskStatus
) {
  if (!shouldStartShootingForTask(currentStage, taskStatus)) return false
  const client = requireClient()
  const { data, error } = await client
    .from('content_items')
    .update({ production_stage: 'shooting' })
    .eq('workspace_id', workspaceId)
    .eq('id', contentId)
    .is('deleted_at', null)
    .eq('production_stage', 'ready_to_shoot')
    .select('id')
    .maybeSingle()
  if (error) throw error
  if (!data) return false
  await writeActivity(workspaceId, actorId, 'content_item', contentId, 'stage_changed', toShootingStageStartAudit())
  return true
}

export async function listShootTasks(workspaceId: string, trackFilter: TrackFilter = 'all'): Promise<ShootTaskWithContent[]> {
  const client = requireClient()
  let query = client
    .from('shoot_tasks')
    .select('*, content_items!inner(id, title, production_stage, planned_for, deleted_at, tracks!inner(code, name))')
    .eq('workspace_id', workspaceId)
    .is('content_items.deleted_at', null)
    .order('scheduled_for', { ascending: true, nullsFirst: false })
    .order('updated_at', { ascending: false })
  if (trackFilter !== 'all') query = query.eq('content_items.tracks.code', trackFilter)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as unknown as ShootTaskWithContent[]
}

export async function listShootContentOptions(workspaceId: string, trackFilter: TrackFilter): Promise<ShootContentOption[]> {
  const client = requireClient()
  let contentQuery = client
    .from('content_items')
    .select('id, title, production_stage, planned_for, tracks!inner(code)')
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .in('production_stage', [...SHOOT_SELECTABLE_STAGES])
    .order('updated_at', { ascending: false })
  if (trackFilter !== 'all') contentQuery = contentQuery.eq('tracks.code', trackFilter)
  const { data: contentRows, error: contentError } = await contentQuery
  if (contentError) throw contentError
  const content = (contentRows ?? []) as unknown as Array<Pick<ContentRow, 'id' | 'title' | 'production_stage' | 'planned_for'>>
  if (content.length === 0) return []

  const { data: scriptRows, error: scriptError } = await client
    .from('scripts')
    .select('content_id, shot_list, version, updated_at')
    .eq('workspace_id', workspaceId)
    .in('content_id', content.map((item) => item.id))
    .order('version', { ascending: false })
  if (scriptError) throw scriptError
  const latestByContent = new Map<string, ScriptRow>()
  for (const row of (scriptRows ?? []) as Pick<ScriptRow, 'content_id' | 'shot_list' | 'version' | 'updated_at'>[]) {
    if (!latestByContent.has(row.content_id)) latestByContent.set(row.content_id, row as ScriptRow)
  }

  return content.map((item) => ({
    id: item.id,
    title: item.title,
    productionStage: item.production_stage as ProductionStage,
    plannedFor: item.planned_for,
    latestShotList: parseRequiredShots(latestByContent.get(item.id)?.shot_list)
  }))
}

export async function createShootTask(workspaceId: string, actorId: string, draft: ShootTaskDraft): Promise<ShootTaskRow> {
  const client = requireClient()
  const content = await findActiveContent(workspaceId, draft.contentId)
  assertShootTaskCreationStage(content.production_stage as ProductionStage)
  const { data, error } = await client
    .from('shoot_tasks')
    .insert({
      workspace_id: workspaceId,
      content_id: draft.contentId,
      scheduled_for: draft.scheduledFor ?? null,
      location: optionalText(draft.location),
      people: normalizedPeople(draft.people),
      required_shots: normalizeRequiredShots(draft.requiredShots),
      notes: optionalText(draft.notes),
      status: draft.status ?? 'planned',
      created_by: actorId
    })
    .select()
    .single()
  if (error || !data) throw error ?? new Error('未能创建拍摄任务。')
  await writeActivity(workspaceId, actorId, 'shoot_task', data.id, 'created', { content_id: draft.contentId })
  await startParentShootingIfNeeded(
    workspaceId,
    actorId,
    draft.contentId,
    content.production_stage as ProductionStage,
    data.status as ShootTaskStatus
  )
  return data
}

export async function updateShootTask(
  workspaceId: string,
  actorId: string,
  taskId: string,
  draft: Partial<ShootTaskDraft>
): Promise<ShootTaskRow> {
  const client = requireClient()
  const patch: Database['public']['Tables']['shoot_tasks']['Update'] = {}
  if (draft.scheduledFor !== undefined) patch.scheduled_for = draft.scheduledFor
  if (draft.location !== undefined) patch.location = optionalText(draft.location)
  if (draft.people !== undefined) patch.people = normalizedPeople(draft.people)
  if (draft.requiredShots !== undefined) patch.required_shots = normalizeRequiredShots(draft.requiredShots)
  if (draft.notes !== undefined) patch.notes = optionalText(draft.notes)
  if (draft.status !== undefined) patch.status = draft.status
  if (Object.keys(patch).length === 0) throw new Error('没有需要更新的拍摄信息。')
  const { data, error } = await client
    .from('shoot_tasks')
    .update(patch)
    .eq('workspace_id', workspaceId)
    .eq('id', taskId)
    .neq('status', 'completed')
    .select()
    .single()
  if (error || !data) throw error ?? new Error('拍摄任务不存在或已完成。')
  await writeActivity(workspaceId, actorId, 'shoot_task', taskId, 'updated', { fields: Object.keys(patch) })
  return data
}

export async function markShootTaskCompleted(
  workspaceId: string,
  actorId: string,
  taskId: string,
  requiredShots?: RequiredShot[],
  completedAt = new Date().toISOString()
): Promise<{ task: ShootTaskRow; advanced: boolean }> {
  const client = requireClient()
  const { data: existing, error: existingError } = await client
    .from('shoot_tasks')
    .select('id, content_id, status')
    .eq('workspace_id', workspaceId)
    .eq('id', taskId)
    .maybeSingle()
  if (existingError || !existing) throw existingError ?? new Error('拍摄任务不存在。')
  if (existing.status !== 'planned') throw new Error(existing.status === 'completed' ? '该拍摄任务已经完成。' : '已取消任务不能标记为完成。')

  const { data: task, error: completionError } = await client
    .from('shoot_tasks')
    .update(requiredShots === undefined ? completeShootTask(completedAt) : buildShootCompletionPatch(requiredShots, completedAt))
    .eq('workspace_id', workspaceId)
    .eq('id', taskId)
    .eq('status', 'planned')
    .select()
    .single()
  if (completionError || !task) throw completionError ?? new Error('未能完成拍摄任务。')
  await writeActivity(workspaceId, actorId, 'shoot_task', taskId, 'updated', {
    content_id: existing.content_id,
    status: 'completed',
    completed_at: completedAt,
    ...(requiredShots === undefined ? {} : { persisted_shot_count: parseRequiredShots(task.required_shots).length })
  })

  const { data: siblingTasks, error: siblingError } = await client
    .from('shoot_tasks')
    .select('status')
    .eq('workspace_id', workspaceId)
    .eq('content_id', existing.content_id)
  if (siblingError) throw siblingError
  const shouldAdvance = shouldAdvanceAfterCompletion((siblingTasks ?? []).map((item) => item.status))
  if (!shouldAdvance) return { task, advanced: false }

  const parent = await findActiveContent(workspaceId, existing.content_id)
  if (!isShootCompletionAdvanceSource(parent.production_stage as ProductionStage)) return { task, advanced: false }

  const { data: content, error: contentError } = await client
    .from('content_items')
    .update({ production_stage: 'shot_waiting_edit' })
    .eq('workspace_id', workspaceId)
    .eq('id', existing.content_id)
    .is('deleted_at', null)
    .eq('production_stage', parent.production_stage)
    .select('id')
    .maybeSingle()
  if (contentError) throw contentError
  if (content) {
    await writeActivity(workspaceId, actorId, 'content_item', existing.content_id, 'stage_changed', toShootStageAdvanceAudit(parent.production_stage as ProductionStage))
  }
  return { task, advanced: Boolean(content) }
}
