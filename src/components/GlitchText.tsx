import type { CSSProperties, ReactNode } from 'react'
import './GlitchText.css'

type GlitchTextProps = {
  children: string
  speed?: number
  enableShadows?: boolean
  enableOnHover?: boolean
  className?: string
}

export default function GlitchText({
  children,
  speed = .75,
  enableShadows = true,
  enableOnHover = true,
  className = '',
}: GlitchTextProps) {
  const styles = {
    '--glitch-after-duration': `${speed * 3}s`,
    '--glitch-before-duration': `${speed * 2}s`,
    '--glitch-after-shadow': enableShadows ? '-4px 0 rgba(184, 132, 82, .9)' : 'none',
    '--glitch-before-shadow': enableShadows ? '4px 0 rgba(91, 143, 142, .85)' : 'none',
  } as CSSProperties

  return <span className={`glitch-text ${enableOnHover ? 'glitch-on-hover' : ''} ${className}`.trim()} style={styles} data-text={children}>{children as ReactNode}</span>
}
