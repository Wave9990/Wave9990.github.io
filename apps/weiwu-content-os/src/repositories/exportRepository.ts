import { supabase } from '../lib/supabase'
import type { Database } from '../types/database'

export interface ExportContentRow {
  id: string
  title: string
  track: string
  topicStatus: string
}

export interface WorkspaceBackup {
  schemaVersion: 1
  exportedAt: string
  workspaceId: string
  content: unknown[]
  scripts: unknown[]
  shootTasks: unknown[]
}

export interface ArchivedContentItem {
  id: string
  title: string
  deletedAt: string
  trackName: string
}

export interface WorkspaceExportData {
  backup: WorkspaceBackup
  contentRows: ExportContentRow[]
}

function csvEscape(value: string) {
  const normalized = /^[=+\-@]/.test(value) ? `'${value}` : value
  return /[",\n]/.test(normalized) ? `"${normalized.replaceAll('"', '""')}"` : normalized
}

export function contentToCsv(rows: ExportContentRow[]) {
  const header = '\uFEFFcontent_id,title,track,topic_status\n'
  const body = rows.map((row) => [row.id, row.title, row.track, row.topicStatus].map(csvEscape).join(',')).join('\n')
  return `${header}${body}${rows.length ? '\n' : ''}`
}

export function createWorkspaceBackup(
  workspaceId: string,
  content: unknown[],
  scripts: unknown[],
  shootTasks: unknown[]
): WorkspaceBackup {
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    workspaceId,
    content,
    scripts,
    shootTasks
  }
}

export function parseWorkspaceBackup(raw: string): WorkspaceBackup {
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    throw new Error('备份文件格式无效：无法读取 JSON。')
  }

  if (
    !value ||
    typeof value !== 'object' ||
    (value as { schemaVersion?: unknown }).schemaVersion !== 1 ||
    typeof (value as { workspaceId?: unknown }).workspaceId !== 'string' ||
    typeof (value as { exportedAt?: unknown }).exportedAt !== 'string' ||
    !Array.isArray((value as { content?: unknown }).content) ||
    !Array.isArray((value as { scripts?: unknown }).scripts) ||
    !Array.isArray((value as { shootTasks?: unknown }).shootTasks)
  ) {
    throw new Error('备份文件格式无效：仅支持本工作台导出的 v1 JSON 备份。')
  }

  return value as WorkspaceBackup
}

export function workspaceExportFilename(workspaceId: string, extension: 'json' | 'csv') {
  const date = new Date().toISOString().slice(0, 10)
  return `weiwu-content-os-${workspaceId.slice(0, 8)}-${date}.${extension}`
}

export function downloadTextFile(filename: string, text: string, mimeType: string) {
  const blob = new Blob([text], { type: `${mimeType};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function requireClient() {
  if (!supabase) throw new Error('云端服务尚未配置，请稍后重试。')
  return supabase
}

export async function getWorkspaceExportData(workspaceId: string): Promise<WorkspaceExportData> {
  const client = requireClient()
  const [contentResult, scriptResult, shootResult] = await Promise.all([
    client
      .from('content_items')
      .select('*, tracks!inner(code)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true }),
    client
      .from('scripts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('content_id', { ascending: true })
      .order('version', { ascending: true }),
    client
      .from('shoot_tasks')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true })
  ])

  if (contentResult.error) throw contentResult.error
  if (scriptResult.error) throw scriptResult.error
  if (shootResult.error) throw shootResult.error

  const content = contentResult.data ?? []
  return {
    backup: createWorkspaceBackup(workspaceId, content, scriptResult.data ?? [], shootResult.data ?? []),
    contentRows: content.map((row) => ({
      id: row.id,
      title: row.title,
      track: (row.tracks as unknown as { code: string }).code,
      topicStatus: row.topic_status
    }))
  }
}

export async function listArchivedContentItems(workspaceId: string): Promise<ArchivedContentItem[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('content_items')
    .select('id, title, deleted_at, tracks!inner(name)')
    .eq('workspace_id', workspaceId)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })

  if (error) throw error
  return (data ?? []).flatMap((row) => {
    if (!row.deleted_at) return []
    return [{
      id: row.id,
      title: row.title,
      deletedAt: row.deleted_at,
      trackName: (row.tracks as unknown as { name: string }).name
    }]
  })
}

export type WorkspaceRole = Database['public']['Enums']['workspace_role']
