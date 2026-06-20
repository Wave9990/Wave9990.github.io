import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode; fallback: ReactNode }
type State = { failed: boolean }

export default class BrandMotionBoundary extends Component<Props,State> {
  state: State = { failed:false }
  static getDerivedStateFromError(): State { return { failed:true } }
  componentDidCatch(error:Error, info:ErrorInfo) {
    if (import.meta.env.DEV) console.warn('Brand motion switched to CSS fallback.', error.message, info.componentStack)
  }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}
