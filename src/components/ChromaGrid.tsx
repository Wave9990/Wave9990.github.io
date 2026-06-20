import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import './ChromaGrid.css'

export type ChromaItem = {
  image: string
  imagePosition?: 'left' | 'center' | 'right'
  title: string
  subtitle: string
  handle?: string
  eyebrow?: string
  borderColor?: string
  gradient?: string
}

type Props = { items: ChromaItem[]; className?: string; radius?: number; damping?: number; fadeOut?: number; ease?: string }

export default function ChromaGrid({ items, className = '', radius = 280, damping = .45, fadeOut = .6, ease = 'power3.out' }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const fadeRef = useRef<HTMLDivElement>(null)
  const pos = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    pos.current = { x: width / 2, y: height / 2 }
    el.style.setProperty('--x', `${pos.current.x}px`)
    el.style.setProperty('--y', `${pos.current.y}px`)
  }, [])

  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = rootRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    gsap.to(pos.current, { x: event.clientX - rect.left, y: event.clientY - rect.top, duration: damping, ease, overwrite: true, onUpdate: () => {
      el.style.setProperty('--x', `${pos.current.x}px`)
      el.style.setProperty('--y', `${pos.current.y}px`)
    }})
    gsap.to(fadeRef.current, { opacity: 0, duration: .2, overwrite: true })
  }

  return <div ref={rootRef} className={`chroma-grid ${className}`.trim()} style={{ '--r': `${radius}px` } as React.CSSProperties} onPointerMove={move} onPointerLeave={() => gsap.to(fadeRef.current, { opacity: 1, duration: fadeOut, overwrite: true })}>
    {items.map((item, index) => <article key={item.title} className="chroma-card" style={{ '--card-border': item.borderColor || '#dedbc8', '--card-gradient': item.gradient || 'linear-gradient(145deg,#26251f,#080808)' } as React.CSSProperties} onPointerMove={event => {
      const rect = event.currentTarget.getBoundingClientRect()
      event.currentTarget.style.setProperty('--mouse-x', `${event.clientX - rect.left}px`)
      event.currentTarget.style.setProperty('--mouse-y', `${event.clientY - rect.top}px`)
    }}>
      <div className="chroma-img" role="img" aria-label={item.title} style={{ backgroundImage: `url(${item.image})`, backgroundPosition: item.imagePosition || ['left','center','right'][index % 3] }}/>
      <footer className="chroma-info"><div><p className="chroma-eyebrow">{item.eyebrow}</p><h3>{item.title}</h3></div>{item.handle && <span className="chroma-handle">{item.handle}</span>}<p className="chroma-role">{item.subtitle}</p><span className="chroma-index">0{index + 1}</span></footer>
    </article>)}
    <div className="chroma-overlay"/><div ref={fadeRef} className="chroma-fade"/>
  </div>
}
