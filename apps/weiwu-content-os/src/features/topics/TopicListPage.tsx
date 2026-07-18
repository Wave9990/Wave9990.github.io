import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { EmptyState } from '../../components/ui/EmptyState'
import { listContentItems, type ContentItemWithTrack } from '../../repositories/contentRepository'
import { useAuth } from '../../providers/AuthProvider'
import { useTrack } from '../../providers/TrackProvider'
import type { TopicStatus } from '../../types/domain'
import { TopicCard } from './TopicCard'

export function TopicListPage() {
  const { workspace, membership } = useAuth()
  const { trackFilter } = useTrack()
  const location = useLocation()
  const [items, setItems] = useState<ContentItemWithTrack[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<TopicStatus | 'all'>('all')
  const [priority, setPriority] = useState<'all' | 'low' | 'medium' | 'high'>('all')
  const [contentType, setContentType] = useState('all')
  const isOwner = membership?.role === 'owner'

  useEffect(() => {
    if (!workspace) return
    let cancelled = false
    setIsLoading(true)
    setError(null)
    void listContentItems({ workspaceId: workspace.id, trackFilter, topicStatus: status, priority, contentType, search })
      .then((result) => { if (!cancelled) setItems(result) })
      .catch(() => { if (!cancelled) setError('暂时无法读取选题库，请检查网络后重试。') })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [contentType, priority, search, status, trackFilter, workspace])

  const types = useMemo(() => [...new Set(items.map((item) => item.content_type).filter(Boolean))] as string[], [items])

  return (
    <section className="content-page">
      <header className="page-heading">
        <div><p className="eyebrow">TOPIC LIBRARY</p><h1>选题库</h1><p>把灵感、关键词和获客目标沉淀成下一条可执行内容。</p></div>
        {isOwner && <Link className="ui-button ui-button--primary" to={{ pathname: '/topics/new', search: location.search }}>+ 新建选题</Link>}
      </header>
      <div className="content-filters" aria-label="选题筛选">
        <label className="search-field"><span className="sr-only">搜索选题</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索标题、关键词或受众" /></label>
        <select aria-label="选题状态" value={status} onChange={(event) => setStatus(event.target.value as TopicStatus | 'all')}><option value="all">全部状态</option><option value="inbox">灵感收集</option><option value="validate">待验证</option><option value="approved">已确认</option><option value="paused">暂缓</option><option value="archived">已归档</option></select>
        <select aria-label="优先级" value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)}><option value="all">所有优先级</option><option value="high">高优先级</option><option value="medium">中优先级</option><option value="low">低优先级</option></select>
        <select aria-label="内容类型" value={contentType} onChange={(event) => setContentType(event.target.value)}><option value="all">所有类型</option>{types.map((type) => <option key={type} value={type}>{type}</option>)}</select>
      </div>
      {isLoading && <p className="data-state">正在同步选题…</p>}
      {error && <p className="data-state is-error" role="alert">{error}</p>}
      {!isLoading && !error && items.length === 0 && <EmptyState title="这里还没有选题" description={isOwner ? '先记下一个现场发现、搜索关键词或客户问题，之后再把它变成脚本。' : '当前为只读权限，暂时没有可查看的选题。'} action={isOwner ? <Link className="ui-button ui-button--primary" to={{ pathname: '/topics/new', search: location.search }}>新建第一条选题</Link> : undefined} />}
      {!isLoading && !error && items.length > 0 && <div className="topic-grid">{items.map((item) => <TopicCard key={item.id} item={item} search={location.search} />)}</div>}
    </section>
  )
}
