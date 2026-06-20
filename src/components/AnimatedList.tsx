import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type UIEvent } from 'react'
import { motion, useInView } from 'motion/react'
import './AnimatedList.css'

type AnimatedItemProps = {
  children: ReactNode
  delay?: number
  index: number
  selected: boolean
  onMouseEnter: () => void
  onClick: () => void
}

function AnimatedItem({children,delay=0,index,selected,onMouseEnter,onClick}:AnimatedItemProps){
  const ref=useRef<HTMLButtonElement|null>(null)
  const inView=useInView(ref,{amount:.35,once:false})
  return <motion.button ref={ref} type="button" data-index={index} className={`animated-list-item${selected?' is-selected':''}`} onMouseEnter={onMouseEnter} onFocus={onMouseEnter} onClick={onClick} initial={{scale:.92,opacity:0,y:14}} animate={inView?{scale:1,opacity:1,y:0}:{scale:.94,opacity:.2,y:8}} transition={{duration:.35,delay,ease:[.16,1,.3,1]}}>{children}</motion.button>
}

type AnimatedListProps = {
  items:string[]
  onItemSelect?:(item:string,index:number)=>void
  showGradients?:boolean
  enableArrowNavigation?:boolean
  className?:string
  displayScrollbar?:boolean
  initialSelectedIndex?:number
}

function splitEmphasis(item:string){
  const index=Math.max(item.lastIndexOf('，'),item.lastIndexOf('：'))
  if(index<0) return {lead:'',emphasis:item}
  return {lead:item.slice(0,index+1),emphasis:item.slice(index+1)}
}

export default function AnimatedList({items,onItemSelect,showGradients=true,enableArrowNavigation=true,className='',displayScrollbar=true,initialSelectedIndex=0}:AnimatedListProps){
  const listRef=useRef<HTMLDivElement|null>(null)
  const [selectedIndex,setSelectedIndex]=useState(initialSelectedIndex)
  const [topGradientOpacity,setTopGradientOpacity]=useState(0)
  const [bottomGradientOpacity,setBottomGradientOpacity]=useState(1)

  const select=useCallback((item:string,index:number)=>{setSelectedIndex(index);onItemSelect?.(item,index)},[onItemSelect])
  const handleScroll=useCallback((event:UIEvent<HTMLDivElement>)=>{const {scrollTop,scrollHeight,clientHeight}=event.currentTarget;setTopGradientOpacity(Math.min(scrollTop/45,1));const bottom=scrollHeight-(scrollTop+clientHeight);setBottomGradientOpacity(scrollHeight<=clientHeight?0:Math.min(bottom/45,1))},[])
  const handleKeyDown=(event:KeyboardEvent<HTMLDivElement>)=>{
    if(!enableArrowNavigation) return
    if(event.key==='ArrowDown'){event.preventDefault();setSelectedIndex(value=>Math.min(value+1,items.length-1))}
    else if(event.key==='ArrowUp'){event.preventDefault();setSelectedIndex(value=>Math.max(value-1,0))}
    else if(event.key==='Enter'&&selectedIndex>=0){event.preventDefault();onItemSelect?.(items[selectedIndex],selectedIndex)}
  }
  useEffect(()=>{
    if(selectedIndex<0||!listRef.current) return
    const selected=listRef.current.querySelector<HTMLElement>(`[data-index="${selectedIndex}"]`)
    selected?.scrollIntoView({block:'nearest',behavior:'smooth'})
  },[selectedIndex])

  return <div className={`animated-list-container ${className}`}>
    <div ref={listRef} className={`animated-list-scroll${displayScrollbar?'':' no-scrollbar'}`} onScroll={handleScroll} onKeyDown={handleKeyDown} tabIndex={0} aria-label="装修新媒体常见问题">
      {items.map((item,index)=>{const {lead,emphasis}=splitEmphasis(item);return <AnimatedItem key={item} index={index} selected={selectedIndex===index} delay={(index%4)*.04} onMouseEnter={()=>setSelectedIndex(index)} onClick={()=>select(item,index)}><span className="animated-item-number">{String(index+1).padStart(2,'0')}</span><span className="animated-item-copy"><span>{lead}</span><strong>{emphasis}</strong></span><span className="animated-item-marker"/></AnimatedItem>})}
    </div>
    {showGradients&&<><div className="animated-list-gradient top" style={{opacity:topGradientOpacity}}/><div className="animated-list-gradient bottom" style={{opacity:bottomGradientOpacity}}/></>}
  </div>
}
