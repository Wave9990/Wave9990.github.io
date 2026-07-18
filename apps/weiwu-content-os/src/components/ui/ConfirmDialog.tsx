import { useEffect, useRef } from 'react'
import { Button } from './Button'

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  isBusy = false,
  onCancel,
  onConfirm
}: {
  title: string
  description: string
  confirmLabel: string
  isBusy?: boolean
  onCancel: () => void
  onConfirm: () => void | Promise<void>
}) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  useEffect(() => cancelRef.current?.focus(), [])

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !isBusy) onCancel()
    }}>
      <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
        <p className="eyebrow">CONFIRM ACTION</p>
        <h2 id="confirm-dialog-title">{title}</h2>
        <p>{description}</p>
        <div className="dialog-actions">
          <Button ref={cancelRef} variant="ghost" disabled={isBusy} onClick={onCancel}>取消</Button>
          <Button disabled={isBusy} onClick={() => void onConfirm()}>{isBusy ? '处理中…' : confirmLabel}</Button>
        </div>
      </section>
    </div>
  )
}
