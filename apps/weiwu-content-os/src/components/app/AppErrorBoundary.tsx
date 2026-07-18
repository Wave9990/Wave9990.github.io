import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps { children: ReactNode }
interface ErrorBoundaryState { hasError: boolean }

export class AppErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // The screen intentionally avoids exposing raw provider or database details.
  }

  render() {
    if (this.state.hasError) {
      return <main className="route-state"><section><p className="eyebrow">RECOVERY MODE</p><h1>这一页暂时没有加载完成</h1><p>你的云端内容不会因页面刷新而丢失。请先重试；如果问题持续，再重新登录。</p><div className="route-state-actions"><button type="button" onClick={() => this.setState({ hasError: false })}>重试此页</button><button type="button" className="route-state-secondary" onClick={() => window.location.reload()}>刷新工作台</button></div></section></main>
    }
    return this.props.children
  }
}
