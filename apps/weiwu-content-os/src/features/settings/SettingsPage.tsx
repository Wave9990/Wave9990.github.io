import { Download, FileCheck2, MailPlus, RotateCcw, ShieldCheck, UserRoundX } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { restoreContentItem } from '../../repositories/contentRepository'
import {
  contentToCsv,
  downloadTextFile,
  getWorkspaceExportData,
  listArchivedContentItems,
  parseWorkspaceBackup,
  workspaceExportFilename,
  type ArchivedContentItem,
  type WorkspaceBackup
} from '../../repositories/exportRepository'
import { useAuth } from '../../providers/AuthProvider'
import { inviteReadonlyMember, listWorkspaceInvitations, revokeReadonlyMember, type WorkspaceInvitation } from '../../repositories/memberRepository'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function BackupPreview({ backup }: { backup: WorkspaceBackup }) {
  return (
    <section className="backup-preview" aria-live="polite">
      <FileCheck2 size={20} aria-hidden="true" />
      <div>
        <strong>备份文件格式可恢复</strong>
        <p>导出于 {formatDate(backup.exportedAt)} · {backup.content.length} 条内容、{backup.scripts.length} 个脚本、{backup.shootTasks.length} 个拍摄任务</p>
      </div>
    </section>
  )
}

export function SettingsPage() {
  const { workspace, user, membership } = useAuth()
  const [archives, setArchives] = useState<ArchivedContentItem[]>([])
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([])
  const [isLoadingArchives, setIsLoadingArchives] = useState(true)
  const [isExporting, setIsExporting] = useState<'json' | 'csv' | null>(null)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [backupPreview, setBackupPreview] = useState<WorkspaceBackup | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [isInviting, setIsInviting] = useState(false)
  const [revokingInvitationId, setRevokingInvitationId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isOwner = membership?.role === 'owner'

  const reloadArchives = useCallback(async () => {
    if (!workspace || !isOwner) {
      setArchives([])
      setIsLoadingArchives(false)
      return
    }
    setIsLoadingArchives(true)
    try {
      setArchives(await listArchivedContentItems(workspace.id))
      setError(null)
    } catch {
      setError('归档内容暂时无法读取，请检查网络后重试。')
    } finally {
      setIsLoadingArchives(false)
    }
  }, [isOwner, workspace])

  useEffect(() => {
    void reloadArchives()
  }, [reloadArchives])

  const reloadInvitations = useCallback(async () => {
    if (!workspace || !isOwner) {
      setInvitations([])
      return
    }
    try {
      setInvitations(await listWorkspaceInvitations(workspace.id))
    } catch {
      setError('成员邀请暂时无法读取，请检查网络后重试。')
    }
  }, [isOwner, workspace])

  useEffect(() => {
    void reloadInvitations()
  }, [reloadInvitations])

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!workspace || !isOwner) return
    setIsInviting(true)
    setError(null)
    setNotice(null)
    try {
      const result = await inviteReadonlyMember(workspace.id, inviteEmail)
      setInviteEmail('')
      setNotice(result.message)
      await reloadInvitations()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '邀请失败，请稍后重试。')
    } finally {
      setIsInviting(false)
    }
  }

  async function handleRevoke(invitation: WorkspaceInvitation) {
    if (!workspace || !isOwner) return
    setRevokingInvitationId(invitation.id)
    setError(null)
    setNotice(null)
    try {
      const result = await revokeReadonlyMember(workspace.id, invitation.id)
      setNotice(result.message)
      setInvitations((current) => current.filter((item) => item.id !== invitation.id))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '撤销失败，请稍后重试。')
    } finally {
      setRevokingInvitationId(null)
    }
  }

  async function handleExport(kind: 'json' | 'csv') {
    if (!workspace || !isOwner) return
    setIsExporting(kind)
    setNotice(null)
    setError(null)
    try {
      const data = await getWorkspaceExportData(workspace.id)
      if (kind === 'json') {
        downloadTextFile(workspaceExportFilename(workspace.id, 'json'), JSON.stringify(data.backup, null, 2), 'application/json')
      } else {
        downloadTextFile(workspaceExportFilename(workspace.id, 'csv'), contentToCsv(data.contentRows), 'text/csv')
      }
      setNotice(kind === 'json' ? 'JSON 备份已开始下载。' : 'CSV 内容清单已开始下载。')
    } catch {
      setError('导出失败，请检查网络后重试。')
    } finally {
      setIsExporting(null)
    }
  }

  async function handleRestore(item: ArchivedContentItem) {
    if (!workspace || !user || !isOwner) return
    setRestoringId(item.id)
    setNotice(null)
    setError(null)
    try {
      await restoreContentItem(workspace.id, user.id, item.id)
      setArchives((current) => current.filter((archive) => archive.id !== item.id))
      setNotice(`已恢复「${item.title}」，恢复动作已记入动态。`)
    } catch {
      setError('恢复失败，请检查网络后重试。')
    } finally {
      setRestoringId(null)
    }
  }

  async function handlePreview(file: File | undefined) {
    setError(null)
    setNotice(null)
    setBackupPreview(null)
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      setError('备份文件超过 10 MB，暂不支持直接预览。')
      return
    }
    try {
      setBackupPreview(parseWorkspaceBackup(await file.text()))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '备份文件格式无效。')
    }
  }

  return (
    <section className="settings-page">
      <header className="settings-heading">
        <div>
          <p className="eyebrow">PRIVATE WORKSPACE</p>
          <h1>我的工作台</h1>
          <p>内容、脚本和拍摄记录只在当前私有工作区内同步；导出始终由拥有者在本地发起。</p>
        </div>
        <span className={`workspace-role${isOwner ? ' workspace-role--owner' : ''}`}>{isOwner ? '拥有者' : '仅查看'}</span>
      </header>

      <section className="settings-card settings-account" aria-labelledby="account-title">
        <div className="section-title-row"><div><p className="eyebrow">ACCESS & SYNC</p><h2 id="account-title">访问与同步</h2></div><ShieldCheck size={24} aria-hidden="true" /></div>
        <dl className="settings-facts">
          <div><dt>登录账号</dt><dd>{user?.email ?? '未识别账号'}</dd></div>
          <div><dt>当前工作区</dt><dd>{workspace?.name ?? '未准备好'}</dd></div>
          <div><dt>权限范围</dt><dd>{isOwner ? '可创建、修改、导出和恢复' : '仅查看已授权内容'}</dd></div>
        </dl>
        <p className="settings-card-note">电脑和手机登录同一账号后读取同一套云端记录。只读成员会明确显示「仅查看」，并隐藏修改、恢复和导出入口。</p>
      </section>

      <section className="settings-card" aria-labelledby="member-title">
        <div className="section-title-row"><div><p className="eyebrow">MEMBER ACCESS</p><h2 id="member-title">只读成员</h2></div><MailPlus size={24} aria-hidden="true" /></div>
        <p className="settings-card-note">按邮箱指定访问权限。新成员会收到账号邀请邮件；已有账号则立即获得只读权限。只读成员始终不能创建、修改、导出或恢复内容。</p>
        {isOwner ? <>
          <form className="member-invite-form" onSubmit={(event) => void handleInvite(event)}>
            <label htmlFor="member-email"><span className="sr-only">成员邮箱</span><input id="member-email" type="email" autoComplete="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="输入要授权的邮箱" required disabled={isInviting} /></label>
            <Button type="submit" disabled={isInviting}>{isInviting ? '正在邀请…' : '邀请为只读成员'}</Button>
          </form>
          <div className="member-invite-list" aria-live="polite">
            {invitations.length === 0 ? <p className="settings-empty">还没有已指定的成员邮箱。</p> : invitations.map((invitation) => <article key={invitation.id} className="member-invite-row">
              <div><strong>{invitation.email}</strong><span>{invitation.accepted_at ? `已可访问 · ${formatDate(invitation.accepted_at)}` : '等待对方完成账号设置'} · 仅查看</span></div>
              <Button variant="ghost" onClick={() => void handleRevoke(invitation)} disabled={revokingInvitationId !== null}><UserRoundX size={15} />{revokingInvitationId === invitation.id ? '撤销中…' : '撤销权限'}</Button>
            </article>)}
          </div>
        </> : <p className="readonly-notice">仅拥有者可以邀请或移除成员。</p>}
      </section>

      <section className="settings-card" aria-labelledby="backup-title">
        <div className="section-title-row"><div><p className="eyebrow">LOCAL BACKUP</p><h2 id="backup-title">备份与导出</h2></div></div>
        <p className="settings-card-note">导出不会上传任何内容：JSON 用于完整备份，CSV 用于快速查看内容清单。请在每次数据库结构调整前保留一份 JSON 备份。</p>
        {isOwner ? <div className="settings-actions">
          <Button onClick={() => void handleExport('json')} disabled={isExporting !== null}><Download size={16} />{isExporting === 'json' ? '正在导出…' : '下载完整 JSON 备份'}</Button>
          <Button variant="secondary" onClick={() => void handleExport('csv')} disabled={isExporting !== null}><Download size={16} />{isExporting === 'csv' ? '正在导出…' : '下载内容 CSV'}</Button>
        </div> : <p className="readonly-notice">仅查看成员不可以导出或恢复工作区数据。</p>}
        {isOwner && <div className="backup-validate">
          <div><strong>预览已有备份</strong><p>先验证 JSON 的版本与内容数量；第一版不自动覆盖云端数据，避免误恢复。</p></div>
          <input ref={inputRef} type="file" accept="application/json,.json" className="sr-only" onChange={(event) => void handlePreview(event.target.files?.[0])} />
          <Button variant="ghost" onClick={() => inputRef.current?.click()}>选择 JSON 文件</Button>
        </div>}
        {backupPreview && <BackupPreview backup={backupPreview} />}
      </section>

      <section className="settings-card" aria-labelledby="archive-title">
        <div className="section-title-row"><div><p className="eyebrow">RECOVERABLE ARCHIVE</p><h2 id="archive-title">可恢复归档</h2></div>{isOwner && <Button variant="ghost" onClick={() => void reloadArchives()} disabled={isLoadingArchives}>刷新</Button>}</div>
        <p className="settings-card-note">归档不会删除关联脚本和拍摄记录。恢复会将内容重新设为可见，并留下完整的恢复审计记录。</p>
        {error && <p className="settings-message settings-message--error" role="alert">{error}</p>}
        {notice && <p className="settings-message" role="status">{notice}</p>}
        {!isOwner ? <p className="readonly-notice">仅查看成员不可以恢复归档内容。</p> : isLoadingArchives ? <p className="settings-empty">正在读取可恢复归档…</p> : archives.length === 0 ? <p className="settings-empty">目前没有可恢复的归档内容。</p> : <ul className="archive-list">{archives.map((item) => <li key={item.id}><div><strong>{item.title}</strong><span>{item.trackName} · 归档于 {formatDate(item.deletedAt)}</span></div><Button variant="secondary" onClick={() => void handleRestore(item)} disabled={restoringId !== null}><RotateCcw size={15} />{restoringId === item.id ? '恢复中…' : '恢复'}</Button></li>)}</ul>}
      </section>
    </section>
  )
}
