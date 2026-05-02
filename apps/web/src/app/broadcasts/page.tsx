'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import type { Tag } from '@line-crm/shared'
import { api, type ApiBroadcast, type BroadcastInsight } from '@/lib/api'
import { useAccount } from '@/contexts/account-context'
import Header from '@/components/layout/header'
import BroadcastForm from '@/components/broadcasts/broadcast-form'
import BroadcastDetail from '@/components/broadcasts/broadcast-detail'
import CcPromptButton from '@/components/cc-prompt-button'

const ccPrompts = [
  {
    title: '配信メッセージを作成',
    prompt: `一斉配信用のメッセージを作成してください。
1. 配信目的: [目的を指定]
2. ターゲット: 全員 / タグ指定
3. メッセージタイプ: テキスト / 画像 / Flex
効果的なメッセージ文面を提案してください。`,
  },
  {
    title: '配信スケジュール最適化',
    prompt: `配信スケジュールを最適化してください。
1. 過去の配信実績から最適な時間帯を分析
2. 曜日別の開封率を確認
3. 推奨スケジュールを提案
データに基づいた根拠も示してください。`,
  },
]

const statusConfig: Record<ApiBroadcast['status'], { label: string; className: string }> = {
  draft: { label: '下書き', className: 'bg-gray-100 text-gray-600' },
  scheduled: { label: '予約済み', className: 'bg-blue-100 text-blue-700' },
  sending: { label: '送信中', className: 'bg-yellow-100 text-yellow-700' },
  sent: { label: '送信完了', className: 'bg-green-100 text-green-700' },
}

function formatDatetime(iso: string | null): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

// テスト送信先設定パネル
function TestSendSettings({ accountId }: { accountId: string }) {
  const [recipients, setRecipients] = useState<{ id: string; displayName: string; pictureUrl: string | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchFriendId, setSearchFriendId] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await api.accountSettings.getTestRecipients(accountId)
        if (res.success) setRecipients(res.data)
      } catch { /* ignore */ }
      setLoading(false)
    }
    load()
  }, [accountId])

  const handleAdd = async () => {
    if (!searchFriendId.trim()) return
    const exists = recipients.find(r => r.id === searchFriendId.trim())
    if (exists) { setError('すでに追加されています'); return }
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const newIds = [...recipients.map(r => r.id), searchFriendId.trim()]
      await api.accountSettings.updateTestRecipients(accountId, newIds)
      const res = await api.accountSettings.getTestRecipients(accountId)
      if (res.success) setRecipients(res.data)
      setSearchFriendId('')
      setSuccess('追加しました')
    } catch {
      setError('追加に失敗しました')
    }
    setSaving(false)
  }

  const handleRemove = async (id: string) => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const newIds = recipients.filter(r => r.id !== id).map(r => r.id)
      await api.accountSettings.updateTestRecipients(accountId, newIds)
      setRecipients(prev => prev.filter(r => r.id !== id))
      setSuccess('削除しました')
    } catch {
      setError('削除に失敗しました')
    }
    setSaving(false)
  }

  if (loading) return <div className="text-xs text-gray-400">読み込み中...</div>

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">
        テスト送信先に設定した友だちに送信されます。友だちのIDを入力して追加してください。
      </p>
      <div className="flex items-center gap-2 mb-3">
        <input
          type="text"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="友だちIDを入力"
          value={searchFriendId}
          onChange={(e) => setSearchFriendId(e.target.value)}
        />
        <button
          onClick={handleAdd}
          disabled={saving || !searchFriendId.trim()}
          className="px-3 py-1.5 text-sm font-medium text-white rounded-lg disabled:opacity-50 transition-opacity"
          style={{ backgroundColor: '#06C755' }}
        >
          追加
        </button>
      </div>
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      {success && <p className="text-xs text-green-600 mb-2">{success}</p>}
      {recipients.length === 0 ? (
        <p className="text-xs text-gray-400">テスト送信先がまだ設定されていません</p>
      ) : (
        <div className="space-y-2">
          {recipients.map((r) => (
            <div key={r.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
              {r.pictureUrl ? (
                <img src={r.pictureUrl} alt={r.displayName} className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs">{r.displayName?.charAt(0) ?? '?'}</div>
              )}
              <span className="flex-1 text-sm text-gray-700">{r.displayName}</span>
              <button onClick={() => handleRemove(r.id)} disabled={saving} className="text-xs text-red-500 hover:text-red-700">削除</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function BroadcastsPage() {
  const searchParams = useSearchParams()
  const detailId = searchParams.get('id')
  if (detailId) {
    return <BroadcastDetail broadcastId={detailId} />
  }
  return <BroadcastList />
}

function BroadcastList() {
  const { selectedAccountId } = useAccount()
  const [broadcasts, setBroadcasts] = useState<ApiBroadcast[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showTestSettings, setShowTestSettings] = useState(false)
  const [insights, setInsights] = useState<Record<string, BroadcastInsight>>({})
  const [fetchingInsight, setFetchingInsight] = useState<string | null>(null)

  const loadInsight = async (id: string) => {
    try {
      const res = await api.broadcasts.getInsight(id)
      if (res.success && res.data) {
        setInsights(prev => ({ ...prev, [id]: res.data! }))
      }
    } catch { /* ignore */ }
  }

  const handleFetchInsight = async (id: string) => {
    setFetchingInsight(id)
    try {
      const res = await api.broadcasts.fetchInsight(id)
      if (res.success && res.data) {
        setInsights(prev => ({ ...prev, [id]: res.data }))
      }
    } catch {
      setError('インサイトの取得に失敗しました')
    } finally {
      setFetchingInsight(null)
    }
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [broadcastsRes, tagsRes] = await Promise.all([
        api.broadcasts.list({ accountId: selectedAccountId || undefined }),
        api.tags.list(),
      ])
      if (broadcastsRes.success) setBroadcasts(broadcastsRes.data)
      else setError(broadcastsRes.error)
      if (tagsRes.success) setTags(tagsRes.data)
    } catch {
      setError('データの読み込みに失敗しました。もう一度お試しください。')
    } finally {
      setLoading(false)
    }
  }, [selectedAccountId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    broadcasts.filter(b => b.status === 'sent').forEach(b => loadInsight(b.id))
  }, [broadcasts])

  const handleDelete = async (id: string) => {
    if (!confirm('この配信を削除してもよいですか？')) return
    try {
      await api.broadcasts.delete(id)
      load()
    } catch {
      setError('削除に失敗しました')
    }
  }

  const getTagName = (tagId: string | null) => {
    if (!tagId) return null
    return tags.find((t) => t.id === tagId)?.name ?? null
  }

  return (
    <div>
      <Header
        title="一斉配信"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTestSettings(!showTestSettings)}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              テスト送信先設定
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#06C755' }}
            >
              + 新規配信
            </button>
          </div>
        }
      />

      {/* テスト送信先設定パネル */}
      {showTestSettings && selectedAccountId && (
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-800">テスト送信先設定</h2>
            <button onClick={() => setShowTestSettings(false)} className="text-xs text-gray-400 hover:text-gray-600">閉じる</button>
          </div>
          <TestSendSettings accountId={selectedAccountId} />
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      {showCreate && (
        <BroadcastForm tags={tags} onSuccess={() => { setShowCreate(false); load() }} onCancel={() => setShowCreate(false)} />
      )}

      {loading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="px-4 py-4 border-b border-gray-100 flex items-center gap-4 animate-pulse">
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-48" />
                <div className="h-2 bg-gray-100 rounded w-32" />
              </div>
              <div className="h-5 bg-gray-100 rounded-full w-16" />
              <div className="h-3 bg-gray-100 rounded w-24" />
            </div>
          ))}
        </div>
      ) : broadcasts.length === 0 && !showCreate ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500">配信がありません。「新規配信」から作成してください。</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">配信タイトル</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ステータス</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">配信対象</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">予約日時</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">送信完了日時</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">実績</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {broadcasts.map((broadcast) => {
                  const statusInfo = statusConfig[broadcast.status]
                  const tagName = getTagName(broadcast.targetTagId)
                  return (
                    <tr key={broadcast.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <a href={`/broadcasts?id=${broadcast.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline">
                            {broadcast.title}
                          </a>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {broadcast.messageType === 'text' ? 'テキスト' : broadcast.messageType === 'image' ? '画像' : 'Flex'}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.className}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {broadcast.targetType === 'all' ? '全員' : tagName ? <span>タグ: {tagName}</span> : 'タグ指定'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatDatetime(broadcast.scheduledAt)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatDatetime(broadcast.sentAt)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {broadcast.status === 'sent' ? (
                          <div>
                            {broadcast.totalCount > 0 && (
                              <p>{broadcast.successCount.toLocaleString('ja-JP')} / {broadcast.totalCount.toLocaleString('ja-JP')} 件</p>
                            )}
                            {insights[broadcast.id] ? (
                              <div className="mt-1 space-y-0.5">
                                {insights[broadcast.id].delivered != null && (
                                  <p className="text-xs">配信: <span className="font-medium text-gray-700">{insights[broadcast.id].delivered!.toLocaleString('ja-JP')}</span></p>
                                )}
                                {insights[broadcast.id].uniqueImpression != null && (
                                  <p className="text-xs">開封: <span className="font-medium text-blue-600">{insights[broadcast.id].uniqueImpression!.toLocaleString('ja-JP')}</span>
                                    {insights[broadcast.id].openRate != null && (
                                      <span className="text-gray-400"> ({(insights[broadcast.id].openRate! * 100).toFixed(1)}%)</span>
                                    )}
                                  </p>
                                )}
                                {insights[broadcast.id].uniqueClick != null && (
                                  <p className="text-xs">クリック: <span className="font-medium text-green-600">{insights[broadcast.id].uniqueClick!.toLocaleString('ja-JP')}</span>
                                    {insights[broadcast.id].clickRate != null && (
                                      <span className="text-gray-400"> ({(insights[broadcast.id].clickRate! * 100).toFixed(1)}%)</span>
                                    )}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <button onClick={() => handleFetchInsight(broadcast.id)} disabled={fetchingInsight === broadcast.id} className="mt-1 text-xs text-blue-500 hover:text-blue-700 disabled:opacity-50">
                                {fetchingInsight === broadcast.id ? '取得中...' : 'インサイトを取得'}
                              </button>
                            )}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {(broadcast.status === 'draft' || broadcast.status === 'scheduled') && (
                            <button onClick={() => handleDelete(broadcast.id)} className="px-3 py-1 min-h-[44px] text-xs font-medium text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors">
                              削除
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <CcPromptButton prompts={ccPrompts} />
    </div>
  )
}
