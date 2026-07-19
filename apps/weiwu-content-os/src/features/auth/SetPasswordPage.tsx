import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../providers/AuthProvider'

export function SetPasswordPage() {
  const { updatePassword, signOut } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)
    if (password.length < 8) { setMessage('密码至少需要 8 位。'); return }
    if (password !== confirmation) { setMessage('两次输入的密码不一致。'); return }
    setIsSubmitting(true)
    try {
      const { error } = await updatePassword(password)
      if (error) { setMessage(error); return }
      navigate('/dashboard', { replace: true })
    } finally { setIsSubmitting(false) }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="set-password-title">
        <p className="eyebrow">WEIWU CONTENT OS</p>
        <h1 id="set-password-title">设置登录密码</h1>
        <p>完成后，你可以使用邮箱和密码登录当前工作区。</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="new-password">新密码</label><input id="new-password" type="password" autoComplete="new-password" placeholder="至少 8 位" value={password} onChange={(event) => setPassword(event.target.value)} required disabled={isSubmitting} />
          <label htmlFor="new-password-confirmation">确认新密码</label><input id="new-password-confirmation" type="password" autoComplete="new-password" placeholder="再次输入密码" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required disabled={isSubmitting} />
          <button type="submit" disabled={isSubmitting}>{isSubmitting ? '正在保存…' : '保存并进入工作台'}</button>
        </form>
        <div className="auth-actions"><button type="button" onClick={() => void signOut()}>退出当前登录</button></div>
        {message && <p className="auth-note" role="status">{message}</p>}
      </section>
    </main>
  )
}
