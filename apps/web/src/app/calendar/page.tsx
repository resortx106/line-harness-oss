'use client'
import { useState, useEffect, useCallback } from 'react'
import { fetchApi } from '@/lib/api'
import { useAccount } from '@/contexts/account-context'
import Header from '@/components/layout/header'
import CcPromptButton from '@/components/cc-prompt-button'

interface CalendarConnection {
  id: string
  calendarId: string
  authType: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface CalendarBooking {
  id: string
  connectionId: string
  friendId: string | null
  eventId: string | null
  title: string
  startAt: string
  endAt: string
  status: string
  metadata: Record<string, unknown> | null
  createdAt: string
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: '保留中', className: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: '確定', className: 'bg-green-100 text-green-700' },
  cancelled: { label: 'キャンセル', className: 'bg-red-100 text-red-700' },
  completed: { label: '完了', className: 'bg-gray-100 text-gray-600' },
}

function formatDatetime(iso: string): string {
  return new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

const ccPrompts = [
  {
    title: 'カレンダー連携設定',
    prompt: `Googleカレンダー連携の設定をサポートしてください。
1. Google Calendar APIの認証トークン取得手順を説明
2. 予約管理のベストプラクティスを提案
3. LINEウェビナー・商誷シーンでの活用事例
手順を示してください。`,
  },
  {
    title: '予約データ分析',
    prompt: `カレンダー予約データを分析してください。
1. 予約状況別の内訳とキャンセル率を分析
2. 時間帯別予約数のピークを確認
3. リマインダー配信がキャンセル率に与える効果を提案
結果をレポートしてください。`,
  },
]

export default function CalendarPage() {
  const { selectedAccountId } = useAccount()
  const [connections, setConnections] = useState<CalendarConnection[]>([])
  const [bookings, setBookings] = useState<CalendarBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showConnect, setShowConnect] = useState(false)
  const [connectForm, setConnectForm] = useState({
    calendarId: '',
    authType: 'api_key',
    accessToken: '',
    refreshToken: '',
    apiKey: '',
  })
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [connRes, bookRes] = await Promise.allSettled([
        fetchApi<{ success: boolean; data: CalendarConnection[] }>('/api/integrations/google-calendar'),
        fetchApi<{ success: boolean; data: CalendarBooking[] }>('/api/integrations/google-calendar/bookings'),
      ])
      if (connRes.status === 'fulfilled' && connRes.value.success) {
        setConnections(connRes.value.data)
      }
      if (bookRes.status === 'fulfilled' && bookRes.value.success) {
        setBookings(bookRes.value.data)
      }
    } catch {
      setError('データの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }, [selectedAccountId])

  useEffect(() => { load() }, [load])

  const handleConnect = async () => {
    if (!connectForm.calendarId.trim()) {
      setConnectError('カレンダーIDを入力してください')
      return
    }
    setConnecting(true)
    setConnectError('')
    try {
      const body: Record<string, string> = {
        calendarId: connectForm.calendarId,
        authType: connectForm.authType,
      }
      if (connectForm.authType === 'oauth') {
        if (connectForm.accessToken) body.accessToken = connectForm.accessToken
        if (connectForm.refreshToken) body.refreshToken = connectForm.refreshToken
      } else {
        if (connectForm.apiKey) body.apiKey = connectForm.apiKey
      }
      await fetchApi('/api/integrations/google-calendar/connect', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      setShowConnect(false)
      setConnectForm({ calendarId: '', authType: 'api_key', accessToken: '', refreshToken: '', apiKey: '' })
      load()
    } catch {
      setConnectError('接続に失敗しました。入力内容を確認してください')
    } finally {
      setConnecting(false)
    }
  }

  const handleDeleteConnection = async (id: string) => {
    if (!confirm('このカレンダー連携を削除しますか？')) return
    try {
      await fetchApi(`/api/integrations/google-calendar/${id}`, { method: 'DELETE' })
      load()
    } catch {
      setError('削除に失敗しました')
    }
  }

  const handleCancelBooking = async (id: string) => {
    if (!confirm('この予約をキャンセルしますか？')) return
    try {
      await fetchApi(`/api/integrations/google-calendar/bookings/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'cancelled' }),
      })
      load()
    } catch {
      setError('キャンセルに失敗しました')
    }
  }

  const pendingCount = bookings.filter(b => b.status === 'pending').length
  const confirmedCount = bookings.filter(b => b.status === 'confirmed').length

  return (
    <div>
      <Header
        title="カレンダー連携"
        action={
          <button
            onClick={() => setShowConnect(true)}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#06C755' }}
          >
            + Googleカレンダーを接続
          </button>
        }
      />

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      {/* Stats */}
      {!loading && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500">連携数</p>
            <p className="text-2xl font-bold text-gray-900">{connections.length}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500">保留中</p>
            <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500">確定済み</p>
            <p className="text-2xl font-bold" style={{ color: '#06C755' }}>{confirmedCount}</p>
          </div>
        </div>
      )}

      {/* Connect form */}
      {showConnect && (
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Googleカレンダーを接続</h2>
          <div className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">カレンダーID <span className="text-red-500">*</span></label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="例: your-calendar@group.calendar.google.com"
                value={connectForm.calendarId}
                onChange={(e) => setConnectForm({ ...connectForm, calendarId: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">認証方式</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                value={connectForm.authType}
                onChange={(e) => setConnectForm({ ...connectForm, authType: e.target.value })}
              >
                <option value="api_key">APIキー</option>
                <option value="oauth">OAuth2.0</option>
              </select>
            </div>
            {connectForm.authType === 'api_key' ? (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Google APIキー</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="AIza..."
                  value={connectForm.apiKey}
                  onChange={(e) => setConnectForm({ ...connectForm, apiKey: e.target.value })}
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">アクセストークン</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="ya29..."
                    value={connectForm.accessToken}
                    onChange={(e) => setConnectForm({ ...connectForm, accessToken: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">リフレッシュトークン</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="1//..."
                    value={connectForm.refreshToken}
                    onChange={(e) => setConnectForm({ ...connectForm, refreshToken: e.target.value })}
                  />
                </div>
              </>
            )}
            {connectError && <p className="text-xs text-red-600">{connectError}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 transition-opacity"
                style={{ backgroundColor: '#06C755' }}
              >
                {connecting ? '接続中...' : '接続'}
              </button>
              <button
                onClick={() => { setShowConnect(false); setConnectError('') }}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connections */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">接続中のカレンダー</h2>
        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-400">読み込み中...</div>
        ) : connections.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-400">
            Googleカレンダーが未接続です。「+ Googleカレンダーを接続」から追加してください。
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {connections.map((conn) => (
              <div key={conn.id} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{conn.calendarId}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{conn.authType}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${conn.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {conn.isActive ? '有効' : '無効'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">登録日: {new Date(conn.createdAt).toLocaleDateString('ja-JP')}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteConnection(conn.id)}
                    className="ml-2 text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded bg-red-50 hover:bg-red-100 transition-colors"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bookings */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">予約一覧</h2>
        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-400">読み込み中...</div>
        ) : bookings.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-400">予約がまだありません</div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">タイトル</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">開始</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">終了</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {bookings.map((booking) => {
                    const sc = statusConfig[booking.status] ?? { label: booking.status, className: 'bg-gray-100 text-gray-600' }
                    return (
                      <tr key={booking.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{booking.title}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{formatDatetime(booking.startAt)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{formatDatetime(booking.endAt)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.className}`}>{sc.label}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                            <button
                              onClick={() => handleCancelBooking(booking.id)}
                              className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded bg-red-50 hover:bg-red-100 transition-colors"
                            >
                              キャンセル
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <CcPromptButton prompts={ccPrompts} />
    </div>
  )
}
