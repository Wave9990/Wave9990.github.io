import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { getContentItem } from '../../repositories/contentRepository'
import { createScriptRevision, getScript, updateDraftScript, type ScriptDraft, type ScriptWithContent, type ShotListItem } from '../../repositories/scriptRepository'
import { useAuth } from '../../providers/AuthProvider'

interface ScriptFormState {
  title: string
  hook: string
  body: string
  shotText: string
  caption: string
  hashtags: string
  estimatedSeconds: string
  status: 'draft' | 'ready'
}

const emptyForm = (): ScriptFormState => ({ title: '', hook: '', body: '', shotText: '', caption: '', hashtags: '', estimatedSeconds: '', status: 'draft' })

function formFromScript(script: ScriptWithContent): ScriptFormState {
  const shots = Array.isArray(script.shot_list) ? script.shot_list as unknown as ShotListItem[] : []
  return {
    title: script.title, hook: script.hook, body: script.body,
    shotText: shots.map((shot) => shot.note ? `${shot.shot}｜${shot.note}` : shot.shot).join('\n'),
    caption: script.caption ?? '', hashtags: script.hashtags.join(' '),
    estimatedSeconds: script.estimated_seconds?.toString() ?? '', status: script.status as 'draft' | 'ready'
  }
}

function toDraft(form: ScriptFormState): ScriptDraft {
  const shotList = form.shotText.split('\n').map((line) => {
    const [shot, note] = line.split('｜', 2)
    return { shot, ...(note ? { note } : {}) }
  }).filter((shot) => shot.shot.trim())
  return {
    title: form.title, hook: form.hook, body: form.body, shotList,
    caption: form.caption, hashtags: form.hashtags.split(/[\s,，]+/),
    estimatedSeconds: form.estimatedSeconds ? Number(form.estimatedSeconds) : null, status: form.status
  }
}

export function ScriptEditorPage() {
  const { scriptId } = useParams()
  const [searchParams] = useSearchParams()
  const contentId = searchParams.get('content')
  const copyFromId = searchParams.get('from')
  const isNewRevision = !scriptId
  const { workspace, user, membership } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState<ScriptFormState>(emptyForm)
  const [linkedTitle, setLinkedTitle] = useState('')
  const [linkedContentId, setLinkedContentId] = useState(contentId ?? '')
  const [loadedScript, setLoadedScript] = useState<ScriptWithContent | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isImmutable = Boolean(loadedScript && loadedScript.status === 'ready' && !isNewRevision)
  const isOwner = membership?.role === 'owner'
  const isReadOnly = !isOwner || isImmutable
  const pageTitle = isNewRevision ? '创建脚本版本' : isImmutable ? `脚本 v${loadedScript?.version}` : '编辑草稿脚本'

  useEffect(() => {
    if (!workspace) return
    const requestedContentId = contentId
    const sourceId = scriptId ?? copyFromId
    if (!sourceId && !requestedContentId) { setError('请从选题库选择要关联的选题。'); setIsLoading(false); return }
    let cancelled = false
    const load = async () => {
      try {
        if (sourceId) {
          const script = await getScript(workspace.id, sourceId)
          if (!script) throw new Error('没有找到该脚本。')
          if (cancelled) return
          setLoadedScript(script)
          setLinkedTitle(script.content_items.title)
          setLinkedContentId(script.content_id)
          setForm(formFromScript(script))
        } else if (requestedContentId) {
          const content = await getContentItem(workspace.id, requestedContentId)
          if (!content) throw new Error('没有找到关联选题。')
          if (cancelled) return
          setLinkedTitle(content.title)
          setLinkedContentId(content.id)
        }
      } catch (reason) { if (!cancelled) setError(reason instanceof Error ? reason.message : '暂时无法读取脚本。') }
      finally { if (!cancelled) setIsLoading(false) }
    }
    void load()
    return () => { cancelled = true }
  }, [contentId, copyFromId, scriptId, workspace])

  const draft = useMemo(() => toDraft(form), [form])
  const wordCount = useMemo(() => `${form.hook}${form.body}`.trim().replaceAll(/\s+/g, '').length, [form.body, form.hook])
  function change<K extends keyof ScriptFormState>(key: K, value: ScriptFormState[K]) { setForm((current) => ({ ...current, [key]: value })) }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!workspace || !user || !linkedContentId || isReadOnly) return
    setIsSaving(true); setError(null)
    try {
      const script = scriptId
        ? await updateDraftScript(workspace.id, user.id, scriptId, draft)
        : await createScriptRevision(workspace.id, user.id, linkedContentId, draft)
      navigate({ pathname: `/scripts/${script.id}`, search: location.search })
    } catch (reason) { setError(reason instanceof Error ? reason.message : '保存失败，请稍后重试。') }
    finally { setIsSaving(false) }
  }

  if (isLoading) return <p className="data-state">正在读取脚本…</p>
  return (
    <section className="editor-page script-editor">
      <header className="editor-heading"><div><p className="eyebrow">SCRIPT REVISION</p><h1>{pageTitle}</h1><p>关联选题：<Link to={{ pathname: `/topics/${linkedContentId}`, search: location.search }}>{linkedTitle || '未找到选题'}</Link></p></div><Link className="back-link" to={{ pathname: '/scripts', search: location.search }}>返回脚本工作台</Link></header>
      {error && !linkedContentId ? <p className="data-state is-error" role="alert">{error}</p> : <form className="editor-card" onSubmit={(event) => void handleSubmit(event)}>
        {!isOwner && <p className="readonly-notice">仅查看 · 你可以阅读脚本版本，但不能创建、编辑或生成新版本。</p>}
        {isImmutable && isOwner && <div className="immutable-notice"><strong>已就绪版本受到保护</strong><span>如需修改文案，会创建 v{(loadedScript?.version ?? 0) + 1}，不会覆盖这版已确认脚本。</span><Button type="button" onClick={() => {
          const next = new URLSearchParams(location.search)
          next.set('content', linkedContentId)
          next.set('from', scriptId ?? '')
          navigate({ pathname: '/scripts/new', search: `?${next.toString()}` })
        }}>创建新版本</Button></div>}
        <div className="field-grid field-grid--main"><label className="field field--wide"><span>脚本标题 <b>必填</b></span><input value={form.title} disabled={isReadOnly} maxLength={160} required onChange={(event) => change('title', event.target.value)} placeholder="给这版脚本一个清楚的名称" /></label><label className="field field--wide"><span>开头钩子 <b>必填</b></span><textarea rows={3} disabled={isReadOnly} maxLength={800} required value={form.hook} onChange={(event) => change('hook', event.target.value)} placeholder="前 3 秒让谁停下来、为什么停下来？" /></label></div>
        <label className="field field--wide"><span>脚本正文 <b>必填</b><em>{wordCount} 字</em></span><textarea className="script-body-input" rows={14} disabled={isReadOnly} required maxLength={20000} value={form.body} onChange={(event) => change('body', event.target.value)} placeholder="按口播节奏写下完整内容。" /></label>
        <div className="field-grid"><label className="field field--wide"><span>镜头清单</span><textarea rows={6} disabled={isReadOnly} value={form.shotText} onChange={(event) => change('shotText', event.target.value)} placeholder={'一行一个镜头，可用「镜头｜说明」补充备注\n例如：第一视角入户｜从进门开始记录'} /></label><label className="field"><span>发布文案</span><textarea rows={6} disabled={isReadOnly} value={form.caption} onChange={(event) => change('caption', event.target.value)} placeholder="发布时使用的文案" /></label><label className="field"><span>话题标签</span><textarea rows={6} disabled={isReadOnly} value={form.hashtags} onChange={(event) => change('hashtags', event.target.value)} placeholder="#装修IP #装修短视频" /></label><label className="field"><span>预计时长（秒）</span><input min="1" type="number" disabled={isReadOnly} value={form.estimatedSeconds} onChange={(event) => change('estimatedSeconds', event.target.value)} placeholder="如 90" /></label><label className="field"><span>当前状态</span><select disabled={isReadOnly} value={form.status} onChange={(event) => change('status', event.target.value as ScriptFormState['status'])}><option value="draft">草稿</option><option value="ready">已就绪，可创建拍摄任务</option></select></label></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {!isReadOnly && <footer className="editor-actions"><Button type="button" variant="ghost" disabled={isSaving} onClick={() => navigate({ pathname: '/scripts', search: location.search })}>取消</Button><Button type="submit" disabled={isSaving}>{isSaving ? '保存中…' : scriptId ? '保存草稿' : '创建新版本'}</Button></footer>}
        {isImmutable && isOwner && <footer className="editor-actions"><Link className="ui-button ui-button--secondary" to={{ pathname: '/shooting', search: (() => { const next = new URLSearchParams(location.search); next.set('content', linkedContentId); return `?${next.toString()}` })() }}>可创建拍摄任务</Link></footer>}
      </form>}
    </section>
  )
}
