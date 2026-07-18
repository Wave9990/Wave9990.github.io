import type { ReactNode } from 'react'

type StatusTone = 'muted' | 'terracotta' | 'gold' | 'green'

export function StatusBadge({ children, tone = 'muted' }: { children: ReactNode; tone?: StatusTone }) {
  return <span className={`status-badge status-badge--${tone}`}>{children}</span>
}
