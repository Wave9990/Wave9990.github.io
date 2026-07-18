import { supabase } from '../lib/supabase'
import type { Database } from '../types/database'
import { PRODUCTION_STAGES, type ProductionStage, type TrackFilter } from '../types/domain'

type ContentRow = Database['public']['Tables']['content_items']['Row']
type ActivityRow = Database['public']['Tables']['activity_logs']['Row']

export interface DashboardItem {
  id: string
  title?: string
  productionStage: ProductionStage
  priority: Database['public']['Enums']['priority_level']
  plannedFor: string | null
  updatedAt?: string
  deletedAt?: string | null
  trackCode?: string
  objective?: string | null
  audience?: string | null
  contentType?: string | null
}

export type StageSummary = Record<ProductionStage, number>

export interface DashboardActivity {
  id: string
  action: Database['public']['Enums']['activity_action']
  entityType: string
  createdAt: string
  details: Database['public']['Tables']['activity_logs']['Row']['details']
}

type ActivityScopeRow = Pick<ActivityRow, 'id' | 'entity_type' | 'entity_id'>

const priorityRank: Record<Database['public']['Enums']['priority_level'], number> = { high: 0, medium: 1, low: 2 }

export function buildStageSummary(rows: Array<Pick<DashboardItem, 'productionStage'>>): StageSummary {
  const summary = Object.fromEntries(PRODUCTION_STAGES.map((stage) => [stage, 0])) as StageSummary
  for (const row of rows) summary[row.productionStage] += 1
  return summary
}

export function sortTodayQueue<T extends DashboardItem>(rows: readonly T[], today: string): T[] {
  return rows
    .filter((row) => !row.deletedAt && row.plannedFor !== null && row.plannedFor <= today)
    .filter((row) => row.productionStage !== 'published' && row.productionStage !== 'reviewed')
    .slice()
    .sort((left, right) => {
      const priorityDelta = priorityRank[left.priority] - priorityRank[right.priority]
      if (priorityDelta !== 0) return priorityDelta
      const leftUpdated = left.updatedAt ?? ''
      const rightUpdated = right.updatedAt ?? ''
      if (leftUpdated !== rightUpdated) return leftUpdated.localeCompare(rightUpdated)
      return left.id.localeCompare(right.id)
    })
}

function requireClient() {
  if (!supabase) throw new Error('云端服务尚未配置，请稍后重试。')
  return supabase
}

export function filterDashboardActivityByContentIds<T extends ActivityScopeRow>(
  activities: readonly T[],
  contentIds: ReadonlySet<string>,
  scriptContentIds: ReadonlyMap<string, string>,
  shootTaskContentIds: ReadonlyMap<string, string>
) {
  return activities.filter((activity) => {
    const contentId = activity.entity_type === 'content_item'
      ? activity.entity_id
      : activity.entity_type === 'script'
        ? scriptContentIds.get(activity.entity_id)
        : activity.entity_type === 'shoot_task'
          ? shootTaskContentIds.get(activity.entity_id)
          : undefined
    return Boolean(contentId && contentIds.has(contentId))
  })
}

export async function listDashboardItems(workspaceId: string, trackFilter: TrackFilter): Promise<DashboardItem[]> {
  const client = requireClient()
  let query = client
    .from('content_items')
    .select('id, title, production_stage, priority, planned_for, updated_at, deleted_at, objective, audience, content_type, tracks!inner(code)')
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: true })
  if (trackFilter !== 'all') query = query.eq('tracks.code', trackFilter)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map((row) => {
    const value = row as unknown as Pick<ContentRow, 'id' | 'title' | 'production_stage' | 'priority' | 'planned_for' | 'updated_at' | 'deleted_at' | 'objective' | 'audience' | 'content_type'> & {
      tracks: { code: string }
    }
    return {
      id: value.id,
      title: value.title,
      productionStage: value.production_stage as ProductionStage,
      priority: value.priority,
      plannedFor: value.planned_for,
      updatedAt: value.updated_at,
      deletedAt: value.deleted_at,
      trackCode: value.tracks.code,
      objective: value.objective,
      audience: value.audience,
      contentType: value.content_type
    }
  })
}

export async function listDashboardActivity(
  workspaceId: string,
  trackFilter: TrackFilter = 'all',
  limit = 8
): Promise<DashboardActivity[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('activity_logs')
    .select('id, action, entity_type, entity_id, created_at, details')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(trackFilter === 'all' ? limit : Math.max(limit * 8, 48))
  if (error) throw error
  let scoped = (data ?? []) as Array<Pick<ActivityRow, 'id' | 'action' | 'entity_type' | 'entity_id' | 'created_at' | 'details'>>

  if (trackFilter !== 'all') {
    const { data: contentRows, error: contentError } = await client
      .from('content_items')
      .select('id, tracks!inner(code)')
      .eq('workspace_id', workspaceId)
      .eq('tracks.code', trackFilter)
    if (contentError) throw contentError
    const contentIds = new Set((contentRows ?? []).map((row) => (row as { id: string }).id))
    if (contentIds.size === 0) return []

    const [scriptsResponse, shootsResponse] = await Promise.all([
      client.from('scripts').select('id, content_id').eq('workspace_id', workspaceId).in('content_id', [...contentIds]),
      client.from('shoot_tasks').select('id, content_id').eq('workspace_id', workspaceId).in('content_id', [...contentIds])
    ])
    if (scriptsResponse.error) throw scriptsResponse.error
    if (shootsResponse.error) throw shootsResponse.error
    const scriptContentIds = new Map((scriptsResponse.data ?? []).map((row) => [row.id, row.content_id]))
    const shootTaskContentIds = new Map((shootsResponse.data ?? []).map((row) => [row.id, row.content_id]))
    scoped = filterDashboardActivityByContentIds(scoped, contentIds, scriptContentIds, shootTaskContentIds)
  }

  return scoped.slice(0, limit).map((item) => ({
    id: item.id,
    action: item.action,
    entityType: item.entity_type,
    createdAt: item.created_at,
    details: item.details
  }))
}
