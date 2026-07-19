import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { getContentItem, softDeleteContentItem, updateContentItem, createContentItem, type ContentDraft } from '../../repositories/contentRepository'
import { useAuth } from '../../providers/AuthProvider'
import { useTrack } from '../../providers/TrackProvider'
import type { TopicStatus, TrackId } from '../../types/domain'

interface TopicFormState {
  title: string
  trackCode: TrackId
  insight: string
  audience: string
  contentType: string
  keyword: string
  objective: string
  priority: 'low' | 'medium' | 'high'
  topicStatus: TopicStatus
  plannedFor: string
}

const initialForm = (track: TrackId): TopicFormState => ({
  title: '', trackCode: track, insight: '', audience: '', contentType: '', keyword: '', objective: '', priority: 'medium', topicStatus: 'inbox', plannedFor: ''
})

export function TopicEditor() {
  const { contentId } = useParams()
  const isNew = !contentId
  const { workspace, user, membership } = useAuth()
  const { trackFilter } = useTrack()
  const defaultTrack = trackFilter === 'all' ? 'weiwu_b2b' : trackFilter
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState<TopicFormState>(() => initialForm(defaultTrack))
  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDelete, setShowDelete] = useState(false)
  const pageTitle = isNew ? '新建选题' : '编辑选题'
  const isOwner = membership?.role === 'owner'
  const scriptCreationSearch = useMemo(() => {
    if (!contentId) return ''
    const params = new URLSearchParams(location.search)
    params.set('content', contentId)
    return `?${params.toString()}`
  }, [contentId, location.search])

  useEffect(() => {
    if (isNew || !workspace || !contentId) return
    let cancelled = false
    void getContentItem(workspace.id, contentId)
      .then((item) => {
        if (cancelled) return
        if (!item) { setError('没有找到该选题，可能已被归档。'); return }
        setForm({
          title: item.title, trackCode: item.tracks.code, insight: item.insight ?? '', audience: item.audience ?? '',
          contentType: item.content_type ?? '', keyword: item.keyword ?? '', objective: item.objective ?? '',
          priority: item.priority, topicStatus: item.topic_status, plannedFor: item.planned_for ?? ''
        })
      })
      .catch(() => { if (!cancelled) setError('暂时无法读取这条选题。') })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [contentId, isNew, workspace])

  const draft = useMemo<ContentDraft>(() => ({
    title: form.title, trackCode: form.trackCode, insight: form.insight, audience: form.audience,
    contentType: form.contentType, keyword: form.keyword, objective: form.objective,
    priority: form.priority, topicStatus: form.topicStatus, plannedFor: form.plannedFor || null
  }), [form])

  function change<K extends keyof TopicFormState>(key: K, value: TopicFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!workspace || !user || !isOwner) return
    setIsSaving(true); setError(null)
    try {
      const item = isNew
        ? await createContentItem(workspace.id, user.id, draft)
        : await updateContentItem(workspace.id, user.id, contentId!, draft)
      navigate({ pathname: `/topics/${item.id}`, search: location.search })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '保存失败，请稍后重试。')
    } finally { setIsSaving(false) }
  }

  async function handleDelete() {
    if (!workspace || !user || !contentId || !isOwner) return
    setIsDeleting(true); setError(null)
    try {
      await softDeleteContentItem(workspace.id, user.id, contentId)
      navigate({ pathname: '/topics', search: location.search })
    } catch { setError('归档失败，请稍后重试。'); setIsDeleting(false) }
  }

  if (isLoading) return <p className="data-state">正在读取选题…</p>
  return (
    <section className="editor-page">
      <header className="editor-heading"><div><p className="eyebrow">TOPIC EDITOR</p><h1>{pageTitle}</h1><p>内容线、获客对象和搜索词都在同一条内容记录里，方便在设备之间继续推进。</p></div><Link className="back-link" to={{ pathname: '/topics', search: location.search }}>返回选题库</Link></header>
      <form className="editor-card" onSubmit={(event) => void handleSubmit(event)}>
        {!isOwner && <p className="readonly-notice">仅查看 · 你可以阅读这条选题，但不能修改、保存或归档。</p>}
        <fieldset className="editor-fieldset" disabled={!isOwner}>
        <div className="field-grid field-grid--main">
          <label className="field field--wide"><span>选题标题 <b>必填</b></span><input value={form.title} required maxLength={160} onChange={(event) => change('title', event.target.value)} placeholder="例如：量房现场，业主不在场时怎么拍" /></label>
          <label className="field"><span>内容线</span><select value={form.trackCode} onChange={(event) => change('trackCode', event.target.value as TrackId)}><option value="weiwu_b2b">唯吾 · B端获客</option><option value="coaching_c2c">陪跑 · C端获客</option></select></label>
          <label className="field"><span>优先级</span><select value={form.priority} onChange={(event) => change('priority', event.target.value as TopicFormState['priority'])}><option value="high">高</option><option value="medium">中</option><option value="low">低</option></select></label>
          <label className="field"><span>选题状态</span><select value={form.topicStatus} onChange={(event) => change('topicStatus', event.target.value as TopicStatus)}><option value="inbox">灵感收集</option><option value="validate">待验证</option><option value="approved">已确认</option><option value="paused">暂缓</option><option value="archived">已归档</option></select></label>
          <label className="field"><span>计划拍摄日期</span><input type="date" value={form.plannedFor} onChange={(event) => change('plannedFor', event.target.value)} /></label>
        </div>
        <div className="editor-divider" />
        <div className="field-grid">
          <label className="field field--wide"><span>内容洞察</span><textarea rows={4} value={form.insight} onChange={(event) => change('insight', event.target.value)} placeholder="这条内容想解决谁的什么真实问题？" /></label>
          <label className="field"><span>目标受众</span><input value={form.audience} onChange={(event) => change('audience', event.target.value)} placeholder="如：装企老板、设计工作室" /></label>
          <label className="field"><span>内容类型</span><input value={form.contentType} onChange={(event) => change('contentType', event.target.value)} placeholder="如：现场实操、口播复盘" /></label>
          <label className="field"><span>搜索关键词</span><input value={form.keyword} onChange={(event) => change('keyword', event.target.value)} placeholder="如：装修量房、拍摄技巧" /></label>
          <label className="field"><span>内容目标</span><input value={form.objective} onChange={(event) => change('objective', event.target.value)} placeholder="如：建立专业信任、获取咨询" /></label>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {isOwner && <footer className="editor-actions"><div>{!isNew && <Button type="button" variant="ghost" disabled={isSaving} onClick={() => setShowDelete(true)}>归档这条选题</Button>}</div><div>{!isNew && <Link className="ui-button ui-button--secondary" to={{ pathname: '/scripts/new', search: scriptCreationSearch }}>开始写脚本</Link>}<Button type="button" variant="ghost" disabled={isSaving} onClick={() => navigate({ pathname: '/topics', search: location.search })}>取消</Button><Button type="submit" disabled={isSaving}>{isSaving ? '保存中…' : '保存选题'}</Button></div></footer>}
        </fieldset>
      </form>
      {showDelete && isOwner && <ConfirmDialog title="归档这条选题？" description="选题会从日常库中隐藏，但仍可在后续恢复；不会被永久删除。" confirmLabel="确认归档" isBusy={isDeleting} onCancel={() => setShowDelete(false)} onConfirm={handleDelete} />}
    </section>
  )
}
