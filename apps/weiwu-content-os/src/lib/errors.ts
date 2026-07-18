const authErrorPatterns = [
  /network|fetch|timeout|offline|failed to fetch/i,
  /rate limit|too many requests/i,
  /invalid.*email|email.*invalid/i
]

/**
 * Supabase error messages may include implementation details.  The app only
 * exposes short, actionable language to the workspace owner.
 */
export function authErrorMessage(error: unknown, fallback = '暂时无法完成操作，请稍后重试。') {
  const message = error instanceof Error ? error.message : ''

  if (authErrorPatterns[0].test(message)) return '网络连接不稳定，请检查网络后重试。'
  if (authErrorPatterns[1].test(message)) return '请求过于频繁，请稍后再试。'
  if (authErrorPatterns[2].test(message)) return '请输入有效的邮箱地址。'

  return fallback
}
