import { memo, useEffect, useRef, type PointerEvent } from 'react'
import { ArrowUpRight } from 'lucide-react'
import './ProfileCard.css'

type ProfileCardProps = {
  imageUrl: string
  name: string
  handle: string
  stats: string[]
  index: number
  enableTilt?: boolean
  onClick?: () => void
}

const clamp = (value: number, min = 0, max = 100) => Math.min(Math.max(value, min), max)

function ProfileCardComponent({ imageUrl, name, handle, stats, index, enableTilt = true, onClick }: ProfileCardProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const shellRef = useRef<HTMLDivElement | null>(null)
  const frameRef = useRef<number | null>(null)
  const currentRef = useRef({ x: 50, y: 50 })
  const targetRef = useRef({ x: 50, y: 50 })

  const applyVars = (x: number, y: number) => {
    const wrapper = wrapperRef.current
    if (!wrapper) return
    const centerX = x - 50
    const centerY = y - 50
    wrapper.style.setProperty('--pointer-x', `${x}%`)
    wrapper.style.setProperty('--pointer-y', `${y}%`)
    wrapper.style.setProperty('--background-x', `${35 + x * .3}%`)
    wrapper.style.setProperty('--background-y', `${35 + y * .3}%`)
    wrapper.style.setProperty('--pointer-distance', `${clamp(Math.hypot(centerX, centerY) / 50, 0, 1)}`)
    wrapper.style.setProperty('--rotate-x', `${-(centerY / 7)}deg`)
    wrapper.style.setProperty('--rotate-y', `${centerX / 8}deg`)
  }

  const animate = () => {
    const current = currentRef.current
    const target = targetRef.current
    current.x += (target.x - current.x) * .12
    current.y += (target.y - current.y) * .12
    applyVars(current.x, current.y)
    if (Math.abs(target.x - current.x) > .05 || Math.abs(target.y - current.y) > .05) {
      frameRef.current = requestAnimationFrame(animate)
    } else frameRef.current = null
  }

  const setTarget = (x: number, y: number) => {
    targetRef.current = { x, y }
    if (frameRef.current === null) frameRef.current = requestAnimationFrame(animate)
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!enableTilt || !shellRef.current || window.matchMedia('(pointer: coarse), (hover: none)').matches) return
    const rect = shellRef.current.getBoundingClientRect()
    setTarget(clamp(((event.clientX - rect.left) / rect.width) * 100), clamp(((event.clientY - rect.top) / rect.height) * 100))
  }

  const onPointerEnter = () => shellRef.current?.classList.add('active')
  const onPointerLeave = () => {
    setTarget(50, 50)
    shellRef.current?.classList.remove('active')
  }

  useEffect(() => () => { if (frameRef.current !== null) cancelAnimationFrame(frameRef.current) }, [])

  return <div ref={wrapperRef} className="profile-card-wrapper">
    <div className="profile-card-behind"/>
    <div ref={shellRef} className="profile-card-shell" onPointerMove={onPointerMove} onPointerEnter={onPointerEnter} onPointerLeave={onPointerLeave}>
      <button className="profile-card" type="button" onClick={onClick} aria-label={`查看${name}案例详情`}>
        <div className="profile-card-media"><img src={imageUrl} alt={`${name}账号主页`} loading={index <= 2 ? 'eager' : 'lazy'} fetchPriority={index <= 2 ? 'high' : 'low'} decoding="async" width="720" height="1561"/></div>
        <div className="profile-card-shine"/>
        <div className="profile-card-glare"/>
        <div className="profile-card-gradient"/>
        <div className="profile-card-index">CASE {String(index).padStart(2,'0')}</div>
        <div className="profile-card-copy">
          <p>{handle}</p>
          <h3>{name}</h3>
          <div className="profile-card-stats">{stats.map(stat => <span key={stat}>{stat}</span>)}</div>
        </div>
        <span className="profile-card-open"><ArrowUpRight size={16}/></span>
      </button>
    </div>
  </div>
}

export default memo(ProfileCardComponent)
