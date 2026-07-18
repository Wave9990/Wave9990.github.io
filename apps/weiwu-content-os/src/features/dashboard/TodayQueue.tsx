import { ArrowRight, CalendarClock, Flag, MapPin } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import type { DashboardItem } from '../../repositories/dashboardRepository'
import type { TrackFilter } from '../../types/domain'

const stageLabels: Record<DashboardItem['productionStage'], string> = {
  no_script: '待写脚本',
  scripting: '脚本中',
  ready_to_shoot: '等待拍摄',
  shooting: '拍摄进行中',
  shot_waiting_edit: '等待剪辑',
  ready_to_publish: '待发布',
  published: '已发布',
  reviewed: '已复盘'
}

const priorityLabels = { high: '高优先', medium: '中优先', low: '低优先' } as const

function toRoute(item: DashboardItem) {
  if (item.productionStage === 'no_script' || item.productionStage === 'scripting') return `/scripts/new?content=${encodeURIComponent(item.id)}`
  if (item.productionStage === 'ready_to_shoot' || item.productionStage === 'shooting') return '/shooting'
  return `/topics/${item.id}`
}

export function TodayQueue({ items, trackFilter }: { items: DashboardItem[]; trackFilter: TrackFilter }) {
  const location = useLocation()
  const secondary = (item: DashboardItem) => {
    if (trackFilter === 'weiwu_b2b') return item.objective ? `内容目标 · ${item.objective}` : '内容目标待补充'
    if (trackFilter === 'coaching_c2c') return item.audience ? `业主问题 · ${item.audience}` : '业主问题待补充'
    return null
  }

  return (
    <section className="today-queue" aria-labelledby="today-queue-title">
      <div className="section-title-row"><div><p className="eyebrow">TODAY'S QUEUE</p><h2 id="today-queue-title">今天要推进什么</h2></div><span>{items.length ? `${items.length} 条待推进` : '今天节奏留白'}</span></div>
      {items.length === 0 ? <div className="today-queue-empty"><CalendarClock size={20} /><p>暂时没有计划日期不晚于今天的内容。你可以先从选题库安排下一步。</p><Link className="text-link" to={{ pathname: '/topics', search: location.search }}>查看选题库</Link></div> : <div className="today-queue-list">{items.map((item) => <Link className="today-queue-row" key={item.id} to={{ pathname: toRoute(item).split('?')[0], search: `${toRoute(item).includes('?') ? toRoute(item).split('?')[1] : location.search}` }}>
        <span className={`priority-dot priority-dot--${item.priority}`} aria-label={priorityLabels[item.priority]} />
        <div className="today-queue-main"><div><span className="today-queue-stage">{stageLabels[item.productionStage]}</span><h3>{item.title ?? '未命名内容'}</h3></div>{secondary(item) && <p>{secondary(item)}</p>}</div>
        <div className="today-queue-meta"><span><Flag size={14} />{priorityLabels[item.priority]}</span>{item.plannedFor && <span><MapPin size={14} />{item.plannedFor}</span>}</div><ArrowRight size={17} />
      </Link>)}</div>}
    </section>
  )
}
