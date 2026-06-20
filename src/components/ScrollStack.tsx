import { Children, cloneElement, isValidElement, useEffect, useRef } from 'react'
import Lenis from 'lenis'
import './ScrollStack.css'

type ItemProps = { children: React.ReactNode; itemClassName?: string; style?: React.CSSProperties }

export function ScrollStackItem({ children, itemClassName = '', style }: ItemProps) {
  return <article className={`scroll-stack-card ${itemClassName}`.trim()} style={style}>{children}</article>
}

type Props = {
  children: React.ReactNode
  className?: string
  itemDistance?: number
  itemScale?: number
  itemStackDistance?: number
  stackPosition?: string
  blurAmount?: number
  rotationAmount?: number
}

export default function ScrollStack({
  children,
  className = '',
  itemDistance = 96,
  itemScale = .025,
  itemStackDistance = 18,
  stackPosition = '12vh',
  blurAmount = 1.2,
  rotationAmount = .18,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const cards = Array.from(root.querySelectorAll<HTMLElement>('.scroll-stack-card'))
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0

    const update = () => {
      raf = 0
      if (reduceMotion) return
      const viewport = window.innerHeight
      cards.forEach((card, index) => {
        const rect = card.getBoundingClientRect()
        const trigger = viewport * .16 + index * itemStackDistance
        const progress = Math.max(0, Math.min(1, (trigger - rect.top) / (viewport * .32)))
        const scale = 1 - progress * Math.max(0, (cards.length - index - 1) * itemScale)
        const blur = progress * Math.max(0, cards.length - index - 1) * blurAmount
        const rotate = progress * (index - 2) * rotationAmount
        card.style.transform = `scale(${scale}) rotate(${rotate}deg)`
        card.style.filter = blur > .1 ? `blur(${blur}px)` : 'none'
        card.style.opacity = String(1 - progress * Math.min(.34, (cards.length - index - 1) * .07))
      })
    }
    const requestUpdate = () => { if (!raf) raf = requestAnimationFrame(update) }
    const lenis = reduceMotion ? null : new Lenis({ duration: 1.05, smoothWheel: true, syncTouch: false })
    let lenisRaf = 0
    const animate = (time: number) => {
      lenis?.raf(time)
      requestUpdate()
      lenisRaf = requestAnimationFrame(animate)
    }
    if (lenis) lenisRaf = requestAnimationFrame(animate)
    window.addEventListener('resize', requestUpdate)
    window.addEventListener('scroll', requestUpdate, { passive: true })
    update()
    return () => {
      window.removeEventListener('resize', requestUpdate)
      window.removeEventListener('scroll', requestUpdate)
      cancelAnimationFrame(raf)
      cancelAnimationFrame(lenisRaf)
      lenis?.destroy()
    }
  }, [itemScale, itemStackDistance, blurAmount, rotationAmount])

  return <div ref={rootRef} className={`scroll-stack ${className}`.trim()} style={{ '--stack-top': stackPosition, '--stack-gap': `${itemDistance}px` } as React.CSSProperties}>
    {Children.map(children, (child, index) => isValidElement<ItemProps>(child)
      ? cloneElement(child, { style: { ...child.props.style, '--stack-index': index, '--stack-offset': `${index * itemStackDistance}px`, '--stack-mobile-offset': `${index * 10}px` } as React.CSSProperties })
      : child)}
  </div>
}
