export interface ToastMessage {
  message: string
  tone?: 'success' | 'error' | 'info'
}

export function ToastRegion({ toast }: { toast: ToastMessage | null }) {
  return (
    <div className="toast-region" aria-live="polite" aria-atomic="true">
      {toast && <p className={`toast toast--${toast.tone ?? 'info'}`} role="status">{toast.message}</p>}
    </div>
  )
}
