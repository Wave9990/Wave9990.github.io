import { CalendarDays, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { StatusBadge } from '../../components/ui/StatusBadge'
import type { ContentItemWithTrack } from '../../repositories/contentRepository'

const topicStatusLabel: Record<ContentItemWithTrack['topic_status'], string> = {
  inbox: '灵感收集',
  validate: '待验证',
  approved: '已确认',
  paused: '暂缓',
  archived: '已归档'
}

const stageLabel: Record<ContentItemWithTrack['production_stage'], string> = {
  no_script: '未写脚本',
  scripting: '脚本中',
  ready_to_shoot: '待拍摄',
  shooting: '拍摄中',
  shot_waiting_edit: '待剪辑',
  ready_to_publish: '待发布',
  published: '已发布',
  reviewed: '已复盘'
}

const priorityTone = { low: 'muted', medium: 'gold', high: 'terracotta' } as const
const priorityLabel = { low: '低', medium: '中', high: '高' }

export function formatTopicStatus(status: ContentItemWithTrack['topic_status']) {
  return topicStatusLabel[status]
}

function scriptCreationSearch(contentId: string, search: string) {
  const params = new URLSearchParams(search)
  params.set('content', contentId)
  return `?${params.toString()}`
}

export function TopicCard({ item, search = '', canCreateScript = false }: { item: ContentItemWithTrack; search?: string; canCreateScript?: boolean }) {
  const canStartScript = canCreateScript && item.production_stage === 'no_script'

  return (
    <article className="topic-card">
      <div className="topic-card-meta">
        <StatusBadge tone="green">{item.tracks.name}</StatusBadge>
        <StatusBadge tone={priorityTone[item.priority]}>优先级 · {priorityLabel[item.priority]}</StatusBadge>
      </div>
      <Link className="topic-card-link" to={{ pathname: `/topics/${item.id}`, search }}>
        <h2>{item.title}</h2><ChevronRight size={18} aria-hidden="true" />
      </Link>
      <p className="topic-card-insight">{item.insight || item.keyword || '待补充内容洞察与关键词。'}</p>
      <dl className="topic-card-details">
        <div><dt>受众</dt><dd>{item.audience || '未填写'}</dd></div>
        <div><dt>关键词</dt><dd>{item.keyword || '未填写'}</dd></div>
        <div><dt>目标</dt><dd>{item.objective || '未填写'}</dd></div>
      </dl>
      {canStartScript && <div className="topic-card-actions">
        <Link className="ui-button ui-button--secondary" to={{ pathname: '/scripts/new', search: scriptCreationSearch(item.id, search) }}>开始写脚本</Link>
      </div>}
      <footer>
        <span><CalendarDays size={14} /> {new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' }).format(new Date(item.updated_at))} 更新</span>
        <span className="topic-card-stage">{formatTopicStatus(item.topic_status)} · {stageLabel[item.production_stage]}</span>
      </footer>
    </article>
  )
}
