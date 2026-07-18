import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { EmptyState } from '../../components/ui/EmptyState'
import { listScripts, type ScriptWithContent } from '../../repositories/scriptRepository'
import { useAuth } from '../../providers/AuthProvider'
import { useTrack } from '../../providers/TrackProvider'

function countWords(text: string) { return text.trim().replaceAll(/\s+/g, '').length }

export function ScriptListPage() {
  const { workspace, membership } = useAuth()
  const { trackFilter } = useTrack()
  const location = useLocation()
  const [items, setItems] = useState<ScriptWithContent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isOwner = membership?.role === 'owner'

  useEffect(() => {
    if (!workspace) return
    let cancelled = false
    setIsLoading(true); setError(null)
    void listScripts(workspace.id, trackFilter)
      .then((scripts) => { if (!cancelled) setItems(scripts) })
      .catch(() => { if (!cancelled) setError('暂时无法读取脚本，请检查网络后重试。') })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [trackFilter, workspace])

  return (
    <section className="content-page">
      <header className="page-heading"><div><p className="eyebrow">SCRIPT WORKBENCH</p><h1>脚本工作台</h1><p>每个版本都与同一选题关联，已就绪的版本不会被覆盖。</p></div><Link className="ui-button ui-button--primary" to={{ pathname: '/topics', search: location.search }}>先选择一个选题</Link></header>
      {isLoading && <p className="data-state">正在同步脚本…</p>}
      {error && <p className="data-state is-error" role="alert">{error}</p>}
      {!isLoading && !error && items.length === 0 && <EmptyState title="还没有脚本版本" description="从选题库选择一个方向，就可以建立第一版结构、口播与拍摄镜头。" action={<Link className="ui-button ui-button--primary" to={{ pathname: '/topics', search: location.search }}>前往选题库</Link>} />}
      {!isLoading && !error && items.length > 0 && <div className="script-list" role="list">
        {items.map((script) => <article className="script-row" role="listitem" key={script.id}>
          <div className="script-row-main"><p className="script-row-title">{script.title}</p><p className="script-row-topic">关联选题 · <Link to={{ pathname: `/topics/${script.content_id}`, search: location.search }}>{script.content_items.title}</Link></p></div>
          <div className="script-row-meta"><span className={`script-status script-status--${script.status}`}>{script.status === 'ready' ? '已就绪' : '草稿'} · v{script.version}</span><span>{countWords(`${script.hook}${script.body}`)} 字 · {script.estimated_seconds ? `约 ${script.estimated_seconds} 秒` : '时长待定'}</span></div>
          <div className="script-row-hook"><strong>开头钩子</strong><span>{script.hook}</span></div>
          <div className="script-row-assets"><span>素材状态</span><strong>{script.shot_list && Array.isArray(script.shot_list) && script.shot_list.length ? `${script.shot_list.length} 个镜头待拍` : '待补充镜头'}</strong></div>
          <div className="script-row-actions"><time dateTime={script.updated_at}>{new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(script.updated_at))} 更新</time><Link className="text-link" to={{ pathname: `/scripts/${script.id}`, search: location.search }}>{!isOwner || script.status === 'ready' ? '查看版本' : '继续编辑'}</Link></div>
        </article>)}
      </div>}
    </section>
  )
}
