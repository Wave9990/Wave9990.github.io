import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ExternalLink, Link2, LoaderCircle, Plus, Trash2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { parseRequiredShots, type ShootContentOption, type ShootTaskDraft, type ShootTaskWithContent, type RequiredShot } from '../../repositories/shootRepository'
import {
  createExternalAssetLink,
  deleteExternalAssetLink,
  listExternalAssetLinks,
  type AssetRow
} from '../../repositories/assetRepository'

interface ShootFormState {
  contentId: string
  scheduledFor: string
  location: string
  people: string
  requiredShots: RequiredShot[]
  notes: string
  status: 'planned' | 'cancelled'
}

function toDateTimeLocal(value: string | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const shift = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - shift).toISOString().slice(0, 16)
}

function toInitialForm(options: ShootContentOption[], task?: ShootTaskWithContent): ShootFormState {
  const selected = options.find((item) => item.id === task?.content_id) ?? options[0]
  return {
    contentId: task?.content_id ?? selected?.id ?? '',
    scheduledFor: toDateTimeLocal(task?.scheduled_for),
    location: task?.location ?? '',
    people: task?.people.join('、') ?? '',
    requiredShots: task ? parseRequiredShots(task.required_shots) : selected?.latestShotList ?? [],
    notes: task?.notes ?? '',
    status: task?.status === 'cancelled' ? 'cancelled' : 'planned'
  }
}

function isShotComplete(item: RequiredShot) { return item.done === true }

export function ShootEditor({
  options,
  task,
  isBusy = false,
  readOnly = false,
  workspaceId,
  actorId,
  onCancel,
  onSave,
  onComplete
}: {
  options: ShootContentOption[]
  task?: ShootTaskWithContent
  isBusy?: boolean
  readOnly?: boolean
  workspaceId?: string
  actorId?: string
  onCancel: () => void
  onSave: (draft: ShootTaskDraft) => void | Promise<void>
  onComplete?: (requiredShots: RequiredShot[]) => void | Promise<void>
}) {
  const [form, setForm] = useState<ShootFormState>(() => toInitialForm(options, task))
  const [showIncompleteConfirm, setShowIncompleteConfirm] = useState(false)
  const [assets, setAssets] = useState<AssetRow[]>([])
  const [assetsLoading, setAssetsLoading] = useState(false)
  const [assetSaving, setAssetSaving] = useState(false)
  const [assetLabel, setAssetLabel] = useState('')
  const [assetUrl, setAssetUrl] = useState('')
  const [assetError, setAssetError] = useState<string | null>(null)
  const selectedOption = useMemo(() => options.find((item) => item.id === form.contentId), [form.contentId, options])

  useEffect(() => setForm(toInitialForm(options, task)), [options, task])

  useEffect(() => {
    let cancelled = false
    if (!workspaceId || !form.contentId) {
      setAssets([])
      return
    }
    setAssetsLoading(true)
    setAssetError(null)
    void listExternalAssetLinks(workspaceId, form.contentId)
      .then((nextAssets) => { if (!cancelled) setAssets(nextAssets) })
      .catch(() => { if (!cancelled) setAssetError('暂时无法读取素材链接，请稍后重试。') })
      .finally(() => { if (!cancelled) setAssetsLoading(false) })
    return () => { cancelled = true }
  }, [form.contentId, workspaceId])

  function change<K extends keyof ShootFormState>(key: K, value: ShootFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function selectContent(contentId: string) {
    const next = options.find((option) => option.id === contentId)
    setForm((current) => ({ ...current, contentId, requiredShots: next?.latestShotList ?? current.requiredShots }))
  }

  function changeShot(index: number, patch: Partial<RequiredShot>) {
    setForm((current) => ({
      ...current,
      requiredShots: current.requiredShots.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)
    }))
  }

  function createDraft(requiredShots = form.requiredShots): ShootTaskDraft {
    return {
      contentId: form.contentId,
      scheduledFor: form.scheduledFor ? new Date(form.scheduledFor).toISOString() : null,
      location: form.location,
      people: form.people.split(/[、,，\n]/),
      requiredShots,
      notes: form.notes,
      status: form.status
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.contentId) return
    if (!readOnly) await onSave(createDraft())
  }

  async function handleComplete() {
    const incomplete = form.requiredShots.filter((shot) => shot.shot.trim() && !isShotComplete(shot))
    if (incomplete.length > 0) { setShowIncompleteConfirm(true); return }
    if (!readOnly) await onComplete?.(form.requiredShots)
  }

  async function addAssetLink() {
    if (readOnly || !workspaceId || !actorId || !form.contentId) return
    setAssetSaving(true); setAssetError(null)
    try {
      const asset = await createExternalAssetLink(workspaceId, actorId, form.contentId, { label: assetLabel, externalUrl: assetUrl })
      setAssets((current) => [asset, ...current])
      setAssetLabel(''); setAssetUrl('')
    } catch (reason) {
      setAssetError(reason instanceof Error ? reason.message : '保存素材链接失败，请稍后重试。')
    } finally { setAssetSaving(false) }
  }

  async function removeAssetLink(asset: AssetRow) {
    if (readOnly || !workspaceId || !actorId || !form.contentId) return
    setAssetSaving(true); setAssetError(null)
    try {
      await deleteExternalAssetLink(workspaceId, actorId, form.contentId, asset.id)
      setAssets((current) => current.filter((item) => item.id !== asset.id))
    } catch (reason) {
      setAssetError(reason instanceof Error ? reason.message : '移除素材链接失败，请稍后重试。')
    } finally { setAssetSaving(false) }
  }

  if (!task && options.length === 0) {
    return <section className="shoot-editor-empty"><h2>先准备一个可拍内容</h2><p>当选题进入写脚本或待拍阶段后，这里会显示可关联的内容记录。</p><Button type="button" variant="secondary" onClick={onCancel}>返回拍摄流程</Button></section>
  }

  return (
    <section className="shoot-editor">
      <header className="shoot-editor-header"><div><p className="eyebrow">SHOOT TASK</p><h2>{readOnly ? '查看拍摄任务' : task ? '编辑拍摄任务' : '新建拍摄任务'}</h2><p>现场记录与脚本分开保存；修改这里的镜头清单不会改动原脚本。</p></div><Button type="button" variant="ghost" onClick={onCancel} disabled={isBusy}>关闭</Button></header>
      <form className="editor-card" onSubmit={(event) => void handleSubmit(event)}>
        {readOnly && <p className="readonly-notice">仅查看 · 你可以浏览拍摄记录，但不能调整任务、勾选镜头或完成拍摄。</p>}
        <fieldset className="editor-fieldset" disabled={readOnly}>
        <div className="field-grid">
          <label className="field field--wide"><span>关联内容 <b>必填</b></span><select value={form.contentId} onChange={(event) => selectContent(event.target.value)} disabled={Boolean(task)} required><option value="" disabled>选择一条内容</option>{options.map((option) => <option key={option.id} value={option.id}>{option.title}</option>)}</select></label>
          <label className="field"><span>拍摄时间</span><input type="datetime-local" value={form.scheduledFor} onChange={(event) => change('scheduledFor', event.target.value)} /></label>
          <label className="field"><span>拍摄地点</span><input value={form.location} onChange={(event) => change('location', event.target.value)} placeholder="如：长沙 · 某小区工地" /></label>
          <label className="field"><span>出镜 / 协作人员</span><input value={form.people} onChange={(event) => change('people', event.target.value)} placeholder="用顿号或逗号分隔" /></label>
          <label className="field"><span>任务状态</span><select value={form.status} onChange={(event) => change('status', event.target.value as ShootFormState['status'])} disabled={task?.status === 'completed'}><option value="planned">待执行</option><option value="cancelled">已取消</option></select></label>
        </div>

        <div className="shoot-checklist-heading"><div><span>现场必拍镜头</span><p>{selectedOption?.latestShotList.length ? '已从最新脚本带入，你可以按现场情况调整。' : '逐条勾选，完成时会提醒你是否还有漏拍。'}</p></div><Button type="button" variant="secondary" onClick={() => change('requiredShots', [...form.requiredShots, { shot: '' }])}><Plus size={16} />添加镜头</Button></div>
        <div className="shoot-checklist" aria-label="现场必拍镜头清单">
          {form.requiredShots.length === 0 && <p className="shoot-checklist-empty">还没有镜头要求，可以先从最新脚本补充。</p>}
          {form.requiredShots.map((shot, index) => <div className="shoot-check-item" key={`${index}-${shot.shot}`}>
            <button type="button" className={`shot-check-button${isShotComplete(shot) ? ' is-checked' : ''}`} aria-pressed={isShotComplete(shot)} onClick={() => changeShot(index, { done: !isShotComplete(shot) })} disabled={task?.status === 'completed'}>{isShotComplete(shot) ? '已拍' : '待拍'}</button>
            <div className="shoot-check-fields"><input value={shot.shot} onChange={(event) => changeShot(index, { shot: event.target.value })} placeholder="例如：从门口推进的第一视角" disabled={task?.status === 'completed'} /><input value={shot.note ?? ''} onChange={(event) => changeShot(index, { note: event.target.value })} placeholder="补充说明（可选）" disabled={task?.status === 'completed'} /></div>
            <button type="button" className="shoot-remove-shot" aria-label="删除镜头" onClick={() => change('requiredShots', form.requiredShots.filter((_, itemIndex) => itemIndex !== index))} disabled={task?.status === 'completed'}><Trash2 size={16} /></button>
          </div>)}
        </div>
        {form.contentId && <section className="asset-link-panel" aria-labelledby="asset-links-title">
          <div className="asset-link-heading"><div><span id="asset-links-title"><Link2 size={15} />现场素材链接</span><p>只记录外部 HTTPS 地址，不上传文件，也不会生成临时访问链接。目标素材的访问权限仍由原链接决定。</p></div></div>
          {assetsLoading && <p className="asset-link-state"><LoaderCircle size={14} />正在读取链接…</p>}
          {!assetsLoading && assets.length === 0 && <p className="asset-link-state">还没有记录外部素材链接。</p>}
          {!assetsLoading && assets.length > 0 && <ul className="asset-link-list">{assets.map((asset) => <li key={asset.id}><a href={asset.external_url ?? '#'} target="_blank" rel="noreferrer"><span><strong>{asset.label || '未命名素材'}</strong><small>{asset.external_url}</small></span><ExternalLink size={15} /></a>{!readOnly && <button type="button" onClick={() => void removeAssetLink(asset)} disabled={assetSaving} aria-label={`移除 ${asset.label || '素材'} 链接`}>移除</button>}</li>)}</ul>}
          {!readOnly && <div className="asset-link-form"><label className="field"><span>素材标签</span><input value={assetLabel} maxLength={120} onChange={(event) => setAssetLabel(event.target.value)} placeholder="如：7月18日现场原片" /></label><label className="field asset-link-url"><span>HTTPS 链接</span><input value={assetUrl} inputMode="url" onChange={(event) => setAssetUrl(event.target.value)} placeholder="https://…" /></label><Button type="button" variant="secondary" onClick={() => void addAssetLink()} disabled={assetSaving || !assetLabel.trim() || !assetUrl.trim()}>{assetSaving ? '保存中…' : '记录链接'}</Button></div>}
          {assetError && <p className="form-error" role="alert">{assetError}</p>}
        </section>}
        <label className="field"><span>现场备注</span><textarea rows={4} value={form.notes} onChange={(event) => change('notes', event.target.value)} placeholder="记录天气、素材缺口、补拍计划或现场临时变化。" disabled={task?.status === 'completed'} /></label>
        {!readOnly && <footer className="editor-actions"><Button type="button" variant="ghost" onClick={onCancel} disabled={isBusy}>取消</Button><div>{task && task.status !== 'completed' && <Button type="button" variant="secondary" disabled={isBusy || form.status === 'cancelled'} onClick={() => void handleComplete()}>完成拍摄</Button>}<Button type="submit" disabled={isBusy || task?.status === 'completed'}>{isBusy ? '保存中…' : task?.status === 'completed' ? '拍摄已完成' : '保存拍摄任务'}</Button></div></footer>}
        </fieldset>
      </form>
      {showIncompleteConfirm && !readOnly && <ConfirmDialog title="还有镜头没有勾选" description="你仍然可以完成本次拍摄，但未勾选镜头会保留在任务记录里，方便后续补拍。" confirmLabel="仍然完成" isBusy={isBusy} onCancel={() => setShowIncompleteConfirm(false)} onConfirm={() => { setShowIncompleteConfirm(false); void onComplete?.(form.requiredShots) }} />}
    </section>
  )
}
