import { useState, type FormEvent } from 'react'
import { useAuth } from '../../providers/AuthProvider'

export function LoginPage() {
  const { configurationError, signInWithEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)
    setIsSubmitting(true)
    try {
      const { error } = await signInWithEmail(email.trim())
      setMessage(error ?? '登录链接已发送，请在此设备打开邮箱完成登录。')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <p className="eyebrow">WEIWU CONTENT OS</p>
        <h1 id="login-title">回到内容工作台</h1>
        <p>用邮箱登录，在电脑和手机同步管理同一套内容记录。</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="email">邮箱</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            disabled={configurationError || isSubmitting}
          />
          <button type="submit" disabled={configurationError || isSubmitting}>
            {isSubmitting ? '正在发送…' : '发送登录链接'}
          </button>
        </form>
        {configurationError && <p className="auth-note" role="status">云端服务尚未配置，暂时无法登录。</p>}
        {message && <p className="auth-note" role="status">{message}</p>}
      </section>
    </main>
  )
}
