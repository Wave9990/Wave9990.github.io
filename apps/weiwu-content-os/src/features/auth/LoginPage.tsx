import { useState, type FormEvent } from 'react'
import { useAuth } from '../../providers/AuthProvider'

type AuthMode = 'password' | 'link' | 'signup' | 'reset'

const copy: Record<AuthMode, { title: string; description: string; submit: string }> = {
  password: { title: '回到内容工作台', description: '用邮箱和密码，在电脑和手机同步管理同一套内容记录。', submit: '登录' },
  link: { title: '用邮箱链接登录', description: '我们会把一次性登录链接发送到你的邮箱。', submit: '发送登录链接' },
  signup: { title: '完成受邀账号设置', description: '使用收到邀请的同一邮箱注册。未受邀请的邮箱无法进入此私有工作区。', submit: '创建账号' },
  reset: { title: '重置登录密码', description: '我们会发送安全链接到邮箱，用于设置新的登录密码。', submit: '发送重置链接' }
}

export function LoginPage() {
  const { configurationError, signInWithEmail, signInWithPassword, signUpWithPassword, sendPasswordReset } = useAuth()
  const [mode, setMode] = useState<AuthMode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function switchMode(next: AuthMode) {
    setMode(next)
    setMessage(null)
    setPassword('')
    setConfirmPassword('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)
    const normalizedEmail = email.trim()
    if ((mode === 'password' || mode === 'signup') && password.length < 8) {
      setMessage('密码至少需要 8 位。')
      return
    }
    if (mode === 'signup' && password !== confirmPassword) {
      setMessage('两次输入的密码不一致。')
      return
    }
    setIsSubmitting(true)
    try {
      if (mode === 'password') {
        const { error } = await signInWithPassword(normalizedEmail, password)
        setMessage(error)
      } else if (mode === 'link') {
        const { error } = await signInWithEmail(normalizedEmail)
        setMessage(error ?? '登录链接已发送，请在此设备打开邮箱完成登录。')
      } else if (mode === 'signup') {
        const { error } = await signUpWithPassword(normalizedEmail, password)
        setMessage(error ?? '账号已创建，请查收邮箱完成验证后登录。')
      } else {
        const { error } = await sendPasswordReset(normalizedEmail)
        setMessage(error ?? '重置链接已发送，请在此设备打开邮箱继续设置。')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const activeCopy = copy[mode]
  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <p className="eyebrow">WEIWU CONTENT OS</p>
        <h1 id="login-title">{activeCopy.title}</h1>
        <p>{activeCopy.description}</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="email">邮箱</label>
          <input id="email" type="email" autoComplete="email" placeholder="name@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={configurationError || isSubmitting} />
          {(mode === 'password' || mode === 'signup') && <><label htmlFor="password">密码</label><input id="password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} placeholder="至少 8 位" value={password} onChange={(event) => setPassword(event.target.value)} required disabled={configurationError || isSubmitting} /> </>}
          {mode === 'signup' && <><label htmlFor="confirm-password">确认密码</label><input id="confirm-password" type="password" autoComplete="new-password" placeholder="再次输入密码" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required disabled={configurationError || isSubmitting} /></>}
          <button type="submit" disabled={configurationError || isSubmitting}>{isSubmitting ? '正在处理…' : activeCopy.submit}</button>
        </form>
        {mode === 'password' && <div className="auth-actions"><button type="button" onClick={() => switchMode('reset')}>忘记密码</button><button type="button" onClick={() => switchMode('link')}>改用邮箱链接</button></div>}
        {mode === 'link' && <div className="auth-actions"><button type="button" onClick={() => switchMode('password')}>使用密码登录</button></div>}
        {mode === 'reset' && <div className="auth-actions"><button type="button" onClick={() => switchMode('password')}>返回密码登录</button></div>}
        {mode !== 'signup' && <div className="auth-actions"><button type="button" onClick={() => switchMode('signup')}>我是受邀成员，创建账号</button></div>}
        {mode === 'signup' && <div className="auth-actions"><button type="button" onClick={() => switchMode('password')}>已有账号，直接登录</button></div>}
        {configurationError && <p className="auth-note" role="status">云端服务尚未配置，暂时无法登录。</p>}
        {message && <p className="auth-note" role="status">{message}</p>}
      </section>
    </main>
  )
}
