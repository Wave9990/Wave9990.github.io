import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, MapPin, Pencil, Plus, Users } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { useAuth } from '../../providers/AuthProvider'
import { useTrack } from '../../providers/TrackProvider'
import {
  createShootTask,
  listShootContentOptions,
  listShootTasks,
  markShootTaskCompleted,
  parseRequiredShots,
  updateShootTask,
  type ShootContentOption,
  type ShootTaskDraft,
  type ShootTaskWithContent
} from '../../repositories/shootRepository'
import { ShootEditor } from './ShootEditor'

type TaskView = 'today' | 'week' | 'all'

function dateOnly(value: Date) { return value.toISOString().slice(0, 10) }

function taskMatchesView(task: ShootTaskWithContent, view: TaskView, today: string) {
  if (view === 'all') return true
  if (!task.scheduled_for) return false
  const taskDate = task.scheduled_for.slice(0, 10)
  if (view === 'today') return taskDate === today
  const start = new Date(`${today}T00:00:00`)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return taskDate >= today && taskDate <= dateOnly(end)
}

function taskDateLabel(value: string | null) {
  if (!value) return '时间待定'
  return new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

export function ShootPage() {
  const { workspace, user, membership } = useAuth()
  const { trackFilter } = useTrack()
  const [view, setView] = useState<TaskView>('today')
  const [tasks, setTasks] = useState<ShootTaskWithContent[]>([])
  const [options, setOptions] = useState<ShootContentOption[]>([])
  const [selectedTask, setSelectedTask] = useState<ShootTaskWithContent | undefined>()
  const [editorOpen, setEditorOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const today = dateOnly(new Date())
  const isOwner = membership?.role === 'owner'

  const reload = useCallback(async () => {
    if (!workspace) return
    const [nextTasks, nextOptions] = await Promise.all([
      listShootTasks(workspace.id, trackFilter),
      listShootContentOptions(workspace.id, trackFilter)
    ])
    setTasks(nextTasks); setOptions(nextOptions)
  }, [trackFilter, workspace])

  useEffect(() => {
    let cancelled = false
    if (!workspace) return
    setIsLoading(true); setError(null)
    void reload().catch(() => { if (!cancelled) setError('暂时无法读取拍摄计划，请检查网络后重试。') }).finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [reload, workspace])

  const visibleTasks = useMemo(() => tasks.filter((task) => taskMatchesView(task, view, today)), [tasks, today, view])

  async function saveTask(draft: ShootTaskDraft) {
    if (!workspace || !user || !isOwner) return
    setIsSaving(true); setError(null)
    try {
      if (selectedTask) await updateShootTask(workspace.id, user.id, selectedTask.id, draft)
      else await createShootTask(workspace.id, user.id, draft)
      await reload(); setEditorOpen(false); setSelectedTask(undefined)
    } catch (reason) { setError(reason instanceof Error ? reason.message : '保存拍摄任务失败，请稍后重试。') } finally { setIsSaving(false) }
  }

  async function completeTask(requiredShots: Parameters<typeof markShootTaskCompleted>[3]) {
    if (!workspace || !user || !selectedTask || !isOwner) return
    setIsSaving(true); setError(null)
    try {
      await markShootTaskCompleted(workspace.id, user.id, selectedTask.id, requiredShots)
      await reload(); setEditorOpen(false); setSelectedTask(undefined)
    } catch (reason) { setError(reason instanceof Error ? reason.message : '完成拍摄失败，请稍后重试。') } finally { setIsSaving(false) }
  }

  if (editorOpen) {
    return <section className="content-page"><ShootEditor options={options} task={selectedTask} isBusy={isSaving} readOnly={!isOwner} workspaceId={workspace?.id} actorId={user?.id} onCancel={() => { setEditorOpen(false); setSelectedTask(undefined) }} onSave={saveTask} onComplete={completeTask} />{error && <p className="form-error" role="alert">{error}</p>}</section>
  }

  return (
    <section className="content-page shooting-page">
      <header className="page-heading"><div><p className="eyebrow">SHOOTING FLOW</p><h1>拍摄流程</h1><p>把现场任务、必拍镜头和补拍记录放在同一条内容链路里；完成后会自动等待剪辑，不会替你虚构发布数据。</p></div>{isOwner && <Button type="button" onClick={() => { setSelectedTask(undefined); setEditorOpen(true) }}><Plus size={16} />新建拍摄任务</Button>}</header>
      <div className="shoot-view-tabs" role="tablist" aria-label="拍摄计划范围">{([{ value: 'today', label: '今日' }, { value: 'week', label: '本周' }, { value: 'all', label: '全部' }] as const).map((item) => <button key={item.value} type="button" role="tab" aria-selected={view === item.value} className={view === item.value ? 'is-active' : ''} onClick={() => setView(item.value)}>{item.label}</button>)}</div>
      {isLoading && <p className="data-state">正在同步拍摄计划…</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {!isLoading && !error && visibleTasks.length === 0 && <EmptyState title={view === 'today' ? '今天还没有拍摄任务' : '还没有匹配的拍摄任务'} description={isOwner ? '从脚本带入镜头清单后，现场只需要按这张清单逐条推进。' : '当前为只读权限，暂时没有可查看的拍摄任务。'} action={isOwner ? <Button type="button" onClick={() => { setSelectedTask(undefined); setEditorOpen(true) }}>安排一次拍摄</Button> : undefined} />}
      {!isLoading && !error && visibleTasks.length > 0 && <div className="shoot-task-list" role="list">{visibleTasks.map((task) => {
        const shots = parseRequiredShots(task.required_shots)
        const completedShots = shots.filter((shot) => shot.done).length
        return <article className={`shoot-task-card shoot-task-card--${task.status}`} role="listitem" key={task.id}>
          <div className="shoot-task-card-head"><div><span className={`shoot-task-status shoot-task-status--${task.status}`}>{task.status === 'completed' ? '已完成' : task.status === 'cancelled' ? '已取消' : '待拍摄'}</span><h2>{task.content_items.title}</h2></div><Button type="button" variant="ghost" onClick={() => { setSelectedTask(task); setEditorOpen(true) }}><Pencil size={15} />{!isOwner || task.status === 'completed' ? '查看记录' : '打开清单'}</Button></div>
          <div className="shoot-task-facts"><span><CalendarDays size={15} />{taskDateLabel(task.scheduled_for)}</span>{task.location && <span><MapPin size={15} />{task.location}</span>}{task.people.length > 0 && <span><Users size={15} />{task.people.join('、')}</span>}</div>
          <div className="shoot-task-progress"><span>镜头清单</span><strong>{shots.length ? `${completedShots}/${shots.length} 已勾选` : '待补充镜头'}</strong><div aria-hidden="true"><i style={{ width: shots.length ? `${(completedShots / shots.length) * 100}%` : '0%' }} /></div></div>
          {task.notes && <p className="shoot-task-note">{task.notes}</p>}
          {isOwner && task.status === 'planned' && <Button type="button" variant="secondary" className="shoot-complete-button" onClick={() => { setSelectedTask(task); setEditorOpen(true) }}><CheckCircle2 size={16} />完成拍摄并进入剪辑</Button>}
        </article>
      })}</div>}
    </section>
  )
}
