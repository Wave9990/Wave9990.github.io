import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion'
import { ArrowDownRight, ArrowRight, ArrowUpRight, Check, X } from 'lucide-react'
import PillNav from './components/PillNav'
import ProfileCard from './components/ProfileCard'
import GlitchText from './components/GlitchText'
import CardSwap, { Card } from './components/CardSwap'
import AnimatedList from './components/AnimatedList'
import ScrollStack, { ScrollStackItem } from './components/ScrollStack'
import ChromaGrid from './components/ChromaGrid'
import MotionDirector from './components/MotionDirector'
import BrandLanyardFallback from './components/BrandLanyardFallback'
import BrandMotionBoundary from './components/BrandMotionBoundary'

const BrandLanyard = lazy(() => import('./components/BrandLanyard'))

const ease = [0.16, 1, 0.3, 1] as const

type NavigatorWithHints = Navigator & {
  deviceMemory?: number
  connection?: { saveData?: boolean }
}

function prefersLiteExperience() {
  const nav = navigator as NavigatorWithHints
  return window.innerWidth < 1100
    || window.matchMedia('(pointer: coarse), (hover: none), (prefers-reduced-motion: reduce)').matches
    || Boolean(nav.connection?.saveData)
    || (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 4)
    || (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 4)
}

function Reveal({ children, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  return <div data-section-reveal className={className}>{children}</div>
}

function RestoreInitialHash() {
  useEffect(() => {
    const id = window.location.hash.slice(1)
    if (!id || id === 'top') return
    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(id)
      if (!target) return
      const previousBehavior = document.documentElement.style.scrollBehavior
      document.documentElement.style.scrollBehavior = 'auto'
      target.scrollIntoView({ block: 'start', behavior: 'auto' })
      window.requestAnimationFrame(() => { document.documentElement.style.scrollBehavior = previousBehavior })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [])
  return null
}

function Header() {
  const [activeHref, setActiveHref] = useState(() => window.location.hash || '#top')
  const [brandMode,setBrandMode] = useState<'mark'|'webgl'|'fallback'>('mark')
  const items = [
    {label:'首页',href:'#top'},
    {label:'为什么没客户',href:'#problems'},
    {label:'我们怎么帮你',href:'#about'},
    {label:'真实案例',href:'#cases'},
    {label:'真实反馈',href:'#feedback'},
    {label:'合作方式',href:'#services'},
    {label:'联系我们',href:'#contact'},
  ]
  useEffect(() => {
    const syncHash = () => setActiveHref(window.location.hash || '#top')
    window.addEventListener('hashchange', syncHash)
    return () => window.removeEventListener('hashchange', syncHash)
  }, [])
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        if (prefersLiteExperience()) {
          setBrandMode('fallback')
          return
        }
        const canvas = document.createElement('canvas')
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
        setBrandMode(gl ? 'webgl' : 'fallback')
      } catch {
        setBrandMode('fallback')
      }
    }, 3400)
    return () => window.clearTimeout(timer)
  },[])
  const brandFallback = <a href="#top" aria-label="唯吾首页" className="fixed left-4 top-4 z-[100] grid h-14 w-14 place-items-center rounded-full border border-white/10 bg-black/80 p-1 shadow-2xl"><img src="/weiwu-mark.svg" alt="唯吾" className="h-full w-full"/></a>
  return <>{brandMode==='webgl'?<BrandMotionBoundary fallback={<BrandLanyardFallback/>}><Suspense fallback={brandFallback}><BrandLanyard/></Suspense></BrandMotionBoundary>:brandMode==='fallback'?<BrandLanyardFallback/>:brandFallback}<PillNav className="no-logo" logo="" logoAlt="唯吾" items={items} activeHref={activeHref} baseColor="#050505" pillColor="#DEDBC8" hoveredPillTextColor="#DEDBC8" pillTextColor="#080808" initialLoadAnimation/></>
}

function Hero() {
  return <section id="top" className="min-h-screen p-3 md:p-5">
    <div className="relative flex min-h-[calc(100vh-24px)] overflow-hidden rounded-[26px] border border-white/10 bg-[#12110f] md:min-h-[calc(100vh-40px)] md:rounded-[38px]">
      <HeroMedia />
      <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/20 to-black/80" />
      <div className="absolute inset-0 bg-grid opacity-55 mix-blend-overlay" />
      <div className="absolute -right-24 top-[-15%] h-[620px] w-[620px] rounded-full bg-[#836f4c]/20 blur-[120px]" />
      <div className="absolute bottom-[-30%] left-[18%] h-[520px] w-[520px] rounded-full bg-[#4e5b48]/20 blur-[140px]" />
      <div className="noise-overlay pointer-events-none absolute inset-0 mix-blend-overlay opacity-35" />
      <div className="relative z-10 mt-auto w-full px-5 pb-7 pt-32 sm:px-8 md:px-12 md:pb-12 lg:px-16">
        <div data-hero-eyebrow className="mb-8 flex items-center gap-3 text-[10px] uppercase tracking-[.2em] text-primary/55"><span className="h-px w-10 bg-primary/50"/>唯吾｜装修行业 IP 运营与内容获客服务商</div>
        <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <h1 className="text-balance text-[12vw] font-medium leading-[.92] tracking-[-.07em] text-[#e1e0cc] sm:text-[9.5vw] lg:text-[6.2vw] xl:text-[5.8vw]"><div data-hero-line-wrap><span data-hero-line className="block">把你的装修专业</span></div><div data-hero-line-wrap><span data-hero-line className="block"><GlitchText className="font-serif italic font-normal tracking-[-.035em] text-[#bcae8a]">变成持续获客的个人 IP</GlitchText></span></div></h1>
          </div>
          <div data-hero-copy className="lg:col-span-4 lg:pb-2">
            <p className="max-w-lg text-sm font-light leading-7 text-primary/65 md:text-base">专注装修行业，从账号定位、选题拍摄到投流、直播与成交复盘，陪你搭建一套可持续、可追踪、可复制的新媒体获客系统。</p>
            <div className="mt-5 flex flex-wrap gap-2">{['装企老板','设计师','家装顾问','新媒体团队'].map(item => <span key={item} className="rounded-full border border-primary/15 bg-black/10 px-3 py-1.5 text-[10px] text-primary/55 backdrop-blur-sm">{item}</span>)}</div>
            <p className="mt-4 text-xs font-medium text-primary/90">不教网红玩法，专做获客玩法。</p>
            <div className="mt-7 flex flex-wrap items-center gap-3"><a href="#services" className="group flex items-center gap-5 rounded-full bg-primary py-2 pl-5 pr-2 text-sm font-semibold text-black transition hover:gap-7">查看合作方式<span className="grid h-10 w-10 place-items-center rounded-full bg-black text-primary"><ArrowDownRight size={18}/></span></a><a href="#contact" className="px-4 py-3 text-sm text-primary/60 transition hover:text-primary">预约 1 对 1 诊断</a></div>
          </div>
        </div>
        <div className="mt-12 grid grid-cols-2 gap-2 border-t border-primary/15 pt-5 sm:grid-cols-4 md:mt-16 md:max-w-4xl">
          {[
            {value:'1.5亿+',label:'陪跑项目累计产值',featured:true},
            {value:'2年',label:'装修项目深度陪跑'},
            {value:'100+',label:'持续运营账号样本'},
            {value:'15+',label:'年产值500万+账号'},
          ].map((item,index) => <div data-hero-stat key={item.label} className={`group relative min-h-[112px] overflow-hidden rounded-2xl border px-4 py-4 backdrop-blur-xl transition duration-500 hover:-translate-y-1 ${item.featured ? 'border-primary/35 bg-primary/[.13] shadow-[0_18px_55px_rgba(188,174,138,.16)] sm:-translate-y-2' : 'border-white/10 bg-black/25 shadow-[0_14px_40px_rgba(0,0,0,.2)]'}`}>
            <div className="absolute -right-5 -top-8 h-20 w-20 rounded-full bg-primary/10 blur-2xl transition group-hover:bg-primary/20"/>
            <div className="relative flex h-full flex-col justify-between"><div className="flex items-center justify-between"><span className="text-[8px] tracking-[.18em] text-primary/25">0{index+1}</span>{item.featured&&<span className="rounded-full bg-primary px-2 py-1 text-[8px] font-semibold text-black">核心结果</span>}</div><div><div className={`font-semibold tracking-[-.045em] ${item.featured ? 'text-3xl text-primary md:text-4xl' : 'text-2xl text-primary/90 md:text-3xl'}`}>{item.value}</div><div className="mt-1 text-[10px] leading-4 text-primary/45 md:text-xs">{item.label}</div></div></div>
            <div className={`absolute bottom-0 left-0 h-px transition-all duration-500 group-hover:w-full ${item.featured ? 'w-full bg-primary/55' : 'w-8 bg-primary/25'}`}/>
          </div>)}
        </div>
      </div>
    </div>
  </section>
}

function HeroMedia() {
  const [source, setSource] = useState<string | null>(null)
  useEffect(() => {
    const nav = navigator as NavigatorWithHints
    if ((window.location.hash && window.location.hash !== '#top') || nav.connection?.saveData || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const mobile = window.matchMedia('(max-width: 767px), (pointer: coarse)').matches
    let timer = 0
    const loadVideo = () => {
      timer = window.setTimeout(() => setSource(mobile ? '/media/hero-background-mobile.mp4' : '/media/hero-background-desktop.mp4'), mobile ? 900 : 350)
    }
    if (document.readyState === 'complete') loadVideo()
    else window.addEventListener('load', loadVideo, { once: true })
    return () => {
      window.removeEventListener('load', loadVideo)
      window.clearTimeout(timer)
    }
  }, [])
  return <video
    data-hero-media
    className="absolute -left-[2%] -top-[5%] h-[112%] w-[104%] object-cover opacity-55"
    src={source || undefined}
    poster="/media/hero-poster.jpg"
    autoPlay={Boolean(source)}
    loop
    muted
    playsInline
    preload="none"
    disablePictureInPicture
    aria-hidden="true"
  />
}

const workFlow = [
  {n:'01', title:'账号定位', desc:'明确服务人群、差异化人设与账号表达，不再盲目模仿同行。'},
  {n:'02', title:'内容生产', desc:'搭建选题矩阵、拍摄节奏与审核机制，让团队持续产出。'},
  {n:'03', title:'投流放大', desc:'先验证内容，再精准投放本地目标客户，控制线索成本。'},
  {n:'04', title:'线索转化', desc:'用短视频、直播与私域承接，把流量变成咨询和到店。'},
  {n:'05', title:'数据复盘', desc:'跟踪客资与签单结果，每周校准内容、投放和销售配合。'},
]

function WorkflowVisual({ index }: { index: number }) {
  if (index === 0) return <div className="relative mx-auto aspect-square w-full max-w-[280px]">
    {[1, .72, .44].map((scale, i) => <div key={i} className="absolute inset-0 m-auto aspect-square rounded-full border border-primary/15" style={{width:`${scale*100}%`}}/>)}
    <div className="absolute inset-[22%] rounded-full bg-primary/[.08] blur-xl"/><div className="absolute left-1/2 top-1/2 h-px w-[43%] origin-left -rotate-[28deg] bg-primary/35"/>
    {[['本地业主','8%','42%'],['专业判断','59%','17%'],['真实人设','66%','68%']].map(([label,left,top]) => <span key={label} className="absolute rounded-full border border-primary/25 bg-black/60 px-3 py-2 text-[10px] text-primary/70 backdrop-blur" style={{left,top}}>{label}</span>)}
    <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_35px_rgba(222,219,200,.8)]"/>
  </div>
  if (index === 1) return <div className="mx-auto w-full max-w-[360px] space-y-3">{['本地痛点选题','口播脚本审核','现场批量拍摄','多平台持续发布'].map((v,i)=><div key={v} className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-black/35 p-3 backdrop-blur"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/[.09] text-xs text-primary/60">0{i+1}</span><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[.06]"><div className="h-full rounded-full bg-gradient-to-r from-primary/30 to-primary" style={{width:`${48+i*16}%`}}/></div><span className="w-24 text-[11px] text-primary/65">{v}</span></div>)}</div>
  if (index === 2) return <div className="relative mx-auto flex h-[250px] w-full max-w-[360px] items-end justify-center gap-4 rounded-[28px] border border-white/10 bg-black/25 p-7"><div className="absolute left-6 top-5 text-[9px] uppercase tracking-[.22em] text-primary/35">Local traffic amplifier</div>{[24,38,51,69,88].map((h,i)=><div key={h} className="relative flex-1 rounded-t-xl bg-gradient-to-t from-primary/10 to-primary/70" style={{height:`${h}%`}}><span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] text-primary/40">W{i+1}</span></div>)}<div className="absolute right-5 top-5 grid h-16 w-16 place-items-center rounded-full border border-primary/20"><div className="h-8 w-8 rounded-full border border-primary/40"><div className="m-auto mt-[13px] h-1.5 w-1.5 rounded-full bg-primary"/></div></div></div>
  if (index === 3) return <div className="mx-auto w-full max-w-[380px] space-y-2">{[['内容触达','100%'],['有效私信','42%'],['预约到店','18%'],['签约客户','8%']].map(([v,w],i)=><div key={v} className="mx-auto flex h-12 items-center justify-between rounded-xl border border-primary/15 bg-primary/[.06] px-4 text-xs text-primary/65" style={{width:w}}><span className="whitespace-nowrap">{v}</span><span className="font-serif text-primary/35">0{i+1}</span></div>)}<p className="pt-3 text-center text-[10px] tracking-[.18em] text-primary/30">从看见，到信任，再到成交</p></div>
  return <div className="mx-auto w-full max-w-[380px] rounded-[28px] border border-white/10 bg-black/30 p-5"><div className="grid grid-cols-3 gap-2">{[['客资','28'],['到店','11'],['签单','4']].map(([l,v])=><div key={l} className="rounded-xl bg-primary/[.06] p-3"><span className="text-[9px] text-primary/35">{l}</span><strong className="mt-1 block text-2xl text-primary/80">{v}</strong></div>)}</div><svg viewBox="0 0 320 120" className="mt-5 w-full overflow-visible"><defs><linearGradient id="reviewLine" x1="0" x2="1"><stop stopColor="#8c8567"/><stop offset="1" stopColor="#dedbc8"/></linearGradient></defs><path d="M4 102 C42 95 53 79 86 84 S130 62 165 69 S218 38 252 44 S292 17 316 23" fill="none" stroke="url(#reviewLine)" strokeWidth="4" strokeLinecap="round"/><path d="M4 102 C42 95 53 79 86 84 S130 62 165 69 S218 38 252 44 S292 17 316 23 L316 120 L4 120Z" fill="rgba(222,219,200,.06)"/></svg><div className="flex justify-between text-[9px] text-primary/25"><span>内容</span><span>投放</span><span>承接</span><span>成交</span></div></div>
}

const problems = [
  '花了时间做短视频，播放量有但咨询量几乎为零',
  '学了很多“爆款公式”，来的全是同行和无效流量',
  '拍了几十条视频，不知道哪条能带来客户',
  '账号做了半年，签单还是靠老客户转介绍',
  '直播间有人看，但留不住、也转不成客户',
  '团队账号参差不齐，不知道怎么统一管理',
  '投了信息流，成本越来越高，效果越来越差',
  '请了代运营，内容看着不错，却没带来有效客户',
]

function Problems() {
  return <section id="problems" className="px-4 py-24 md:px-8 md:py-36">
    <div className="mx-auto max-w-[1480px]">
      <Reveal className="grid gap-9 lg:grid-cols-12 lg:items-end"><div className="lg:col-span-8"><p className="mb-7 text-[10px] uppercase tracking-[.28em] text-primary/45">The real problem / 01</p><h2 className="max-w-5xl text-balance text-4xl font-medium leading-[1.06] tracking-[-.045em] md:text-6xl lg:text-7xl">装修新媒体做了很久<br/><GlitchText className="font-serif italic font-normal text-primary/45">为什么还是没客户</GlitchText></h2></div><p className="max-w-md text-sm leading-7 text-primary/50 lg:col-span-4">装修是高客单、长决策、强信任的生意。会拍视频，不等于能让本地业主认识你、信任你并主动咨询。</p></Reveal>
      <Reveal className="mt-16 lg:mt-24"><AnimatedList items={problems} showGradients enableArrowNavigation displayScrollbar initialSelectedIndex={0}/></Reveal>
      <Reveal className="mt-5 rounded-2xl bg-primary px-6 py-7 text-black md:flex md:items-center md:justify-between"><p className="text-lg font-semibold md:text-xl">你缺的不是“内容”，而是一套能持续获客、可复制、能跟踪结果的内容系统。</p><ArrowDownRight className="mt-5 opacity-40 md:mt-0"/></Reveal>
    </div>
  </section>
}

function About() {
  const audiences = [
    { image:'/generated/service-people-triptych-v1-optimized.jpg', imagePosition:'left' as const, eyebrow:'Business owner', title:'装修公司老板', handle:'经营者', subtitle:'想把老板个人专业，变成企业稳定获客入口。', borderColor:'#c8a878', gradient:'linear-gradient(145deg,#342c22,#090909)' },
    { image:'/generated/service-people-triptych-v1-optimized.jpg', imagePosition:'center' as const, eyebrow:'Independent designer', title:'设计师老板', handle:'主理人', subtitle:'有作品、有审美，需要让本地客户看见并信任。', borderColor:'#dedbc8', gradient:'linear-gradient(145deg,#35342e,#090909)' },
    { image:'/generated/service-people-triptych-v1-optimized.jpg', imagePosition:'right' as const, eyebrow:'Sales leader', title:'销售团队负责人', handle:'增长者', subtitle:'需要统一内容、线索承接与团队成交动作。', borderColor:'#a79878', gradient:'linear-gradient(145deg,#2b2924,#090909)' },
  ]
  return <section id="about" className="px-4 pb-24 md:px-8 md:pb-36">
    <div className="mx-auto max-w-[1480px]">
      <Reveal className="grid gap-10 lg:grid-cols-12 lg:items-end"><div className="lg:col-span-8"><p className="mb-7 text-[10px] uppercase tracking-[.28em] text-primary/45">What we do / 02</p><h2 className="max-w-5xl text-balance text-4xl font-medium leading-[1.06] tracking-[-.045em] md:text-6xl lg:text-7xl">我们具体<br/><GlitchText className="font-serif italic font-normal text-primary/45">怎么帮你</GlitchText></h2></div><div className="lg:col-span-4"><p className="text-sm leading-7 text-primary/50">我们不会交一套课程就结束，而是围绕获客结果，陪你把定位、内容、流量、承接和复盘一环一环跑通。</p></div></Reveal>
      <ScrollStack className="mt-16 lg:mt-24" itemDistance={88} itemScale={.018} itemStackDistance={18} blurAmount={.45} rotationAmount={.12}>{workFlow.map((item,i) => <ScrollStackItem key={item.n} itemClassName="overflow-hidden rounded-[30px] border border-white/[.09] bg-[radial-gradient(circle_at_78%_35%,rgba(222,219,200,.08),transparent_34%),linear-gradient(135deg,rgba(25,25,23,.96),rgba(11,11,10,.98))] p-6 md:p-9"><div className="absolute inset-0 bg-grid opacity-[.18]"/><div className="relative grid min-h-[360px] gap-10 md:grid-cols-[.85fr_1.15fr] md:items-center"><div className="flex h-full flex-col"><div className="flex items-center justify-between"><span className="font-serif text-5xl italic text-primary/20 md:text-7xl">{item.n}</span><span className="rounded-full border border-primary/15 px-3 py-2 text-[9px] uppercase tracking-[.2em] text-primary/35">System step</span></div><div className="mt-auto"><p className="mb-3 text-[10px] uppercase tracking-[.28em] text-primary/30">{['Positioning','Content Engine','Traffic','Conversion','Review'][i]}</p><h3 className="text-3xl font-semibold tracking-[-.04em] text-primary md:text-5xl">{item.title}</h3><p className="mt-5 max-w-md text-sm leading-7 text-primary/48">{item.desc}</p></div></div><div className="flex min-h-[240px] items-center justify-center rounded-[24px] border border-white/[.06] bg-white/[.018] p-4 shadow-[inset_0_1px_rgba(255,255,255,.04)]"><WorkflowVisual index={i}/></div></div></ScrollStackItem>)}</ScrollStack>
      <Reveal className="mt-24"><div className="mb-8 flex items-end justify-between border-b border-white/[.07] pb-5"><div><p className="text-[9px] uppercase tracking-[.26em] text-primary/30">Who we work with</p><h3 className="mt-3 text-2xl font-semibold tracking-[-.035em] text-primary/85 md:text-4xl">我们更适合陪谁一起做</h3></div><span className="hidden font-serif text-5xl italic text-primary/10 md:block">03</span></div><ChromaGrid items={audiences} radius={300}/></Reveal>
      <Reveal className="mt-5 grid gap-3 lg:grid-cols-[1.15fr_.85fr]"><div className="relative overflow-hidden rounded-[28px] border border-white/[.08] bg-[#11110f] p-6 md:p-8"><div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#8f7f5b]/10 blur-3xl"/><div className="relative flex items-center justify-between"><span className="text-[9px] uppercase tracking-[.24em] text-primary/30">解决问题 / From noise</span><span className="font-serif text-3xl italic text-primary/10">A</span></div><div className="relative mt-9 grid gap-2 sm:grid-cols-3">{[['内容很多','客户很少'],['客资时有','增长不稳'],['团队在做','没有系统']].map(([a,b],i)=><div key={a} className="rounded-2xl border border-white/[.06] bg-black/25 p-4"><span className="text-[9px] text-primary/25">0{i+1}</span><p className="mt-5 text-sm text-primary/40 line-through decoration-primary/20">{a}</p><p className="mt-1 text-lg font-semibold text-primary/75">{b}</p></div>)}</div></div><div className="relative overflow-hidden rounded-[28px] border border-primary/15 bg-primary p-6 text-black md:p-8"><div className="absolute -bottom-16 -right-12 h-48 w-48 rounded-full border-[30px] border-black/[.04]"/><div className="relative flex items-center justify-between"><span className="text-[9px] uppercase tracking-[.24em] text-black/35">最终目标 / To system</span><ArrowUpRight className="h-5 w-5 opacity-30"/></div><p className="relative mt-12 max-w-md text-2xl font-semibold leading-tight tracking-[-.04em] md:text-3xl">让线上内容成为<br/>稳定的获客渠道</p><div className="relative mt-8 flex flex-wrap gap-2">{['可跟踪','可复盘','可复制'].map(v=><span key={v} className="rounded-full border border-black/15 px-3 py-2 text-[10px] font-semibold">{v}</span>)}</div></div></Reveal>
    </div>
  </section>
}

const methods = [
  {n:'01',title:'专业判断型',question:'你懂不懂行？',goal:'建立专业信任',desc:'用清晰的判断替客户降低决策风险，让他先认可你的专业，再愿意进一步咨询。',examples:['材料对比','工艺拆解','报价逻辑','装修避坑'],proof:'客户得到的不是知识点，而是“这个人能替我把关”的确定感。'},
  {n:'02',title:'现场过程型',question:'你真的做过吗？',goal:'证明交付能力',desc:'把看不见的施工能力变成可见证据，证明团队不是只会表达，而是真正在一线解决问题。',examples:['工地实拍','节点验收','现场整改','项目进度'],proof:'用过程证明经验，用细节证明标准，让客户提前看到你的做事方式。'},
  {n:'03',title:'客户结果型',question:'最后能做成什么样？',goal:'给出结果预期',desc:'用真实完成案例和客户反馈，让潜在客户把自己的家代入结果，缩短从观望到咨询的距离。',examples:['完工案例','业主反馈','同楼盘实景','前后对比'],proof:'结果证据越具体，客户越容易相信“你也能把我的家做好”。'},
  {n:'04',title:'真实人设型',question:'这个人靠不靠谱？',goal:'建立人格信任',desc:'让客户看见老板、设计师和团队真实的判断、态度与价值观，完成高客单生意最关键的人格筛选。',examples:['老板日常','团队协作','客户故事','价值观表达'],proof:'客户最终选择的不只是一套方案，而是一群愿意长期托付的人。'},
]

function Method() {
  return <section id="method" className="px-3 py-6 md:px-5">
    <div className="relative overflow-hidden rounded-[26px] border border-white/[.08] bg-[radial-gradient(circle_at_82%_15%,rgba(148,130,91,.13),transparent_28%),linear-gradient(145deg,#151512,#080808_70%)] px-5 py-20 text-primary shadow-[0_35px_120px_rgba(0,0,0,.35)] md:rounded-[38px] md:px-12 md:py-28 lg:px-16">
      <div className="absolute inset-0 bg-grid opacity-[.16]"/><div className="absolute -right-8 -top-12 font-serif text-[32vw] italic leading-none text-primary/[.025]">03</div>
      <div className="relative mx-auto max-w-[1400px]">
        <Reveal className="grid gap-8 lg:grid-cols-12 lg:items-end"><div className="lg:col-span-8"><p className="mb-6 text-[10px] uppercase tracking-[.28em] text-primary/40">Content method / 03</p><h2 className="max-w-4xl text-balance text-4xl font-medium leading-tight tracking-[-.045em] md:text-6xl lg:text-7xl">装修内容不只是拍视频<br/><GlitchText className="font-serif italic font-normal text-primary/45">而是持续建立信任证据</GlitchText></h2></div><p className="max-w-md text-sm leading-7 text-primary/45 lg:col-span-4">客户不会因为一条视频好看就签单。装修内容真正的作用，是让本地业主反复看见你、读懂你、验证你，最后愿意主动找到你。</p></Reveal>

        <Reveal className="mt-16 lg:mt-24"><div className="mb-5 flex items-center justify-between"><div><p className="text-[9px] uppercase tracking-[.24em] text-primary/30">Customer decision path</p><h3 className="mt-2 text-xl font-semibold text-primary/80 md:text-2xl">客户从刷到你，到主动咨询你的五步</h3></div><span className="hidden text-[9px] uppercase tracking-[.18em] text-primary/20 md:block">不是爆款路径，是信任路径</span></div><div data-motion-group className="grid overflow-hidden rounded-[24px] border border-white/[.08] bg-white/[.025] sm:grid-cols-5">{[['01','看见你','本地精准曝光'],['02','看懂你','知道你解决什么'],['03','验证你','看见专业证据'],['04','信任你','认可人和团队'],['05','找到你','私信 · 到店 · 签单']].map(([n,title,desc],i)=><div data-motion-card key={n} className="group relative min-h-[155px] border-b border-white/[.07] p-5 last:border-0 sm:border-b-0 sm:border-r"><div className="flex items-center justify-between"><span className="font-serif text-sm italic text-primary/25">{n}</span>{i<4&&<ArrowRight className="h-3.5 w-3.5 text-primary/15 transition group-hover:translate-x-1"/>}</div><h4 className="mt-9 text-lg font-semibold text-primary/80">{title}</h4><p className="mt-2 text-[10px] text-primary/35">{desc}</p><div className={`absolute bottom-0 left-0 h-px bg-primary/50 transition-all duration-500 ${i===4?'w-full':'w-0 group-hover:w-full'}`}/></div>)}</div></Reveal>

        <div data-motion-group className="mt-16 grid gap-3 lg:grid-cols-2">{methods.map(item => <article data-motion-card key={item.n} className="group relative overflow-hidden rounded-[26px] border border-white/[.08] bg-[#11110f]/90 p-6 transition duration-500 hover:border-primary/20 md:p-8"><div className="absolute -right-8 -top-10 font-serif text-[130px] italic leading-none text-primary/[.025]">{item.n}</div><div className="relative flex items-start justify-between gap-5"><div><span className="text-[9px] uppercase tracking-[.2em] text-primary/28">客户心里在问</span><p className="mt-2 font-serif text-xl italic text-primary/48">“{item.question}”</p></div><span className="shrink-0 rounded-full border border-primary/12 px-3 py-2 text-[9px] text-primary/40">{item.goal}</span></div><div className="relative mt-10 grid gap-8 md:grid-cols-[.8fr_1.2fr]"><div><span className="text-[10px] text-primary/25">{item.n}</span><h3 className="mt-3 text-2xl font-semibold tracking-[-.035em] text-primary/85">{item.title}</h3><p className="mt-4 text-xs leading-6 text-primary/42">{item.desc}</p></div><div className="rounded-2xl border border-white/[.06] bg-black/25 p-4"><span className="text-[9px] uppercase tracking-[.18em] text-primary/25">应该提供的内容证据</span><div className="mt-4 flex flex-wrap gap-2">{item.examples.map(example=><span key={example} className="rounded-full border border-primary/10 bg-primary/[.035] px-3 py-2 text-[9px] text-primary/48">{example}</span>)}</div><p className="mt-5 border-t border-white/[.06] pt-4 text-[11px] leading-6 text-primary/38">{item.proof}</p></div></div></article>)}</div>

        <Reveal className="mt-5 grid gap-3 lg:grid-cols-[1.1fr_.9fr]"><div className="relative overflow-hidden rounded-[26px] border border-primary/15 bg-primary p-6 text-black md:p-8"><div className="absolute -bottom-20 -right-12 h-52 w-52 rounded-full border-[32px] border-black/[.04]"/><p className="relative text-[9px] uppercase tracking-[.22em] text-black/35">Our topic formula</p><h3 className="relative mt-4 text-2xl font-semibold tracking-[-.04em] md:text-3xl">一条有效选题，不只看“能不能火”</h3><div className="relative mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4">{['楼盘节点','客户痛点','表达角度','转化钩子'].map((item,i)=><div key={item} className="rounded-xl border border-black/10 bg-black/[.035] p-3"><span className="text-[9px] text-black/30">0{i+1}</span><p className="mt-3 text-xs font-semibold">{item}</p></div>)}</div><p className="relative mt-7 text-xs leading-6 text-black/50">四类信任内容按阶段组合，再用真实咨询与签单数据持续校准，账号才会形成自己的内容资产。</p></div><div className="rounded-[26px] border border-white/[.08] bg-white/[.025] p-6 md:p-8"><p className="text-[9px] uppercase tracking-[.22em] text-primary/28">我们追踪什么</p><div className="mt-8 space-y-6">{[['内容表现','完播率 · 评论 · 主页访问','不是只看播放量'],['线索质量','私信 · 留资 · 有效咨询','判断是不是目标客户'],['成交结果','到店 · 量房 · 签单产值','让内容指向生意结果']].map(([title,data,note],i)=><div key={title} className="grid grid-cols-[auto_1fr] gap-4"><span className="font-serif text-lg italic text-primary/20">0{i+1}</span><div><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-semibold text-primary/70">{title}</h4><span className="text-[9px] text-primary/25">{note}</span></div><p className="mt-2 text-[10px] text-primary/40">{data}</p></div></div>)}</div></div></Reveal>

        <Reveal className="mt-16"><div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="text-[9px] uppercase tracking-[.24em] text-primary/30">Traffic & conversion loop</p><h3 className="mt-3 text-3xl font-semibold leading-tight tracking-[-.04em] text-primary/85 md:text-4xl">投流不是赌爆款<br/><span className="font-serif font-normal italic text-primary/40">而是放大已经验证的内容</span></h3></div><p className="max-w-sm text-xs leading-6 text-primary/38">内容先证明有效，再放大给本地目标客户，并用私信、直播与私域把关注承接成真实线索。</p></div><div data-motion-group className="mt-8 grid gap-px overflow-hidden rounded-[24px] border border-white/[.08] bg-white/[.08] sm:grid-cols-2 lg:grid-cols-5">{[['01','自然验证','先看完播、评论、主页访问与私信意向。'],['02','本地放大','只放大已验证内容，精准覆盖目标城市。'],['03','私信承接','用明确钩子把观看转成咨询与留资。'],['04','直播私域','持续答疑、展示案例、推进客户决策。'],['05','到店签单','跟踪到店、量房、签单和真实产值。']].map(([n,title,desc],i)=><div data-motion-card key={n} className={`min-h-[205px] p-5 ${i===4?'bg-primary text-black':'bg-[#10100f] text-primary'}`}><span className={`font-serif text-sm italic ${i===4?'text-black/30':'text-primary/22'}`}>{n}</span><h4 className="mt-10 text-lg font-semibold">{title}</h4><p className={`mt-3 text-[10px] leading-5 ${i===4?'text-black/48':'text-primary/35'}`}>{desc}</p></div>)}</div></Reveal>
      </div>
    </div>
  </section>
}

const cases = [
  {name:'长沙点石装修老蒋小蒋',handle:'装修顾问夫妻 IP',image:'/cases/01-laojiang-xiaojiang-optimized.jpg',stats:['792 粉丝','811 作品','1.2万获赞'],result:'700万',resultLabel:'年度新媒体渠道产值',action:'高频更新 + 持续账号迭代',effect:'围绕本地业主真正关心的问题持续输出，根据咨询反馈不断校准选题、表达和转化链路，让账号从偶尔来一个客户，变成持续有客户咨询。',conclusion:'持续更新不是为了刷存在感，而是让账号长期接住同楼盘的真实装修需求。'},
  {name:'湖南设计师易不凡',handle:'大宅全案设计师 IP',image:'/cases/02-yibufan-optimized.jpg',stats:['3074 粉丝','207 作品','1.3万获赞'],result:'20组/月',resultLabel:'140㎡以上精装房有效客资',action:'建立设计师老板人设 + 精准定位高净值客户',effect:'月发布约 15 条内容，围绕大宅客户关心的空间规划、材料选择和生活方式表达，每月稳定获得 20 组高意向咨询，不追求泛流量。',conclusion:'粉丝不到 3000 也能持续拿到大客户。设计师 IP 的核心不是拍得好看，而是让目标客户觉得你懂他。'},
  {name:'平江装修罗怀安',handle:'本地装修老板 IP',image:'/cases/03-luohuaian-optimized.jpg',stats:['1563 粉丝','258 作品','1.6万获赞'],result:'500万+',resultLabel:'年度产值 · 春节单月获客 30 组',action:'稳定内容产出 + 装修季集中承接',effect:'持续陪跑和优质内容更新，让账号在关键装修季稳定获得高意向咨询。春节单月集中获得 30 组高意向客户，用稳定更新替代偶发爆款。',conclusion:'稳定输出能把装修季的集中需求，变成可追踪的高意向咨询。'},
  {name:'长沙装修罗委乡',handle:'装修行业服务 IP',image:'/cases/04-luoweixiang-optimized.jpg',stats:['991 粉丝','627 作品','7454 获赞'],result:'8单/月',resultLabel:'年度产值 500万+ · 单月最高签单',action:'短视频持续曝光 + 直播即时承接',effect:'短视频负责保持楼盘曝光，直播负责回答客户问题和即时沟通，让信任与转化同步发生，年度新媒体产值达到 500 万+。',conclusion:'短视频和直播不是两件事，而是一套从持续出现到即时转化的组合拳。'},
  {name:'长沙点石家装 周维',handle:'十年装修人 IP',image:'/cases/05-zhouwei-optimized.jpg',stats:['1963 粉丝','623 作品','1.6万获赞'],result:'30+',resultLabel:'两周同楼盘精准客户',action:'重点交房楼盘点对点打穿',effect:'围绕同一交房楼盘连续输出约 20 条优质内容，反复覆盖同一批有真实需求的本地业主，快速形成区域认知和集中咨询。',conclusion:'把一个重点楼盘持续讲透，比追求泛流量更容易收获精准客户。'},
  {name:'张家界装修界的伍显微',handle:'本地家装顾问 IP',image:'/cases/06-wuxianwei-optimized.jpg',stats:['4243 粉丝','539 作品','3.5万获赞'],result:'2–3单/月',resultLabel:'稳定签单 · 年业绩 500万+',action:'建立长期可复制的内容节奏',effect:'用固定的内容结构、更新节奏和案例反馈，降低账号对偶发爆款的依赖，让咨询、跟进和签单逐渐形成稳定预期，年业绩达到 500 万+。',conclusion:'真正有价值的不是一次爆发，而是每个月都能稳定产生咨询和成交。'},
]

function Cases() {
  const [selectedCase, setSelectedCase] = useState<(typeof cases)[number] | null>(null)
  useEffect(() => {
    if (!selectedCase) return
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelectedCase(null) }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [selectedCase])
  return <section id="cases" className="px-4 py-24 md:px-8 md:py-36">
    <div className="mx-auto max-w-[1480px]">
      <Reveal className="flex flex-col justify-between gap-8 md:flex-row md:items-end"><div><p className="mb-6 text-[10px] uppercase tracking-[.28em] text-primary/45">Real accounts / 04</p><h2 className="text-4xl font-medium tracking-[-.045em] md:text-6xl lg:text-7xl">陪跑结果<br/><GlitchText className="font-serif italic font-normal text-primary/45">不只看播放量</GlitchText></h2></div><p className="max-w-md text-sm leading-7 text-primary/45">这些都是真实持续运营的装修 IP。点击任一账号，可以查看对应的变现体量、陪跑动作和实际效果。</p></Reveal>
      <div className="mt-16 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:mt-24 lg:grid-cols-3">{cases.map((item,i) => <Reveal key={item.name} delay={(i%3)*.08}><ProfileCard imageUrl={item.image} name={item.name} handle={item.handle} stats={item.stats} index={i+1} onClick={() => setSelectedCase(item)}/></Reveal>)}</div>
    </div>
    <AnimatePresence>{selectedCase && <motion.div className="fixed inset-0 z-[120] grid place-items-center overflow-y-auto bg-black/80 p-3 backdrop-blur-xl md:p-8" role="dialog" aria-modal="true" aria-label={`${selectedCase.name}案例详情`} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={() => setSelectedCase(null)}>
      <motion.div className="relative grid w-full max-w-5xl overflow-hidden rounded-[26px] border border-white/10 bg-[#11110f] shadow-2xl md:grid-cols-12 md:rounded-[34px]" initial={{opacity:0,y:24,scale:.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:16,scale:.98}} transition={{duration:.35,ease}} onClick={event => event.stopPropagation()}>
        <button type="button" onClick={() => setSelectedCase(null)} aria-label="关闭案例详情" className="absolute right-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-full bg-black/70 text-primary backdrop-blur-md transition hover:bg-primary hover:text-black"><X size={18}/></button>
        <div className="relative min-h-[340px] overflow-hidden md:col-span-5 md:min-h-[680px]"><img src={selectedCase.image} alt={`${selectedCase.name}账号主页`} className="absolute inset-0 h-full w-full object-cover object-top"/><div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10"/><a href={selectedCase.image} target="_blank" rel="noreferrer" className="absolute bottom-5 left-5 flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-black">查看完整账号截图 <ArrowUpRight size={14}/></a></div>
        <div className="flex flex-col p-6 md:col-span-7 md:p-10 lg:p-12"><p className="text-[10px] uppercase tracking-[.22em] text-primary/35">Personal IP case</p><h3 className="mt-5 max-w-xl text-3xl font-semibold leading-tight tracking-[-.045em] text-primary md:text-5xl">{selectedCase.name}</h3><p className="mt-3 text-xs text-primary/40">{selectedCase.handle}</p>
          <div className="mt-9 border-y border-white/10 py-7"><div className="text-5xl font-semibold tracking-[-.05em] text-primary md:text-6xl">{selectedCase.result}</div><p className="mt-2 text-sm text-primary/55">{selectedCase.resultLabel}</p></div>
          <div className="mt-8 grid gap-7"><div><span className="text-[10px] uppercase tracking-[.2em] text-primary/30">陪跑核心动作</span><h4 className="mt-2 text-lg font-semibold text-primary/80">{selectedCase.action}</h4></div><div><span className="text-[10px] uppercase tracking-[.2em] text-primary/30">陪跑效果</span><p className="mt-2 text-sm leading-7 text-primary/52">{selectedCase.effect}</p></div><blockquote className="border-l border-primary/30 pl-5 font-serif text-xl italic leading-7 text-primary/75">“{selectedCase.conclusion}”</blockquote></div>
        </div>
      </motion.div>
    </motion.div>}</AnimatePresence>
  </section>
}

const feedbacks = [
  {account:'伍显微',tag:'连续签单',title:'抖音客户连续成交',image:'/feedback/01-wuxianwei-multi-signing-optimized.jpg'},
  {account:'伍显微',tag:'首日签单',title:'上班第一天签下抖音客户',image:'/feedback/02-wuxianwei-first-day-optimized.jpg'},
  {account:'伍显微',tag:'持续获客',title:'抖音客户连续到店',image:'/feedback/03-wuxianwei-leads-optimized.jpg'},
  {account:'伍显微',tag:'成交反馈',title:'内容形成循环 客户成交率高',image:'/feedback/04-wuxianwei-conversion-optimized.jpg'},
  {account:'老蒋小蒋',tag:'客资与签单',title:'客资 +3 签单 +1',image:'/feedback/05-laojiang-results-optimized.jpg'},
  {account:'罗委乡',tag:'单日客资',title:'一天接待四波客户',image:'/feedback/06-luoweixiang-four-waves-optimized.jpg'},
  {account:'罗委乡',tag:'月度签单',title:'月初已签 6 单',image:'/feedback/07-luoweixiang-six-orders-optimized.jpg'},
  {account:'罗委乡',tag:'一访成交',title:'客户首次到访即签单',image:'/feedback/08-luoweixiang-first-visit-optimized.jpg'},
]

function Feedback() {
  const [selectedFeedback,setSelectedFeedback] = useState<(typeof feedbacks)[number] | null>(null)
  useEffect(() => {
    if(!selectedFeedback) return
    const close = (event:KeyboardEvent) => {if(event.key==='Escape') setSelectedFeedback(null)}
    const previousOverflow=document.body.style.overflow
    document.body.style.overflow='hidden'
    window.addEventListener('keydown',close)
    return () => {document.body.style.overflow=previousOverflow;window.removeEventListener('keydown',close)}
  },[selectedFeedback])
  return <section id="feedback" className="px-3 py-6 md:px-5">
    <div className="relative min-h-[860px] overflow-hidden rounded-[26px] bg-[#dcd8c3] px-5 py-20 text-black md:rounded-[38px] md:px-12 md:py-28 lg:px-16">
      <div className="absolute inset-0 bg-grid opacity-30 mix-blend-multiply"/>
      <div className="relative mx-auto min-h-[650px] max-w-[1400px]">
        <Reveal className="relative z-10 max-w-xl"><p className="mb-6 text-[10px] uppercase tracking-[.28em] text-black/40">Real feedback / 05</p><h2 className="text-balance text-4xl font-medium leading-[1.02] tracking-[-.05em] md:text-6xl lg:text-7xl">真实签单反馈<br/><GlitchText className="font-serif italic font-normal text-black/45">结果来自真实对话</GlitchText></h2><p className="mt-8 max-w-md text-sm leading-7 text-black/50">这些截图来自真实陪跑群和账号本人。我们保留原始聊天语境，只提炼截图中已经明确出现的客资与签单结果。</p><div className="mt-9 flex max-w-md flex-wrap gap-2">{['连续签单','单日四波客户','月初 6 单','一访成交'].map(item=><span key={item} className="rounded-full border border-black/15 px-3 py-2 text-[10px] text-black/55">{item}</span>)}</div><p className="mt-8 text-[10px] text-black/35">卡片自动轮换 · 悬停暂停 · 点击查看原图</p></Reveal>
        <div className="absolute inset-x-0 bottom-0 top-[410px] lg:left-auto lg:top-0 lg:w-[58%]">
          <CardSwap width={520} height={610} cardDistance={38} verticalDistance={46} delay={4200} pauseOnHover onCardClick={index=>setSelectedFeedback(feedbacks[index])}>
            {feedbacks.map(item=><Card key={item.image} customClass="feedback-swap-card" role="button" aria-label={`查看${item.account}${item.title}反馈截图`}>
              <div className="feedback-card-header"><span className="feedback-card-account">{item.account}</span><span className="feedback-card-tag">{item.tag}</span></div>
              <div className="feedback-card-image"><img src={item.image} alt={`${item.account}${item.title}聊天反馈`} loading="lazy" decoding="async"/></div>
              <div className="feedback-card-footer"><h3>{item.title}</h3><span>点击放大</span></div>
            </Card>)}
          </CardSwap>
        </div>
      </div>
    </div>
    <AnimatePresence>{selectedFeedback&&<motion.div className="fixed inset-0 z-[130] grid place-items-center overflow-y-auto bg-black/85 p-4 backdrop-blur-xl" role="dialog" aria-modal="true" aria-label={`${selectedFeedback.account}反馈截图`} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setSelectedFeedback(null)}><motion.div className="relative max-h-[92vh] max-w-4xl overflow-hidden rounded-[24px] bg-[#111] p-3" initial={{y:20,scale:.98}} animate={{y:0,scale:1}} exit={{y:12,scale:.98}} onClick={event=>event.stopPropagation()}><button type="button" aria-label="关闭反馈截图" onClick={()=>setSelectedFeedback(null)} className="absolute right-5 top-5 z-10 grid h-10 w-10 place-items-center rounded-full bg-black/75 text-primary backdrop-blur-md"><X size={18}/></button><img src={selectedFeedback.image} alt={`${selectedFeedback.account}${selectedFeedback.title}完整反馈`} className="max-h-[82vh] w-auto max-w-full rounded-[16px] object-contain"/><div className="flex items-center justify-between gap-6 px-2 pb-2 pt-4 text-primary"><div><p className="text-[10px] text-primary/35">{selectedFeedback.account} · {selectedFeedback.tag}</p><h3 className="mt-1 text-sm font-semibold">{selectedFeedback.title}</h3></div><a href={selectedFeedback.image} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-primary/45">查看原图 <ArrowUpRight size={14}/></a></div></motion.div></motion.div>}</AnimatePresence>
  </section>
}

function Difference() {
  const points = [
    ['不只交付视频','普通代运营关心发了多少条；我们追踪客资、到店与签单结果。'],
    ['不套通用模板','根据你的城市、楼盘、客户类型和团队能力设计内容系统。'],
    ['不做一次培训','每周计划、实时审核、数据复盘，持续把账号校准到能获客。'],
    ['愿意绑定结果','深度合作可按线上增量产值分润，双方站在同一边。'],
  ]
  return <section className="px-4 pb-16 md:px-8 md:pb-24"><div className="mx-auto max-w-[1480px] rounded-[26px] border border-white/[.07] bg-[#10100f] p-6 md:rounded-[34px] md:p-12 lg:p-16"><Reveal className="grid gap-10 lg:grid-cols-12"><div className="lg:col-span-5"><p className="mb-6 text-[10px] uppercase tracking-[.28em] text-primary/40">Why us / 06</p><h2 className="text-4xl font-medium leading-tight tracking-[-.045em] md:text-5xl">我们为什么<br/><GlitchText className="font-serif italic font-normal text-primary/45">更懂装修获客</GlitchText></h2><p className="mt-7 max-w-md text-sm leading-7 text-primary/45">我们不跨行业套模板，也不只教拍摄技巧。我们长期在装修一线，把内容动作追踪到真实客资、设计与施工结果。</p></div><div data-motion-group className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-2 lg:col-span-7">{points.map(([title,desc],i) => <div data-motion-card key={title} className="bg-[#151513] p-6"><span className="text-[10px] text-primary/25">0{i+1}</span><h3 className="mt-8 text-lg font-semibold text-primary/80">{title}</h3><p className="mt-3 text-xs leading-6 text-primary/40">{desc}</p></div>)}</div></Reveal></div></section>
}

const services = [
  {
    n:'01', name:'单次咨询诊断', stage:'解决一个具体卡点', price:'¥499 / 次', badge:'低成本试错', featured:false,
    for:'已经在做账号，但卡在流量、定位、内容或转化其中一环的人。',
    cardItems:['1小时 1v1 深度咨询','3–5个优先动作','72小时内书面报告'],
    problems:['账号做了一段时间，但不知道问题出在哪里','内容发了很多，但没有明确获客路径','知道要做 IP，却不知道自己适合什么人设','想先判断双方是否适合长期合作'],
    approach:'通过 1 小时 1v1 视频或语音，深度梳理账号现状、目标客户、内容方向和转化卡点。咨询结束后，我们会给出可执行的诊断建议，明确你现在最应该先改定位、改内容，还是改承接链路。',
    deliverables:['1次1小时深度咨询','账号定位初步判断','内容方向建议','当前最优先解决的3–5个动作','咨询后72小时内交付书面诊断报告'],
    footnote:'这是最低成本的试错产品。通过这次咨询，我们基本可以判断双方是否适合进入下一步合作。'
  },
  {
    n:'02', name:'季度内容顾问', stage:'持续校准内容方向', price:'¥6,800 / 3个月', badge:'轻陪伴', featured:false,
    for:'已有账号和基础执行能力，但内容与获客不稳定的个人或小团队。',
    cardItems:['每月2次 1v1','月度内容复盘','选题库持续共建'],
    problems:['每周都在想选题，但越做越枯竭','内容方向经常变化，账号没有统一主线','有些视频能来客户，但不知道为什么有效','不想找全托管，只需要定期校准方向'],
    approach:'3个月内，每月2次1v1内容顾问服务，围绕账号定位、选题规划、内容复盘、投放建议和转化链路持续校准。你负责执行，我们负责判断方向、复盘结果和调整动作。',
    deliverables:['每月2次1v1咨询，共6次','每月1份内容复盘报告','账号选题库共建','每月内容方向校准','阶段性投流和转化建议'],
    footnote:'适合想自己做，但不想闭门造车的人。'
  },
  {
    n:'03', name:'线上陪跑体系', stage:'从0到1搭建获客系统', price:'¥9,800 / 3个月', badge:'核心产品', featured:true,
    for:'想系统搭建线上获客链路的装修老板、设计师老板、销售冠军或小团队负责人。',
    cardItems:['定位到转化全链路','每周计划与复盘','实时内容审核纠偏'],
    problems:['之前没有系统做过账号，不知道从哪里开始','做过账号但一直没结果，想彻底重搭','想建立个人 IP，但不知道怎么定位和表达','想用内容带来稳定咨询，而不是偶尔碰运气'],
    approach:'用3个月陪你从账号定位到内容体系、从选题规划到拍摄执行、从自然流量到投流放大、从私信咨询到线索转化，把一整套线上获客链路跑通。这不是一套课程，而是边做边改：每周有计划、每周有复盘、每周校准动作。',
    deliverables:['账号定位与人设梳理','目标客户画像拆解','账号简介与主页包装建议','3个月选题方向规划','每周内容计划','视频脚本与拍摄方向指导','实时内容审核与修改建议','投流测试与放大建议','私信、直播与私域承接建议','每周复盘与动作纠偏'],
    footnote:'重点解决：不知道拍什么、不知道怎么持续、不知道怎么转化、不知道怎么把内容变成客户。'
  },
  {
    n:'04', name:'企业团队内训', stage:'统一团队内容能力', price:'定制方案', badge:'团队升级', featured:false,
    for:'有销售、设计师或新媒体部门，想让团队整体具备内容获客能力的装企与设计机构。',
    cardItems:['3天2夜线上/线下','方法、实操与分工','训后6个月答疑'],
    problems:['老板、销售和设计师不在同一频道','有人会拍，但缺少统一方法和标准','账号数量多，内容质量参差不齐','新媒体和销售脱节，线索无法高效转化','想做矩阵账号，却不知道如何分工和复盘'],
    approach:'通过3天2夜线下或线上内训，把方法论、案例拆解、账号定位、内容标准、拍摄实操、团队分工和复盘机制一次性搭起来。不是只讲课，而是带着团队完成从认知到动作的统一。',
    deliverables:['3天2夜线下或线上内训','装修IP方法论培训','团队账号定位拆解','案例拆解与实操练习','选题库搭建方法','拍摄和内容审核标准','团队分工与运营SOP建议','训后6个月跟踪答疑'],
    footnote:'适合想让团队整体升级，而不是只培养一个账号的人。'
  },
  {
    n:'05', name:'全案分润合作', stage:'把线上变成增长引擎', price:'面议', badge:'深度绑定', featured:false,
    for:'业务成熟、交付稳定、团队完整，准备把线上渠道做成长期增长引擎的装企或设计机构。',
    cardItems:['全账号矩阵规划','内容全链路管理','只分线上新增产值'],
    problems:['已有成熟业务，但线上还没有稳定增长渠道','老板IP、设计师IP与销售IP缺少分层定位','内容、投流和后端承接没有形成一套系统','需要长期共建，而不是一次性代运营'],
    approach:'前期用半年时间，把账号矩阵、内容体系、服务标准、证据链、客户背书、价值观表达和后端承接全部搭建起来。原有业务和客户我们不参与分润，只围绕线上新增客户、线上新增产值合作，双方天然站在同一边。',
    deliverables:['全账号矩阵规划与搭建','老板IP、设计师IP、销售IP分层定位','内容体系全托管','选题、拍摄、发布、投流、复盘全链路管理','私信、直播、私域承接策略','月度数据复盘与策略调整','团队能力复制与标准化沉淀','月度服务费 + 线上增量签单提成','一年起签，六个月起付','只分润线上增量，不动原有业务'],
    footnote:'我们不赚你的存量，只赚共同新增出来的钱。你赚到钱，我们才赚到钱。'
  },
]

function Services() {
  const [selectedService,setSelectedService] = useState<(typeof services)[number] | null>(null)
  useEffect(() => {
    if(!selectedService) return
    const close = (event:KeyboardEvent) => { if(event.key === 'Escape') setSelectedService(null) }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown',close)
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown',close) }
  },[selectedService])
  return <section id="services" className="relative px-4 py-24 md:px-8 md:py-36">
    <div className="pointer-events-none absolute inset-x-0 top-1/3 h-[520px] bg-[radial-gradient(circle_at_center,rgba(222,219,200,.055),transparent_62%)]"/>
    <div className="relative mx-auto max-w-[1480px]">
      <Reveal className="grid gap-8 lg:grid-cols-12 lg:items-end"><div className="lg:col-span-8"><p className="mb-6 text-[10px] uppercase tracking-[.28em] text-primary/45">Paid services / 07</p><h2 className="text-balance text-4xl font-medium tracking-[-.045em] md:text-6xl lg:text-7xl">根据你现在的阶段<br/><GlitchText className="font-serif italic font-normal text-primary/45">选择合作深度</GlitchText></h2></div><p className="max-w-md text-sm leading-7 text-primary/45 lg:col-span-4">设计师老板、销售骨干和装企团队所处阶段不同，需要的服务也不同。我们不会让所有人买同一个产品，而是先看你现在的问题。</p></Reveal>
      <Reveal className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-white/[.07] py-5 lg:mt-16"><span className="text-[9px] uppercase tracking-[.22em] text-primary/25">合作深度</span>{['单点诊断','持续校准','系统陪跑','团队升级','增长绑定'].map((label,i)=><div key={label} className="flex items-center gap-2"><span className={`h-1.5 w-1.5 rounded-full ${i===2?'bg-primary shadow-[0_0_14px_rgba(222,219,200,.7)]':'bg-primary/20'}`}/><span className={`text-[10px] ${i===2?'text-primary/75':'text-primary/35'}`}>{label}</span>{i<4&&<ArrowRight className="h-3 w-3 text-primary/15"/>}</div>)}</Reveal>
      <div data-motion-group className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{services.map(service=><button data-motion-card type="button" key={service.n} onClick={()=>setSelectedService(service)} className={`group relative flex min-h-[390px] flex-col overflow-hidden rounded-[25px] border p-5 text-left transition duration-500 hover:-translate-y-2 ${service.featured?'border-primary bg-primary text-black shadow-[0_30px_90px_rgba(222,219,200,.12)]':'border-white/[.08] bg-[#11110f] text-primary hover:border-primary/25 hover:bg-[#171713]'}`}>
        <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full border-[20px] border-current opacity-[.035]"/><div className="flex items-center justify-between"><span className={`font-serif text-xl italic ${service.featured?'text-black/35':'text-primary/25'}`}>{service.n}</span><span className={`rounded-full border px-2.5 py-1.5 text-[8px] font-semibold tracking-[.08em] ${service.featured?'border-black/15 bg-black/5':'border-primary/10 text-primary/35'}`}>{service.badge}</span></div>
        <div className="mt-10"><p className={`text-[9px] uppercase tracking-[.18em] ${service.featured?'text-black/40':'text-primary/30'}`}>{service.stage}</p><h3 className="mt-3 text-xl font-semibold tracking-[-.035em]">{service.name}</h3><p className={`mt-3 text-xs leading-6 ${service.featured?'text-black/55':'text-primary/38'}`}>{service.for}</p></div>
        <ul className={`mt-7 space-y-2 border-t pt-5 ${service.featured?'border-black/10':'border-white/[.07]'}`}>{service.cardItems.map(item=><li key={item} className={`flex items-center gap-2 text-[10px] ${service.featured?'text-black/55':'text-primary/42'}`}><Check size={12}/>{item}</li>)}</ul>
        <div className="mt-auto flex items-end justify-between pt-8"><div><span className={`text-[8px] uppercase tracking-[.18em] ${service.featured?'text-black/35':'text-primary/25'}`}>Investment</span><p className="mt-1 text-lg font-semibold tracking-[-.03em]">{service.price}</p></div><span className={`grid h-10 w-10 place-items-center rounded-full border transition duration-300 ${service.featured?'border-black/15 group-hover:bg-black group-hover:text-primary':'border-primary/15 group-hover:bg-primary group-hover:text-black'}`}><ArrowUpRight size={15}/></span></div>
      </button>)}</div>
      <Reveal className="mt-5 grid gap-3 md:grid-cols-[1fr_auto] md:items-center"><div className="rounded-2xl border border-white/[.07] bg-white/[.02] px-5 py-4"><p className="text-xs leading-6 text-primary/42"><span className="mr-2 font-semibold text-primary/75">还不确定选哪一种？</span>先做一次单次咨询诊断，用最低成本判断问题和合作匹配度。</p></div><a href="#contact" className="flex items-center justify-center gap-3 rounded-2xl bg-primary px-6 py-5 text-xs font-semibold text-black transition hover:bg-white">先预约诊断 <ArrowRight size={15}/></a></Reveal>
    </div>
    <AnimatePresence>{selectedService&&<motion.div className="fixed inset-0 z-[140] overflow-y-auto bg-black/85 p-3 backdrop-blur-xl md:p-8" role="dialog" aria-modal="true" aria-label={`${selectedService.name}服务详情`} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setSelectedService(null)}><div className="flex min-h-full items-center justify-center"><motion.div className={`relative w-full max-w-6xl overflow-hidden rounded-[28px] border shadow-2xl md:rounded-[38px] ${selectedService.featured?'border-primary/30 bg-primary text-black':'border-white/10 bg-[#11110f] text-primary'}`} initial={{opacity:0,y:26,scale:.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:16,scale:.98}} transition={{duration:.35,ease}} onClick={event=>event.stopPropagation()}>
        <button type="button" onClick={()=>setSelectedService(null)} aria-label="关闭服务详情" className={`absolute right-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-full transition ${selectedService.featured?'bg-black text-primary':'bg-black/70 text-primary hover:bg-primary hover:text-black'}`}><X size={18}/></button>
        <div className="grid lg:grid-cols-12"><div className={`relative p-6 md:p-10 lg:col-span-5 lg:p-12 ${selectedService.featured?'border-black/10':'border-white/[.08]'} lg:border-r`}><div className="absolute -left-10 -top-16 font-serif text-[180px] italic leading-none opacity-[.035]">{selectedService.n}</div><div className="relative"><div className="flex items-center gap-3"><span className="font-serif text-lg italic opacity-35">{selectedService.n}</span><span className="rounded-full border border-current px-3 py-1.5 text-[8px] font-semibold opacity-55">{selectedService.badge}</span></div><p className="mt-12 text-[9px] uppercase tracking-[.22em] opacity-40">{selectedService.stage}</p><h3 className="mt-3 text-4xl font-semibold tracking-[-.05em] md:text-5xl">{selectedService.name}</h3><p className="mt-5 text-2xl font-semibold opacity-80">{selectedService.price}</p><div className="mt-9 border-t border-current/10 pt-7"><span className="text-[9px] uppercase tracking-[.2em] opacity-35">适合谁</span><p className="mt-3 text-sm leading-7 opacity-60">{selectedService.for}</p></div><div className="mt-8"><span className="text-[9px] uppercase tracking-[.2em] opacity-35">你现在可能遇到的问题</span><ul className="mt-4 space-y-3">{selectedService.problems.map(problem=><li key={problem} className="flex gap-3 text-xs leading-6 opacity-55"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-current"/>{problem}</li>)}</ul></div></div></div>
        <div className="p-6 md:p-10 lg:col-span-7 lg:p-12"><p className="text-[9px] uppercase tracking-[.22em] opacity-35">我们怎么做</p><p className="mt-4 max-w-2xl text-sm leading-8 opacity-65">{selectedService.approach}</p><div className="mt-10"><p className="text-[9px] uppercase tracking-[.22em] opacity-35">你会得到什么</p><div className="mt-5 grid gap-2 sm:grid-cols-2">{selectedService.deliverables.map((item,i)=><div key={item} className="flex min-h-14 items-center gap-3 rounded-xl border border-current/10 px-4 py-3"><span className="font-serif text-xs italic opacity-25">{String(i+1).padStart(2,'0')}</span><span className="text-xs opacity-65">{item}</span></div>)}</div></div><blockquote className={`mt-10 rounded-2xl p-5 font-serif text-lg italic leading-8 ${selectedService.featured?'bg-black/[.06]':'bg-primary/[.05]'}`}>“{selectedService.footnote}”</blockquote><a href="#contact" onClick={()=>setSelectedService(null)} className={`mt-8 inline-flex items-center gap-4 rounded-full px-5 py-3 text-xs font-semibold transition ${selectedService.featured?'bg-black text-primary':'bg-primary text-black'}`}>咨询这个合作方式 <ArrowRight size={14}/></a></div></div>
      </motion.div></div></motion.div>}</AnimatePresence>
  </section>
}

function Contact() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0,1], [50,-50])
  const channels = [
    {name:'抖音', account:'@ 唯吾（IP运营）', note:'抖音号 27312081576', image:'/contact/douyin.jpg', accent:'bg-[#5b3ee6]'},
    {name:'小红书', account:'唯吾（装企IP运营）', note:'小红书号 7477064159', image:'/contact/xiaohongshu.jpg', accent:'bg-[#ff2442]'},
    {name:'微信', account:'Wave', note:'添加微信 · 预约咨询', image:'/contact/wechat.jpg', accent:'bg-[#7da495]'},
  ]
  return <footer id="contact" ref={ref} className="p-3 md:p-5">
    <div className="relative overflow-hidden rounded-[26px] bg-[#dcd8c3] px-5 py-16 text-black md:rounded-[38px] md:px-12 md:py-24 lg:px-16">
      <motion.div style={{ y }} className="absolute -right-10 top-0 font-serif text-[32vw] italic leading-none text-black/[.04]">吾</motion.div>
      <div className="relative mx-auto max-w-[1400px]">
        <Reveal className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4 lg:pr-8">
            <p className="mb-8 text-[10px] uppercase tracking-[.28em] text-black/40">Start here / 08</p>
            <h2 className="text-balance text-5xl font-medium leading-[.95] tracking-[-.055em] md:text-6xl lg:text-7xl">先把你的账号问题<br/><GlitchText className="font-serif italic font-normal">说清楚</GlitchText></h2>
            <p className="mt-8 max-w-md text-sm leading-7 text-black/55">预约一次 1 对 1 诊断：我们会从账号定位、内容、流量和转化链路中，找出当前最该解决的问题。</p>
            <div className="mt-10 inline-flex items-center gap-3 rounded-full border border-black/15 px-4 py-3 text-xs text-black/60"><span className="h-2 w-2 rounded-full bg-[#4e735d]"/>咨询前无需准备完整资料</div>
          </div>
          <div data-motion-group className="grid gap-3 sm:grid-cols-3 lg:col-span-8">
            {channels.map(channel => <a data-motion-card key={channel.name} href={channel.image} target="_blank" rel="noreferrer" className="group flex min-w-0 flex-col rounded-[22px] bg-[#11110f] p-3 text-primary shadow-[0_20px_60px_rgba(0,0,0,.12)] transition duration-500 hover:-translate-y-1 hover:shadow-[0_24px_80px_rgba(0,0,0,.2)]">
              <div className="relative aspect-[3/4] overflow-hidden rounded-[15px] bg-white">
                <img src={channel.image} alt={`${channel.name}二维码`} loading="lazy" decoding="async" className="h-full w-full object-contain transition duration-700 group-hover:scale-[1.02]"/>
                <span className="absolute right-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-[9px] tracking-[.12em] text-white backdrop-blur-md">点击放大</span>
              </div>
              <div className="flex items-start justify-between gap-3 px-2 pb-2 pt-5">
                <div className="min-w-0"><div className="flex items-center gap-2"><span className={`h-2 w-2 shrink-0 rounded-full ${channel.accent}`}/><h3 className="text-sm font-semibold">{channel.name}</h3></div><p className="mt-2 truncate text-[11px] text-primary/55">{channel.account}</p><p className="mt-1 truncate text-[10px] text-primary/30">{channel.note}</p></div>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-primary/15 transition group-hover:bg-primary group-hover:text-black"><ArrowRight size={14}/></span>
              </div>
            </a>)}
          </div>
        </Reveal>
      </div>
    </div>
    <div className="mx-auto flex max-w-[1480px] flex-col gap-3 px-2 py-7 text-[10px] uppercase tracking-[.16em] text-primary/30 sm:flex-row sm:justify-between"><span>© 2026 唯吾 · 装修IP运营</span><span>让每一条内容都指向签单</span></div>
  </footer>
}

export default function App() {
  return <main className="overflow-hidden bg-ink text-[#e1e0cc]"><RestoreInitialHash/><MotionDirector/><Header/><Hero/><Problems/><About/><Method/><Cases/><Feedback/><Difference/><Services/><Contact/></main>
}
