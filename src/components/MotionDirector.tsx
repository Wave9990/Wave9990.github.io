import { useLayoutEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './MotionDirector.css'

gsap.registerPlugin(ScrollTrigger)
let activeOpeningTimeline: gsap.core.Timeline | null = null

export default function MotionDirector() {
  const overlayRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const overlay = overlayRef.current
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const shouldPlayOpening = !window.location.hash || window.location.hash === '#top'
    if (reduceMotion) {
      if (overlay) overlay.style.display = 'none'
      return
    }
    if (!shouldPlayOpening && overlay) overlay.style.display = 'none'

    const previousOverflow = document.body.style.overflow
    if (shouldPlayOpening) document.body.style.overflow = 'hidden'
    const safetyTimer = shouldPlayOpening ? window.setTimeout(() => {
      document.body.style.overflow = previousOverflow
      if (overlay) overlay.style.display = 'none'
      gsap.set('[data-hero-line],[data-hero-copy],[data-hero-eyebrow],[data-hero-stat],.pill-nav-container,.brand-lanyard', { clearProps:'transform,opacity,visibility' })
    }, 8000) : 0
    let context: gsap.Context | null = null
    const startFrame = window.requestAnimationFrame(() => {
      context = gsap.context(() => {
      activeOpeningTimeline?.kill()
      const opening = shouldPlayOpening ? gsap.timeline({
        defaults: { ease: 'power4.out' },
        onComplete: () => {
          window.clearTimeout(safetyTimer)
          document.body.style.overflow = previousOverflow
          if (overlay) overlay.style.display = 'none'
          ScrollTrigger.refresh()
          if (import.meta.env.DEV) console.info('[motion-audit]', { opening:'complete', scrollUnlocked:document.body.style.overflow !== 'hidden', scrollTriggers:ScrollTrigger.getAll().length })
        },
      }) : null
      activeOpeningTimeline = opening

      if (opening) {
        gsap.set('[data-hero-line]', { yPercent: 125, rotate: 2.5, transformOrigin: '0% 100%' })
        gsap.set('[data-hero-copy]', { y: 54, autoAlpha: 0 })
        gsap.set('[data-hero-eyebrow]', { scaleX: 0, transformOrigin: 'left center' })
        gsap.set('[data-hero-stat]', { y: 85, scaleY: .72, autoAlpha: 0, transformOrigin: 'bottom center' })
        gsap.set('.pill-nav-container,.brand-lanyard', { y: -46, autoAlpha: 0 })
        opening
          .fromTo('.opening-mark', { scale: .55, rotate: -9, autoAlpha: 0 }, { scale: 1, rotate: 0, autoAlpha: 1, duration: 1.05 })
          .fromTo('.opening-kicker', { y: 28, clipPath: 'inset(0 0 100% 0)' }, { y: 0, clipPath: 'inset(0 0 0% 0)', duration: .9 }, '-=.55')
          .fromTo('.opening-rule', { scaleX: 0 }, { scaleX: 1, duration: .85, transformOrigin: 'left center' }, '-=.55')
          .to('.opening-mark,.opening-kicker,.opening-rule', { y: -22, autoAlpha: 0, duration: .65, ease: 'power3.in' }, '+=.28')
          .to('.opening-panel', { yPercent: -102, duration: 1.35, stagger: .1, ease: 'expo.inOut' }, '-=.12')
          .to(overlay, { autoAlpha: 0, duration: .22 }, '-=.2')
          .to('.pill-nav-container,.brand-lanyard', { y: 0, autoAlpha: 1, duration: 1.05, stagger: .08 }, '-=.72')
          .to('[data-hero-eyebrow]', { scaleX: 1, duration: 1.05 }, '-=.84')
          .to('[data-hero-line]', { yPercent: 0, rotate: 0, duration: 1.45, stagger: .16, ease: 'expo.out' }, '-=.85')
          .to('[data-hero-copy]', { y: 0, autoAlpha: 1, duration: 1.15 }, '-=.88')
          .to('[data-hero-stat]', { y: 0, scaleY: 1, autoAlpha: 1, duration: 1.2, stagger: .1 }, '-=.92')
      }

      document.querySelectorAll<HTMLElement>('[data-motion-group]').forEach(group => {
        const cards = Array.from(group.querySelectorAll<HTMLElement>(':scope > [data-motion-card]'))
        if (!cards.length) return
        ScrollTrigger.create({ trigger:group, start:'top 84%', once:true, onEnter:() => {
          gsap.fromTo(cards,
            { y: 105, scaleX: .94, scaleY: .76, clipPath: 'inset(18% 0 42% 0 round 24px)', transformOrigin: 'bottom center' },
            { y: 0, scaleX: 1, scaleY: 1, clipPath: 'inset(0% 0 0% 0 round 0px)', duration: 1.45, stagger: .11, ease: 'expo.out', clearProps: 'transform,clipPath' },
          )
        }})
      })

      document.querySelectorAll<HTMLElement>('main section h2').forEach(title => {
        const kicker = title.parentElement?.querySelector<HTMLElement>(':scope > p')
        ScrollTrigger.create({ trigger:title, start:'top 87%', once:true, onEnter:() => {
          gsap.fromTo(title,
            { yPercent: 48, skewY: 2.8, clipPath: 'inset(0 0 100% 0)', transformOrigin: 'left bottom' },
            { yPercent: 0, skewY: 0, clipPath: 'inset(0 0 0% 0)', duration: 1.55, ease: 'expo.out', clearProps: 'transform,clipPath' },
          )
          if (!kicker) return
          gsap.fromTo(kicker,
            { x: -28, autoAlpha: 0, letterSpacing: '.42em' },
            { x: 0, autoAlpha: 1, letterSpacing: getComputedStyle(kicker).letterSpacing, duration: 1.15, delay: .08, ease: 'power4.out', clearProps: 'transform,opacity,visibility,letterSpacing' },
          )
        }})
      })

      document.querySelectorAll<HTMLElement>('[data-parallax]').forEach(media => {
        gsap.fromTo(media, { yPercent: -4 }, { yPercent: 4, ease: 'none', scrollTrigger: { trigger: media, start: 'top bottom', end: 'bottom top', scrub: 1.25 } })
      })

      const heroMedia = document.querySelector<HTMLElement>('[data-hero-media]')
      if (heroMedia) {
        gsap.fromTo(heroMedia, { scale: 1.08, yPercent: -1.5 }, { scale: 1.15, yPercent: 7, ease: 'none', scrollTrigger: { trigger: '#top', start: 'top top', end: 'bottom top', scrub: 1.4 } })
      }
      })
    })

    return () => {
      window.cancelAnimationFrame(startFrame)
      window.clearTimeout(safetyTimer)
      document.body.style.overflow = previousOverflow
      if (activeOpeningTimeline) {
        activeOpeningTimeline.kill()
        activeOpeningTimeline = null
      }
      context?.revert()
    }
  }, [])

  return <div ref={overlayRef} className="opening-overlay" aria-hidden="true">
    <div className="opening-panels"><div className="opening-panel"/><div className="opening-panel"/><div className="opening-panel"/><div className="opening-panel"/></div>
    <div className="opening-center">
      <div className="opening-mark">吾</div>
      <div className="opening-rule"/>
      <p className="opening-kicker">WEIWU · RENOVATION IP STUDIO</p>
    </div>
    <div className="opening-index">00 — 08</div>
  </div>
}
