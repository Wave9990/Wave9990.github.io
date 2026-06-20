import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { gsap } from 'gsap'
import './PillNav.css'

export type PillNavItem = { label: string; href: string; ariaLabel?: string }

type PillNavProps = {
  logo?: string
  logoAlt?: string
  items: PillNavItem[]
  activeHref?: string
  className?: string
  ease?: string
  baseColor?: string
  pillColor?: string
  hoveredPillTextColor?: string
  pillTextColor?: string
  initialLoadAnimation?: boolean
}

export default function PillNav({
  logo,
  logoAlt = 'Logo',
  items,
  activeHref,
  className = '',
  ease = 'power3.out',
  baseColor = '#050505',
  pillColor = '#DEDBC8',
  hoveredPillTextColor = '#DEDBC8',
  pillTextColor = '#080808',
  initialLoadAnimation = true,
}: PillNavProps) {
  const [isOpen, setIsOpen] = useState(false)
  const circleRefs = useRef<(HTMLSpanElement | null)[]>([])
  const timelineRefs = useRef<(gsap.core.Timeline | null)[]>([])
  const tweenRefs = useRef<(gsap.core.Tween | null)[]>([])
  const logoImgRef = useRef<HTMLImageElement | null>(null)
  const logoRef = useRef<HTMLAnchorElement | null>(null)
  const itemsRef = useRef<HTMLDivElement | null>(null)
  const hamburgerRef = useRef<HTMLButtonElement | null>(null)
  const mobileMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const layout = () => {
      circleRefs.current.forEach((circle, index) => {
        if (!circle?.parentElement) return
        const pill = circle.parentElement
        const { width, height } = pill.getBoundingClientRect()
        const radius = ((width * width) / 4 + height * height) / (2 * height)
        const diameter = Math.ceil(2 * radius) + 2
        const delta = Math.ceil(radius - Math.sqrt(Math.max(0, radius * radius - (width * width) / 4))) + 1
        circle.style.width = `${diameter}px`
        circle.style.height = `${diameter}px`
        circle.style.bottom = `-${delta}px`
        gsap.set(circle, { xPercent: -50, scale: 0, transformOrigin: `50% ${diameter - delta}px` })

        const label = pill.querySelector('.pill-label')
        const hoverLabel = pill.querySelector('.pill-label-hover')
        timelineRefs.current[index]?.kill()
        const timeline = gsap.timeline({ paused: true })
        timeline.to(circle, { scale: 1.2, xPercent: -50, duration: 1.4, ease, overwrite: 'auto' }, 0)
        if (label) timeline.to(label, { y: -(height + 8), duration: 1.4, ease, overwrite: 'auto' }, 0)
        if (hoverLabel) {
          gsap.set(hoverLabel, { y: height + 40, opacity: 0 })
          timeline.to(hoverLabel, { y: 0, opacity: 1, duration: 1.4, ease, overwrite: 'auto' }, 0)
        }
        timelineRefs.current[index] = timeline
      })
    }

    layout()
    window.addEventListener('resize', layout)
    document.fonts?.ready.then(layout).catch(() => undefined)
    if (mobileMenuRef.current) gsap.set(mobileMenuRef.current, { visibility: 'hidden', opacity: 0, y: 10 })
    if (initialLoadAnimation) {
      if (logoRef.current) gsap.fromTo(logoRef.current, { scale: 0 }, { scale: 1, duration: .65, ease })
      if (itemsRef.current) gsap.fromTo(itemsRef.current, { width: 0, opacity: 0 }, { width: 'auto', opacity: 1, duration: .75, ease })
    }
    return () => {
      window.removeEventListener('resize', layout)
      timelineRefs.current.forEach(timeline => timeline?.kill())
      tweenRefs.current.forEach(tween => tween?.kill())
    }
  }, [items, ease, initialLoadAnimation])

  const hoverTo = (index: number, progress: 'in' | 'out') => {
    const timeline = timelineRefs.current[index]
    if (!timeline) return
    tweenRefs.current[index]?.kill()
    tweenRefs.current[index] = timeline.tweenTo(progress === 'in' ? timeline.duration() : 0, {
      duration: progress === 'in' ? .32 : .22,
      ease,
      overwrite: 'auto',
    })
  }

  const spinLogo = () => {
    if (!logoImgRef.current) return
    gsap.fromTo(logoImgRef.current, { rotate: 0 }, { rotate: 360, duration: .45, ease, overwrite: 'auto' })
  }

  const toggleMenu = () => {
    const next = !isOpen
    setIsOpen(next)
    const lines = hamburgerRef.current?.querySelectorAll('.hamburger-line')
    if (lines?.length === 2) {
      gsap.to(lines[0], { rotation: next ? 45 : 0, y: next ? 3 : 0, duration: .3, ease })
      gsap.to(lines[1], { rotation: next ? -45 : 0, y: next ? -3 : 0, duration: .3, ease })
    }
    if (mobileMenuRef.current) {
      if (next) {
        gsap.set(mobileMenuRef.current, { visibility: 'visible' })
        gsap.to(mobileMenuRef.current, { opacity: 1, y: 0, duration: .3, ease })
      } else {
        gsap.to(mobileMenuRef.current, { opacity: 0, y: 10, duration: .2, ease, onComplete: () => gsap.set(mobileMenuRef.current, { visibility: 'hidden' }) })
      }
    }
  }

  const closeMenu = () => {
    if (!isOpen) return
    setIsOpen(false)
    const lines = hamburgerRef.current?.querySelectorAll('.hamburger-line')
    if (lines?.length === 2) gsap.to(lines, { rotation: 0, y: 0, duration: .25, ease })
    if (mobileMenuRef.current) gsap.to(mobileMenuRef.current, { opacity: 0, y: 10, duration: .2, ease, onComplete: () => gsap.set(mobileMenuRef.current, { visibility: 'hidden' }) })
  }

  const cssVars = {
    '--base': baseColor,
    '--pill-bg': pillColor,
    '--hover-text': hoveredPillTextColor,
    '--pill-text': pillTextColor,
  } as CSSProperties

  return <div className="pill-nav-container">
    <nav className={`pill-nav ${className}`} aria-label="主导航" style={cssVars}>
      {logo && <a ref={logoRef} className="pill-logo" href="#top" aria-label="唯吾首页" onMouseEnter={spinLogo}>
        <img ref={logoImgRef} src={logo} alt={logoAlt}/>
      </a>}
      <div className="pill-nav-items desktop-only" ref={itemsRef}>
        <ul className="pill-list" role="menubar">{items.map((item,index) => <li key={item.href} role="none"><a role="menuitem" href={item.href} className={`pill${activeHref === item.href ? ' is-active' : ''}`} aria-label={item.ariaLabel || item.label} onMouseEnter={() => hoverTo(index,'in')} onMouseLeave={() => hoverTo(index,'out')}><span className="hover-circle" aria-hidden="true" ref={node => { circleRefs.current[index] = node }}/><span className="label-stack"><span className="pill-label">{item.label}</span><span className="pill-label-hover" aria-hidden="true">{item.label}</span></span></a></li>)}</ul>
      </div>
      <button ref={hamburgerRef} className="mobile-menu-button mobile-only" onClick={toggleMenu} aria-label="打开菜单" aria-expanded={isOpen}><span className="hamburger-line"/><span className="hamburger-line"/></button>
    </nav>
    <div ref={mobileMenuRef} className="mobile-menu-popover mobile-only" style={cssVars}>
      <ul className="mobile-menu-list">{items.map(item => <li key={item.href}><a href={item.href} className={`mobile-menu-link${activeHref === item.href ? ' is-active' : ''}`} onClick={closeMenu}>{item.label}</a></li>)}</ul>
    </div>
  </div>
}
