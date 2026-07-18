import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/app/AppShell'
import { AuthProvider, useAuth } from './providers/AuthProvider'
import { TrackProvider } from './providers/TrackProvider'
import { AppErrorBoundary } from './components/app/AppErrorBoundary'

const LoginPage = lazy(() => import('./features/auth/LoginPage').then((module) => ({ default: module.LoginPage })))
const TopicListPage = lazy(() => import('./features/topics/TopicListPage').then((module) => ({ default: module.TopicListPage })))
const TopicEditor = lazy(() => import('./features/topics/TopicEditor').then((module) => ({ default: module.TopicEditor })))
const ScriptListPage = lazy(() => import('./features/scripts/ScriptListPage').then((module) => ({ default: module.ScriptListPage })))
const ScriptEditorPage = lazy(() => import('./features/scripts/ScriptEditorPage').then((module) => ({ default: module.ScriptEditorPage })))
const ShootPage = lazy(() => import('./features/shooting/ShootPage').then((module) => ({ default: module.ShootPage })))
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const SettingsPage = lazy(() => import('./features/settings/SettingsPage').then((module) => ({ default: module.SettingsPage })))

function LoadingScreen() {
  return <main className="route-state" aria-live="polite">正在连接你的内容工作台…</main>
}

function LazyScreen({ children }: { children: ReactNode }) {
  return <Suspense fallback={<LoadingScreen />}>{children}</Suspense>
}

function WorkspaceSetupError() {
  const { signOut, retryWorkspace, isBootstrapping } = useAuth()
  return (
    <main className="route-state">
      <section>
        <p className="eyebrow">PRIVATE WORKSPACE</p>
        <h1>工作区暂时未准备好</h1>
        <p>请先重试同步；如果问题持续，请退出后重新登录。你的云端记录不会因重试而被删除。</p>
        <div className="route-state-actions"><button type="button" onClick={() => void retryWorkspace()} disabled={isBootstrapping}>{isBootstrapping ? '正在重试…' : '重试同步'}</button><button type="button" className="route-state-secondary" onClick={() => void signOut()}>退出登录</button></div>
      </section>
    </main>
  )
}

function RequireAuth() {
  const { user, workspace, isBootstrapping } = useAuth()
  if (isBootstrapping) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (!workspace) return <WorkspaceSetupError />
  return <Outlet />
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { user, isBootstrapping } = useAuth()
  if (isBootstrapping) return <LoadingScreen />
  return user ? <Navigate to="/dashboard" replace /> : children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><LazyScreen><LoginPage /></LazyScreen></PublicOnly>} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<LazyScreen><DashboardPage /></LazyScreen>} />
          <Route path="/topics" element={<LazyScreen><TopicListPage /></LazyScreen>} />
          <Route path="/topics/new" element={<LazyScreen><TopicEditor /></LazyScreen>} />
          <Route path="/topics/:contentId" element={<LazyScreen><TopicEditor /></LazyScreen>} />
          <Route path="/scripts" element={<LazyScreen><ScriptListPage /></LazyScreen>} />
          <Route path="/scripts/new" element={<LazyScreen><ScriptEditorPage /></LazyScreen>} />
          <Route path="/scripts/:scriptId" element={<LazyScreen><ScriptEditorPage /></LazyScreen>} />
          <Route path="/shooting" element={<LazyScreen><ShootPage /></LazyScreen>} />
          <Route path="/settings" element={<LazyScreen><SettingsPage /></LazyScreen>} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return <AppErrorBoundary><BrowserRouter><AuthProvider><TrackProvider><AppRoutes /></TrackProvider></AuthProvider></BrowserRouter></AppErrorBoundary>
}
