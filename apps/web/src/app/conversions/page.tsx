'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import type { ConversionPoint } from '@line-crm/shared'
import Header from '@/components/layout/header'
import CcPromptButton from '@/components/cc-prompt-button'

interface ReportRow {
  conversionPointId: string
  conversionPointName: string
  eventType: string
  totalCount: number
  totalValue: number
}

type PeriodKey = 'week' | 'month' | 'quarter' | 'custom'

const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: 'week', label: '先週' },
  { key: 'month', label: '先月' },
  { key: 'quarter', label: '過去3ヶ月' },
  { key: 'custom', label: 'カスタム' },
]

function getPeriodDates(period: PeriodKey): { startDate: string; endDate: string } {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

  const endDate = fmt(now)
  let startDate: string
  if (period === 'week') {
    const d = new Date(now); d.setDate(d.getDate() - 7); startDate = fmt(d)
  } else if (period === 'month') {
    const d = new Date(now); d.setMonth(d.getMonth() - 1); startDate = fmt(d)
  } else {
    const d = new Date(now); d.setMonth(d.getMonth() - 3); startDate = fmt(d)
  }
  return { startDate, endDate }
}

const ccPrompts = [
  {
    title: 'CVレポート分析',
    prompt: `コンバージョンのレポートを分析してください。
1. 期間別CV数・単価合計の推移を表示
2. 最も効果的なCVポイントを特定
3. CV改善のための具体的な提案を行ってください。`,
  },
]

export default function ConversionsPage() {
  const [points, setPoints] = useState<ConversionPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', eventType: '', value: '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // Report state
  const [reportRows, setReportRows] = useState<ReportRow[]>([])
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState('')
  const [period, setPeriod] = useState<PeriodKey>('month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const loadPoints = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.conversions.points()
      if (res.success) setPoints(res.data)
      else setError(res.error)
    } catch {
      setError('CVポイントの読み込みに失敗しました。もう一度お試しください。')
    } finally {
      setLoading(false)
    }
  }

  const loadReport = async (p: PeriodKey, cStart?: string, cEnd?: string) => {
    setReportLoading(true)
    setReportError('')
    try {
      const { startDate, endDate } = p === 'custom'
        ? { startDate: cStart || customStart, endDate: cEnd || customEnd }
        : getPeriodDates(p)
      if (!startDate || !endDate) { setReportLoading(false); return }
      const res = await api.conversions.report({ startDate, endDate })
      if (res.success) setReportRows(res.data)
      else setReportError('レポートの読み込みに失敗しました。')
    } catch {
      setReportError('レポートの読み込みに失敗しました。')
    } finally {
      setReportLoading(false)
    }
  }

  useEffect(() => {
    loadPoints()
    loadReport('month')
  }, [])

  const handlePeriodChange = (p: PeriodKey) => {
    setPeriod(p)
    if (p !== 'custom') loadReport(p)
  }

  const handleCustomApply = () => {
    loadReport('custom', customStart, customEnd)
  }

  const handleCreate = async () => {
    if (!form.name.trim()) { setFormError('名前を入力してください'); return }
    if (!form.eventType.trim()) { setFormError('イベントタイプを入力してください'); return }
    setSaving(true)
    setFormError('')
    try {
      const res = await api.conversions.createPoint({
        name: form.name,
        eventType: form.eventType,
        value: form.value ? Number(form.value) : null,
      })
      if (res.success) {
        setShowCreate(false)
        setForm({ name: '', eventType: '', value: '' })
        loadPoints()
      } else {
        setFormError(res.error)
      }
    } catch {
      setFormError('作成に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('このCVポイントを削除しますか？')) return
    try {
      await api.conversions.deletePoint(id)
      loadPoints()
    } catch {
      setError('削除に失敗しました')
    }
  }

  const totalCv = reportRows.reduce((s, r) => s + r.totalCount, 0)
  const totalVal = reportRows.reduce((s, r) => s + r.totalValue, 0)
  const maxCount = Math.max(...reportRows.map((r) => r.totalCount), 1)

  return (
    <div>
      <Header
        title="CV計測"
        action={
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#06C755' }}
          >
            + CVポイント追加
          </button>
        }
      />

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">CVポイント追加</h2>
          <div className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">ポイント名 <span className="text-red-500">*</span></label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="例: 資料請求CV"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">イベントタイプ <span className="text-red-500">*</span></label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="例: form_submit, purchase, signup"
                value={form.eventType}
                onChange={(e) => setForm({ ...form, eventType: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">単価 (円)</label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="例: 1000"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
              />
            </div>
            {formError && <p className="text-xs text-red-600">{formError}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 transition-opacity"
                style={{ backgroundColor: '#06C755' }}
              >
                {saving ? '作成中...' : '作成'}
              </button>
              <button
                onClick={() => { setShowCreate(false); setFormError('') }}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CV Report Section */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <h2 className="text-sm font-semibold text-gray-800">期間別レポート</h2>
          <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => handlePeriodChange(opt.key)}
                className={`px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-full transition-colors ${
                  period === opt.key ? 'text-white' : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                }`}
                style={period === opt.key ? { backgroundColor: '#06C755' } : undefined}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {period === 'custom' && (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <span className="text-xs text-gray-400">〜</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                onClick={handleCustomApply}
                disabled={!customStart || !customEnd}
                className="px-3 py-1 text-xs font-medium text-white rounded-lg disabled:opacity-50"
                style={{ backgroundColor: '#06C755' }}
              >
                適用
              </button>
            </div>
          )}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
            <p className="text-xs text-gray-500">総 CV数</p>
            <p className="text-2xl font-bold text-gray-900">{totalCv.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
            <p className="text-xs text-gray-500">総単価合計</p>
            <p className="text-2xl font-bold text-green-600">￥{totalVal.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
            <p className="text-xs text-gray-500">CVポイント数</p>
            <p className="text-2xl font-bold text-blue-600">{reportRows.length}</p>
          </div>
        </div>

        {/* Report table */}
        {reportLoading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-400 text-sm">レポートを読み込み中...</p>
          </div>
        ) : reportError ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{reportError}</div>
        ) : reportRows.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-400 text-sm">選択した期間のCVデータがありません。</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">CVポイント</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">イベント</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">CV数</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">単価合計</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">割合</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reportRows.map((row) => (
                    <tr key={row.conversionPointId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{row.conversionPointName}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                          {row.eventType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                        {row.totalCount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-green-600">
                        {row.totalValue > 0 ? `￥${row.totalValue.toLocaleString()}` : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5 min-w-[60px]">
                            <div
                              className="h-1.5 rounded-full"
                              style={{
                                width: `${Math.round((row.totalCount / maxCount) * 100)}%`,
                                backgroundColor: '#06C755',
                              }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 w-8 text-right">
                            {Math.round((row.totalCount / totalCv) * 100)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* CV Points */}
      <div>
        <h2 className="text-sm font-semibold text-gray-800 mb-3">CVポイント一覧</h2>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-5 animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-full" />
                <div className="flex gap-4"><div className="h-3 bg-gray-100 rounded w-24" /></div>
              </div>
            ))}
          </div>
        ) : points.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-500">CVポイントがありません。「CVポイント追加」から登録してください。</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
            {points.map((point) => (
              <div key={point.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{point.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{point.eventType}</p>
                  </div>
                  {point.value != null && (
                    <span className="text-sm font-semibold text-green-600">￥{Number(point.value).toLocaleString()}</span>
                  )}
                </div>
                <div className="mt-auto pt-2 border-t border-gray-100">
                  <button
                    onClick={() => handleDelete(point.id)}
                    className="text-xs text-red-500 hover:text-red-700 transition-colors"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CcPromptButton prompts={ccPrompts} />
    </div>
  )
}
