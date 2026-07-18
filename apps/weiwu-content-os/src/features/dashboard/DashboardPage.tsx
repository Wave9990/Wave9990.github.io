import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, ClipboardPenLine, FilePenLine, Sparkles, Video } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { EmptyState } from '../../components/ui/EmptyState'
import { useAuth } from '../../providers/AuthProvider'
import { useTrack } from '../../providers/TrackProvider'
import { buildStageSummary, listDashboardActivity, listDashboardItems, sortTodayQueue, type DashboardActivity, type DashboardItem } from '../../repositories/dashboardRepository'
import { StageSummary } from './StageSummary'
import { TodayQueue } from './TodayQueue'

function today() { return new Date().toISOString().slice(0, 10) }

function activityText(activity: DashboardActivity) {
  const entity = activity.entityType === 'shoot_task' ? '拍摄任务' : activity.entityType === 'script' ? '脚本版本' : '内容记录'
  const action = activity.action === 'created' ? '已创建' : activity.action === 'stage_changed' ? '已推进流程' : activity.action === 'soft_deleted' ? '已归档' : activity.action === 'restored' ? '已恢复' : activity.action === 'deleted' ? '已永久移除' : '已更新'
  return `${entity}${action}`
}

function activityTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

export function DashboardPage() {
  const { workspace, membership } = useAuth()
  const { trackFilter } = useTrack()
  const location = useLocation()
  const [items, setItems] = useState<DashboardItem[]>([])
  const [activity, setActivity] = useState<DashboardActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isOwner = membership?.role === 'owner'

  const reload = useCallback(async () => {
    if (!workspace) return
    const [nextItems, nextActivity] = await Promise.all([
      listDashboardItems(workspace.id, trackFilter),
      listDashboardActivity(workspace.id, trackFilter)
    ])
    setItems(nextItems); setActivity(nextActivity)
  }, [trackFilter, workspace])

  useEffect(() => {
    let cancelled = false
    if (!workspace) return
    setIsLoading(true); setError(null)
    void reload().catch(() => { if (!cancelled) setError('暂时无法同步总控信息，请检查网络后重试。') }).finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [reload, workspace])

  const summary = useMemo(() => buildStageSummary(items), [items])
  const queue = useMemo(() => sortTodayQueue(items, today()), [items])
  const funnel = useMemo(() => [
    { label: '内容方向', count: summary.no_script + summary.scripting + summary.ready_to_shoot },
    { label: '现场拍摄', count: summary.shooting },
    { label: '素材待剪', count: summary.shot_waiting_edit },
    { label: '准备发布', count: summary.ready_to_publish },
    { label: '已完成发布 / 复盘', count: summary.published + summary.reviewed }
  ], [summary])
  const maxFunnel = Math.max(1, ...funnel.map((item) => item.count))

  return (
    <section className="dashboard-page">
      <header className="dashboard-heading"><div><p className="eyebrow">WEIWU CONTENT OS</p><h1>让每一条内容<br />都有下一步。</h1><p>从灵感、脚本到现场拍摄，今天只看真实已经记录的工作，不把待发布或待复盘伪装成数据成绩。</p></div>{isOwner && <div className="dashboard-heading-actions"><Link className="ui-button ui-button--secondary" to={{ pathname: '/topics/new', search: location.search }}><Sparkles size={16} />记录选题</Link><Link className="ui-button ui-button--primary" to={{ pathname: '/shooting', search: location.search }}><Video size={16} />安排拍摄</Link></div>}</header>
      {isLoading && <p className="data-state">正在同步内容总控…</p>}
      {error && <p className="data-state is-error" role="alert">{error}</p>}
      {!isLoading && !error && items.length === 0 && <EmptyState title="先记录第一条内容" description={isOwner ? '总控只会汇总你的真实内容记录。先写下一条要拍的内容，再让流程自己变得清晰。' : '当前为只读权限，暂时没有可查看的内容记录。'} action={isOwner ? <Link className="ui-button ui-button--primary" to={{ pathname: '/topics/new', search: location.search }}>新建选题</Link> : undefined} />}
      {!isLoading && !error && items.length > 0 && <div className="dashboard-layout">
        <div className="dashboard-main-column"><TodayQueue items={queue} trackFilter={trackFilter} /><StageSummary summary={summary} /></div>
        <aside className="dashboard-side-column">
          <section className="production-funnel" aria-labelledby="funnel-title"><div className="section-title-row"><div><p className="eyebrow">PRODUCTION FUNNEL</p><h2 id="funnel-title">内容路径</h2></div><span>实时记录</span></div><div className="funnel-list">{funnel.map((item, index) => <div className="funnel-row" key={item.label}><div><span>0{index + 1}</span><strong>{item.label}</strong><b>{item.count}</b></div><i><em style={{ width: `${(item.count / maxFunnel) * 100}%` }} /></i></div>)}</div><p>发布与复盘尚未录入时，会保持“待推进”状态，而不是显示未经确认的播放或转化。</p></section>
          <section className="dashboard-activity" aria-labelledby="activity-title"><div className="section-title-row"><div><p className="eyebrow">RECENT ACTIVITY</p><h2 id="activity-title">最近动态</h2></div></div>{activity.length === 0 ? <p className="activity-empty">你的创建、修改和流程推进会显示在这里。</p> : <ol>{activity.map((item) => <li key={item.id}><span /><div><strong>{activityText(item)}</strong><time dateTime={item.createdAt}>{activityTime(item.createdAt)}</time></div></li>)}</ol>}</section>
          <section className="dashboard-quick-actions" aria-label="快捷入口">{isOwner && <Link to={{ pathname: '/topics/new', search: location.search }}><Sparkles size={19} /><span><strong>记录新灵感</strong><small>为下一条内容建立唯一记录</small></span><ArrowUpRight size={17} /></Link>}<Link to={{ pathname: '/scripts', search: location.search }}><FilePenLine size={19} /><span><strong>{isOwner ? '完善脚本' : '查看脚本'}</strong><small>{isOwner ? '继续打磨现有内容表达' : '以只读方式查看现有版本'}</small></span><ArrowUpRight size={17} /></Link><Link to={{ pathname: '/shooting', search: location.search }}><ClipboardPenLine size={19} /><span><strong>查看拍摄清单</strong><small>{isOwner ? '从现场镜头推进到剪辑' : '以只读方式查看现场记录'}</small></span><ArrowUpRight size={17} /></Link></section>
        </aside>
      </div>}
    </section>
  )
}
