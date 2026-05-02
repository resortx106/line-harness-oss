'use client'
import { useState, useEffect, useCallback } from 'react'
import { fetchApi } from '@/lib/api'
import { useAccount } from '@/contexts/account-context'
import Header from '@/components/layout/header'
import Link from 'next/link'

interface ConversationItem {
  friendId: string
  lineUserId: string
  displayName: string | null
  lineAccountId: string | null
  lineAccountName: string | null
  lastIncomingAt: string
  hoursSince: number
  lastIncomingPreview: string | null
  lastIncomingType: string | null
  tags: string[]
}

interface ConversationsData {
  total: number
  items: ConversationItem[]
}

const HOUR_FILTERS = [
  { label: '全て', minHours: 0, maxHours: null },
  { label: '1時間以上', minHours: 1, maxHours: null },
  { label: '3時間以上', minHours: 3, maxHours: null },
  { label: '6時間以上', minHours: 6, maxHours: null },
  { label: '24時間以上', minHours: 24, maxHours: null },
  { label: '72時間以上', minHours: 72, maxHours: null },
]

function formatHours(hours: number): string {
  if (hours < 1) return Math.round(hours * 60) + '分前'
  if (hours < 24) return Math.round(hours) + '時間前'
  return Math.round(hours / 24) + '日前'
}

function formatDatetime(iso: string): string {
  return new Date(iso).toLocaleString('ja-JP', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function getUrgencyClass(hours: number): string {
  if (hours >= 72) return 'bg-red-100 text-red-700'
  if (hours >= 24) return 'bg-orange-100 text-orange-700'
  if (hours >= 6) return 'bg-yellow-100 text-yellow-700'
  return 'bg-blue-100 text-blue-700'
}

export default function ConversationsPage() {
  const { selectedAccountId } = useAccount()
  const [data, setData] = useState<ConversationsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [minHours, setMinHours] = useState(0)
  const [maxHours, setMaxHours] = useState<number | null>(null)
  const [page, setPage] = useState(0)
  const limit = 50

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({
        minHoursSince: String(minHours),
        limit: String(limit),
        offset: String(page * limit),
      })
      if (maxHours !== null) params.set('maxHoursSince', String(maxHours))
      if (selectedAccountId) params.set('lineAccountId', selectedAccountId)
      const res = await fetchApi<{ success: boolean; data: ConversationsData }>(
        '/api/conversations?' + params.toString()
      )
      if (res.success) setData(res.data)
      else setError('未返信一覧の読み込みに失敗しました。')
    } catch {
      setError('未返信一覧の読み込みに失敗しました。')
    } finally {
      setLoading(false)
    }
  }, [minHours, maxHours, selectedAccountId, page])

  useEffect(() => { load() }, [load])

  const handleFilterChange = (min: number, max: number | null) => {
    setMinHours(min)
    setMaxHours(max)
    setPage(0)
  }

  const totalPages = data ? Math.ceil(data.total / limit) : 0

  return (
    <div>
      <Header
        title="未返信インボックス"
        description="ユーザーからのメッセージに未返信の一覧"
      />

      {/* Filter Tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {HOUR_FILTERS.map((f) => {
          const isActive = minHours === f.minHours && maxHours === f.maxHours
          return (
            <button
              key={f.label}
              onClick={() => handleFilterChange(f.minHours, f.maxHours)}
              className={`px-3 py-1.5 min-h-[44px] text-xs font-medium rounded-full transition-colors ${
                isActive ? 'text-white' : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
              }`}
              style={isActive ? { backgroundColor: '#06C755' } : undefined}
            >
              {f.label}
              {data && isActive && (
                <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/30 text-[10px]">
                  {data.total}
                </span>
              )}
            </button>
          )
        })}
        <button
          onClick={load}
          className="px-3 py-1.5 min-h-[44px] text-xs font-medium rounded-full text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          更新
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      {/* Stats */}
      {data && !loading && (
        <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: '全未返信', value: data.total, color: 'text-gray-900' },
            { label: '24時間以上', value: data.items.filter(i => i.hoursSince >= 24).length, color: 'text-orange-600' },
            { label: '72時間以上', value: data.items.filter(i => i.hoursSince >= 72).length, color: 'text-red-600' },
            { label: '表示中', value: data.items.length, color: 'text-blue-600' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-lg border border-gray-200 px-4 py-3">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="px-4 py-3 border-b border-gray-100 animate-pulse flex items-center gap-4">
              <div className="h-8 w-8 bg-gray-200 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-32" />
                <div className="h-2 bg-gray-100 rounded w-48" />
              </div>
              <div className="h-5 bg-gray-100 rounded-full w-16" />
              <div className="h-3 bg-gray-100 rounded w-20" />
            </div>
          ))}
        </div>
      ) : data && data.items.length > 0 ? (
        <>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">友だち</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">最後のメッセージ</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">経過時間</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">受信日時</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">タグ</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.items.map((item) => (
                    <tr key={item.friendId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.displayName || '名前なし'}</p>
                          {item.lineAccountName && (
                            <p className="text-xs text-gray-400 mt-0.5">{item.lineAccountName}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-600 truncate max-w-xs">
                          {item.lastIncomingPreview || '-'}
                        </p>
                        {item.lastIncomingType && item.lastIncomingType !== 'text' && (
                          <span className="text-xs text-gray-400">[{item.lastIncomingType}]</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getUrgencyClass(item.hoursSince)}`}>
                          {formatHours(item.hoursSince)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                        {formatDatetime(item.lastIncomingAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {item.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                              {tag}
                            </span>
                          ))}
                          {item.tags.length > 3 && (
                            <span className="text-xs text-gray-400">+{item.tags.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Link
                            href={`/friends/${item.friendId}`}
                            className="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                          >
                            詳細
                          </Link>
                          <Link
                            href="/chats"
                            className="px-3 py-1 text-xs font-medium text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 rounded-md transition-colors"
                          >
                            返信
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {page * limit + 1}-{Math.min((page + 1) * limit, data.total)} / {data.total}件
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-40"
                >
                  前へ
                </button>
                <span className="px-3 py-1.5 text-xs text-gray-500">{page + 1} / {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-40"
                >
                  次へ
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500">未返信のメッセージはありません。</p>
        </div>
      )}
    </div>
  )
}
