'use client'
import { useState, useEffect, useCallback } from 'react'
import { fetchApi } from '@/lib/api'
import Header from '@/components/layout/header'
import CcPromptButton from '@/components/cc-prompt-button'

interface StripeEvent {
  id: string
  stripeEventId: string
  eventType: string
  friendId: string | null
  amount: number | null
  currency: string | null
  metadata: Record<string, string> | null
  processedAt: string
}

const eventTypeConfig: Record<string, { label: string; className: string }> = {
  'payment_intent.succeeded': { label: '決済成功', className: 'bg-green-100 text-green-700' },
  'payment_intent.payment_failed': { label: '決済失敗', className: 'bg-red-100 text-red-700' },
  'customer.subscription.created': { label: 'SS開始', className: 'bg-blue-100 text-blue-700' },
  'customer.subscription.deleted': { label: 'SS解約', className: 'bg-gray-100 text-gray-600' },
  'customer.subscription.updated': { label: 'SS変更', className: 'bg-yellow-100 text-yellow-700' },
  'checkout.session.completed': { label: 'チェックアウト完了', className: 'bg-purple-100 text-purple-700' },
}

function formatAmount(amount: number | null, currency: string | null): string {
  if (amount === null) return '-'
  const curr = (currency ?? 'jpy').toLowerCase()
  if (curr === 'jpy') return '￥' + amount.toLocaleString('ja-JP')
  return (amount / 100).toLocaleString('en-US', { style: 'currency', currency: curr.toUpperCase() })
}

function formatDatetime(iso: string): string {
  return new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

const ccPrompts = [
  {
    title: 'Stripe決済分析',
    prompt: `Stripe決済データを分析してください。
1. 決済成功率と失敗の原因を分析
2. 月別売上トレンドと平均単価を集計
3. サブスクリプション解約率を分析し改善施策を提案
結果をレポートしてください。`,
  },
  {
    title: 'LTV向上施策',
    prompt: `Stripeデータを元にLTV向上施策を提案してください。
1. 高額購入ユーザーの特徴を分析
2. 決済後のLINEメッセージ配信シナリオを提案
3. 解約防止のトリガー設定を説明
具体的なアクションを示してください。`,
  },
]

export default function StripePage() {
  const [events, setEvents] = useState<StripeEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterType, setFilterType] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = filterType ? `?eventType=${encodeURIComponent(filterType)}` : ''
      const res = await fetchApi<{ success: boolean; data: StripeEvent[] }>(
        `/api/integrations/stripe/events${params}`
      )
      if (res.success) setEvents(res.data)
      else setError('データの読み込みに失敗しました')
    } catch {
      setError('データの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }, [filterType])

  useEffect(() => { load() }, [load])

  // Summary stats
  const successEvents = events.filter(e => e.eventType === 'payment_intent.succeeded')
  const totalRevenue = successEvents.reduce((sum, e) => sum + (e.amount ?? 0), 0)
  const failedCount = events.filter(e => e.eventType === 'payment_intent.payment_failed').length

  const eventTypes = [
    { value: '', label: 'すべて' },
    { value: 'payment_intent.succeeded', label: '決済成功' },
    { value: 'payment_intent.payment_failed', label: '決済失敗' },
    { value: 'customer.subscription.created', label: 'SS開始' },
    { value: 'customer.subscription.deleted', label: 'SS解約' },
    { value: 'checkout.session.completed', label: 'チェックアウト完了' },
  ]

  return (
    <div>
      <Header title="Stripe決済履歴" />

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      {/* Stats */}
      {!loading && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500">決済完了数</p>
            <p className="text-2xl font-bold" style={{ color: '#06C755' }}>{successEvents.length}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500">売上合計 (JPY)</p>
            <p className="text-2xl font-bold text-gray-900">￥{totalRevenue.toLocaleString('ja-JP')}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500">失敗数</p>
            <p className="text-2xl font-bold text-red-500">{failedCount}</p>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="mb-4 flex items-center gap-3">
        <label className="text-xs font-medium text-gray-600">イベントタイプ:</label>
        <select
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          {eventTypes.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <button
          onClick={load}
          className="px-3 py-1.5 text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#06C755' }}
        >
          更新
        </button>
      </div>

      {/* Events table */}
      {loading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400">読み込み中...</div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400">
          <p>イベントがまだありません</p>
          <p className="text-xs mt-2">Stripe Webhookを設定すると決済イベントが記録されます</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">イベントタイプ</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">金額</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">友だちID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">処理日時</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">StripeイベントID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {events.map((event) => {
                  const config = eventTypeConfig[event.eventType] ?? { label: event.eventType, className: 'bg-gray-100 text-gray-600' }
                  return (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.className}`}>
                          {config.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                        {formatAmount(event.amount, event.currency)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 font-mono truncate max-w-[120px]">
                        {event.friendId ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatDatetime(event.processedAt)}</td>
                      <td className="px-4 py-3 text-xs text-gray-400 font-mono truncate max-w-[160px]">
                        {event.stripeEventId}
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
