import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Camera, ClipboardList, LayoutDashboard, LogOut, PenLine, Settings, Sparkles } from 'lucide-react'
import { useAuth } from '../../providers/AuthProvider'
import { useTrack } from '../../providers/TrackProvider'
import { ToastRegion, type ToastMessage } from '../ui/ToastRegion'
import { QuickCaptureDialog, type QuickCapturePayload } from './QuickCaptureDialog'
import { TrackSwitch, trackLabel } from './TrackSwitch'
import { createContentItem } from '../../repositories/contentRepository'

const desktopNavigation = [
  { to: '/dashboard', label: '总控台', icon: LayoutDashboard },
  { to: '/topics', label: '选题库', icon: Sparkles },
  { to: '/scripts', label: '脚本工作台', icon: PenLine },
  { to: '/shooting', label: '拍摄流程', icon: Camera },
  { to: '/settings', label: '设置', icon: Settings }
]

const mobileNavigation = [
  { to: '/dashboard', label: '总控', icon: LayoutDashboard },
  { to: '/topics', label: '选题', icon: Sparkles },
  { to: '/scripts', label: '脚本', icon: PenLine },
  { to: '/shooting', label: '拍摄', icon: Camera },
  { to: '/settings', label: '我的', icon: ClipboardList }
]

interface AppShellProps {
  onCapture?: (payload: QuickCapturePayload) => Promise<void> | void
}

export function AppShell({ onCapture }: AppShellProps) {
  const { workspace, user, membership, signOut } = useAuth()
  const { trackFilter } = useTrack()
  const location = useLocation()
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const isOwner = membership?.role === 'owner'

  async function handleCapture(payload: QuickCapturePayload) {
    if (onCapture) {
      await onCapture(payload)
    } else {
      if (!workspace || !user) throw new Error('当前工作区尚未准备好。')
      await createContentItem(workspace.id, user.id, {
        title: payload.title,
        trackCode: payload.trackId,
        topicStatus: payload.topicStatus,
        productionStage: payload.productionStage
      })
    }
    setToast({ message: '已记录到选题库', tone: 'success' })
  }

  return (
    <div className="workspace-shell">
      <aside className="workspace-sidebar" aria-label="工作台导航">
        <div className="workspace-brand">
          <span className="brand-mark" aria-hidden="true">吾</span>
          <div><strong>唯吾内容工作台</strong><span>WEIWU CONTENT OS</span></div>
        </div>
        <p className="sidebar-label">内容工作流</p>
        <nav className="sidebar-nav">
          {desktopNavigation.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={{ pathname: to, search: location.search }} className={({ isActive }) => `sidebar-link${isActive ? ' is-active' : ''}`}>
              <Icon size={18} strokeWidth={1.7} /> <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="sidebar-label">私有工作区</span>
          <strong>{workspace?.name ?? '唯吾内容工作台'}</strong>
          <button type="button" className="sign-out" onClick={() => void signOut()}><LogOut size={16} />退出登录</button>
        </div>
      </aside>

      <div className="workspace-main">
        <header className="workspace-header">
          <div className="mobile-brand"><span className="brand-mark" aria-hidden="true">吾</span><strong>唯吾内容工作台</strong></div>
          <div className="workspace-context"><span>当前内容线</span><strong>{trackLabel(trackFilter)}</strong></div>
          <TrackSwitch />
          {isOwner && <QuickCaptureDialog onCapture={handleCapture} />}
        </header>
        <main className="workspace-content">{!isOwner && <p className="readonly-banner" role="status">仅查看 · 当前账号无法创建、编辑、归档、恢复或导出内容。</p>}<Outlet /></main>
      </div>

      <nav className="mobile-bottom-nav" aria-label="移动端导航">
        {mobileNavigation.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={{ pathname: to, search: location.search }} className={({ isActive }) => `mobile-nav-link${isActive ? ' is-active' : ''}`}>
            <Icon size={19} strokeWidth={1.8} /><span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <ToastRegion toast={toast} />
    </div>
  )
}

export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <section className="workspace-placeholder">
      <p className="eyebrow">WEIWU CONTENT OS</p>
      <h1>{title}</h1>
      <p>{description}</p>
    </section>
  )
}
