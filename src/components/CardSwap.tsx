import { Children, cloneElement, createRef, forwardRef, isValidElement, useEffect, useMemo, useRef, type HTMLAttributes, type ReactElement, type ReactNode, type RefAttributes } from 'react'
import { gsap } from 'gsap'
import './CardSwap.css'

type CardProps = HTMLAttributes<HTMLDivElement> & { customClass?: string }
type CardElementProps = CardProps & RefAttributes<HTMLDivElement>

export const Card = forwardRef<HTMLDivElement, CardProps>(({ customClass = '', className = '', ...rest }, ref) => (
  <div ref={ref} {...rest} className={`card-swap-card ${customClass} ${className}`.trim()}/>
))
Card.displayName = 'Card'

type CardSwapProps = {
  width?: number | string
  height?: number | string
  cardDistance?: number
  verticalDistance?: number
  delay?: number
  pauseOnHover?: boolean
  onCardClick?: (index: number) => void
  skewAmount?: number
  easing?: 'linear' | 'elastic'
  children: ReactNode
}

const makeSlot = (index: number, distanceX: number, distanceY: number, total: number) => ({
  x: index * distanceX,
  y: -index * distanceY,
  z: -index * distanceX * 1.5,
  zIndex: total - index,
})

export default function CardSwap({
  width = 500,
  height = 560,
  cardDistance = 42,
  verticalDistance = 48,
  delay = 4200,
  pauseOnHover = true,
  onCardClick,
  skewAmount = 4,
  easing = 'elastic',
  children,
}: CardSwapProps) {
  const config = easing === 'elastic'
    ? { ease:'elastic.out(.6,.9)', drop:1.45, move:1.35, back:1.45, overlap:.86, returnDelay:.06 }
    : { ease:'power1.inOut', drop:.7, move:.7, back:.7, overlap:.45, returnDelay:.18 }
  const childArray = useMemo(() => Children.toArray(children).filter(isValidElement) as ReactElement<CardElementProps>[], [children])
  const refs = useMemo(() => childArray.map(() => createRef<HTMLDivElement>()), [childArray.length])
  const orderRef = useRef(Array.from({length:childArray.length},(_,index)=>index))
  const timelineRef = useRef<gsap.core.Timeline | null>(null)
  const intervalRef = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const total = refs.length
    refs.forEach((ref,index) => {
      const slot = makeSlot(index,cardDistance,verticalDistance,total)
      if (ref.current) gsap.set(ref.current,{...slot,xPercent:-50,yPercent:-50,skewY:skewAmount,transformOrigin:'center center',force3D:true})
    })
    const swap = () => {
      if(orderRef.current.length < 2) return
      const [front,...rest] = orderRef.current
      const frontElement = refs[front].current
      if(!frontElement) return
      const timeline = gsap.timeline()
      timelineRef.current = timeline
      timeline.to(frontElement,{y:'+=540',duration:config.drop,ease:config.ease})
      timeline.addLabel('promote',`-=${config.drop * config.overlap}`)
      rest.forEach((index,position) => {
        const element = refs[index].current
        if(!element) return
        const slot = makeSlot(position,cardDistance,verticalDistance,total)
        timeline.set(element,{zIndex:slot.zIndex},'promote')
        timeline.to(element,{x:slot.x,y:slot.y,z:slot.z,duration:config.move,ease:config.ease},`promote+=${position * .1}`)
      })
      const backSlot = makeSlot(total-1,cardDistance,verticalDistance,total)
      timeline.addLabel('return',`promote+=${config.move * config.returnDelay}`)
      timeline.set(frontElement,{zIndex:backSlot.zIndex},'return')
      timeline.to(frontElement,{x:backSlot.x,y:backSlot.y,z:backSlot.z,duration:config.back,ease:config.ease},'return')
      timeline.call(() => {orderRef.current=[...rest,front]})
    }
    intervalRef.current = window.setInterval(swap,delay)
    const container = containerRef.current
    const pause = () => {timelineRef.current?.pause();if(intervalRef.current) window.clearInterval(intervalRef.current)}
    const resume = () => {timelineRef.current?.play();intervalRef.current=window.setInterval(swap,delay)}
    if(pauseOnHover && container){container.addEventListener('mouseenter',pause);container.addEventListener('mouseleave',resume)}
    return () => {
      if(intervalRef.current) window.clearInterval(intervalRef.current)
      timelineRef.current?.kill()
      if(container){container.removeEventListener('mouseenter',pause);container.removeEventListener('mouseleave',resume)}
    }
  },[cardDistance,verticalDistance,delay,pauseOnHover,skewAmount,easing,refs,config.back,config.drop,config.ease,config.move,config.overlap,config.returnDelay])

  const rendered = childArray.map((child,index) => cloneElement(child,{
    key:index,
    ref:refs[index],
    style:{width,height,...child.props.style},
    onClick:(event:React.MouseEvent<HTMLDivElement>) => {child.props.onClick?.(event);onCardClick?.(index)},
  }))

  return <div ref={containerRef} className="card-swap-container" style={{width,height}}>{rendered}</div>
}
