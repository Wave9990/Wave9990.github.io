import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useTrack } from '../../providers/TrackProvider'
import type { TrackId } from '../../types/domain'
import { Button } from '../ui/Button'
import { trackLabel } from './TrackSwitch'

export interface QuickCapturePayload {
  title: string
  trackId: TrackId
  topicStatus: 'inbox'
  productionStage: 'no_script'
}

export interface QuickCaptureDialogProps {
  onCapture: (payload: QuickCapturePayload) => Promise<void> | void
}

export function QuickCaptureDialog({ onCapture }: QuickCaptureDialogProps) {
  const { trackFilter } = useTrack()
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const activeTrack: TrackId = trackFilter === 'all' ? 'weiwu_b2b' : trackFilter

  useEffect(() => {
    if (!isOpen) return
    titleRef.current?.focus()
  }, [isOpen])

  function close() {
    setIsOpen(false)
    setError(null)
    setTitle('')
    window.setTimeout(() => triggerRef.current?.focus(), 0)
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape' && !isSaving) {
      event.preventDefault()
      close()
      return
    }

    if (event.key !== 'Tab') return

    const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [href], select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ) ?? [])
    if (focusable.length === 0) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return

    setIsSaving(true)
    setError(null)
    try {
      await onCapture({
        title: trimmedTitle,
        trackId: activeTrack,
        topicStatus: 'inbox',
        productionStage: 'no_script'
      })
      close()
    } catch {
      setError('记录失败，请检查网络后重试。')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <Button ref={triggerRef} className="quick-capture-trigger" onClick={() => setIsOpen(true)}>
        + 快速记录
      </Button>
      {isOpen && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !isSaving) close()
        }}>
          <section ref={dialogRef} className="quick-capture-dialog" role="dialog" aria-modal="true" aria-labelledby="capture-title" onKeyDown={handleDialogKeyDown}>
            <div className="dialog-heading">
              <div>
                <p className="eyebrow">INBOX CAPTURE</p>
                <h2 id="capture-title">记下一条待验证的内容</h2>
              </div>
              <button className="dialog-close" type="button" aria-label="关闭快速记录" disabled={isSaving} onClick={close}>×</button>
            </div>
            <p className="dialog-note">将自动归入 <strong>{trackLabel(activeTrack)}</strong>，状态为「灵感收集」。</p>
            <form onSubmit={(event) => void handleSubmit(event)}>
              <label htmlFor="capture-title-input">选题或一句想法</label>
              <input
                ref={titleRef}
                id="capture-title-input"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="例如：量房现场，业主不在场时怎么拍"
                required
                disabled={isSaving}
              />
              {error && <p className="form-error" role="alert">{error}</p>}
              <div className="dialog-actions">
                <Button variant="ghost" disabled={isSaving} onClick={close}>取消</Button>
                <Button type="submit" disabled={isSaving || !title.trim()}>{isSaving ? '保存中…' : '记录到选题库'}</Button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  )
}
