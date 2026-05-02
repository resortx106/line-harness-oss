'use client'
import { useState, useEffect, useCallback } from 'react'
import { fetchApi, api } from '@/lib/api'
import { useAccount } from '@/contexts/account-context'
import Header from '@/components/layout/header'
import CcPromptButton from '@/components/cc-prompt-button'

interface Affiliate {
  id: string
  name: string
  code: string
  commissionRate: number
  isActive: boolean
  createdAt: string
}

interface AffiliateReport {
  affiliateId: string
  affiliateName: string
  code: string
  commissionRate: number
  totalClicks: number
  totalConversions: number
  totalRevenue: number
}

interface LineAccount {
  id: string
  channelId: string
  name: string
}

const ccPrompts = [
  {
    title: 'アフィリエイト分析',
    prompt: '流入経路別の友だち獲得成果を分析してください。
1. 各経路のクリック数・CV数・売上を比較
2. CVR（クリック→CV率）が高い経路の特徴を分析
3. 投賄対効果が低い経路の改善提案
具体的な改善案を提示してください。',
  },
  {
    title: '新規流入経路の提案',
    prompt: '新しい流入経路を追加するみです。
1. 現在のターゲット層に実効性が高いチャネルの提案
2. 各チャネル用のrefコードの命名規則の提案
3. カラー・キャンペーンに最適な配信コンテンツの提案
具体的な計画を提示してください。',
  },
]

export default function AffiliatesPage() {
  const { selectedAccountId } = useAccount()
  const [affiliates, setAffiliates] = useState<Affiliate[]>([])
  const [lineAccount, setLineAccount] = useState<LineAccount | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formCode, setFormCode] = useState('')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [qrTarget, setQrTarget] = useState<{ code: string; url: string } | null>(null)
  // Report state
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null)
  const [reports, setReports] = useState<Record<string, AffiliateReport | null>>({})
  const [reportsLoading, setReportsLoading] = useState<Record<string, boolean>>({})

  const loadAffiliates = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = selectedAccountId ? `?accountId=${selectedAccountId}` : ''
      const data = await fetchApi<Affiliate[] | { items: Affiliate[] } | { success: boolean; data: Affiliate[] }>(`/api/affiliates${params}`)
      if (Array.isArray(data)) {
        setAffiliates(data)
      } else if ('items' in data && Array.isArray(data.items)) {
        setAffiliates(data.items)
      } else if ('data' in data && Array.isArray(data.data)) {
        setAffiliates(data.data)
      } else {
        setAffiliates([])
      }
    } catch {
      setError('流入経路の読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }, [selectedAccountId])

  const loadLineAccount = useCallback(async () => {
    try {
      const params = selectedAccountId ? `?accountId=${selectedAccountId}` : ''
      const data = await fetchApi<LineAccount[] | { items: LineAccount[] }>(`/api/line-accounts${params}`)
      const accounts = Array.isArray(data) ? data : (data.items || [])
      if (accounts.length > 0) setLineAccount(accounts[0])
    } catch {
      // ignore
    }
  }, [selectedAccountId])

  useEffect(() => {
    loadAffiliates()
    loadLineAccount()
  }, [loadAffiliates, loadLineAccount])

  const toggleReport = async (id: string) => {
    if (expandedReportId === id) {
      setExpandedReportId(null)
      return
    }
    setExpandedReportId(id)
    if (reports[id] !== undefined) return // already loaded
    setReportsLoading((prev) => ({ ...prev, [id]: true }))
    try {
      const res = await api.affiliates.report(id)
      if (res.success) {
        setReports((prev) => ({ ...prev, [id]: res.data }))
      } else {
        setReports((prev) => ({ ...prev, [id]: null }))
      }
    } catch {
      setReports((prev) => ({ ...prev, [id]: null }))
    } finally {
      setReportsLoading((prev) => ({ ...prev, [id]: false }))
    }
  }

  const getLineLink = (code: string) => {
    if (!lineAccount?.channelId) return null
    return `https://line.me/R/ti/p/@${lineAccount.channelId}?ref=${code}`
  }

  const getQrUrl = (link: string) =>
    `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(link)}&size=300x300&margin=10`

  const copyLink = async (code: string) => {
    const link = getLineLink(code)
    if (!link) return
    await navigator.clipboard.writeText(link)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  const openQr = (code: string) => {
    const link = getLineLink(code)
    if (!link) return
    setQrTarget({ code, url: link })
  }

  const downloadQr = (code: string, url: string) => {
    const qrUrl = getQrUrl(url)
    const a = document.createElement('a')
    a.href = qrUrl
    a.download = `qr-${code}.png`
    a.target = '_blank'
    a.click()
  }

  const openCreate = () => {
    setEditingId(null)
    setFormName('')
    setFormCode('')
    setShowForm(true)
  }

  const openEdit = (aff: Affiliate) => {
    setEditingId(aff.id)
    setFormName(aff.name)
    setFormCode(aff.code)
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setFormName('')
    setFormCode('')
  }

  const handleSave = async () => {
    if (!formName.trim() || !formCode.trim()) return
    setSaving(true)
    try {
      const body = { name: formName.trim(), code: formCode.trim() }
      const url = editingId ? `/api/affiliates/${editingId}` : `/api/affiliates`
      const method = editingId ? 'PUT' : 'POST'
      await fetchApi<unknown>(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      closeForm()
      await loadAffiliates()
    } catch {
      alert('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return
    try {
      await fetchApi<unknown>(`/api/affiliates/${id}`, { method: 'DELETE' })
      await loadAffiliates()
    } catch {
      alert('削除に失敗しました')
    }
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value)

  return (
    <div>
      <Header
        title="流入経路管理"
        action={
          <button
            onClick={openCreate}
            className="px-4 py-2 min-h-[44px] text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#06C755' }}
          >
            + 新規作成
          </button>
        }
      />

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={closeForm}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">{editingId ? '流入経路を編集' : '新しい流入経路を作成'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">経路名</label>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                  placeholder="例: Instagram広告"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ref コード</label>
                <input type="text" value={formCode}
                  onChange={(e) => setFormCode(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                  placeholder="例: instagram"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 font-mono"
                />
                <p className="text-xs text-gray-400 mt-1">半角英数字・ハイフン・アンダーバーのみ</p>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={closeForm} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">
                キャンセル
              </button>
              <button onClick={handleSave} disabled={saving || !formName.trim() || !formCode.trim()}
                className="flex-1 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: '#06C755' }}
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {qrTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setQrTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-xs mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-bold text-center mb-4">QRコード</h2>
            <div className="flex justify-center mb-4">
              <img src={getQrUrl(qrTarget.url)} alt="QRコード" width={240} height={240} className="rounded-lg border border-gray-200" />
            </div>
            <p className="text-xs text-gray-500 text-center mb-4 break-all">{qrTarget.url}</p>
            <div className="flex gap-2">
              <button onClick={() => setQrTarget(null)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm">
                閉じる
              </button>
              <button onClick={() => downloadQr(qrTarget.code, qrTarget.url)}
                className="flex-1 text-white py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: '#06C755' }}
              >
                ダウンロード
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">読み込み中...</div>
      ) : affiliates.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-12 text-center text-gray-400">
          流入経路がまだ登録されていません
        </div>
      ) : (
        <div className="space-y-3">
          {affiliates.map((aff) => {
            const link = getLineLink(aff.code)
            const report = reports[aff.id]
            const isExpanded = expandedReportId === aff.id
            return (
              <div key={aff.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">{aff.name}</span>
                        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded font-mono">{aff.code}</span>
                      </div>
                      {link ? (
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="text-xs text-gray-500 truncate max-w-xs">{link}</span>
                          <button onClick={() => copyLink(aff.code)} className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded">
                            {copied === aff.code ? 'コピー済み ✓' : 'コピー'}
                          </button>
                          <button onClick={() => openQr(aff.code)} className="text-xs bg-purple-50 text-purple-600 hover:bg-purple-100 px-2 py-1 rounded">
                            QRコード
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 mt-1">LINEアカウントを設定するとリンクが表示されます</p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4 shrink-0">
                      <button
                        onClick={() => toggleReport(aff.id)}
                        className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded transition-colors ${isExpanded ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        レポート
                      </button>
                      <button onClick={() => openEdit(aff)} className="text-sm text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50">
                        編集
                      </button>
                      <button onClick={() => handleDelete(aff.id, aff.name)} className="text-sm text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50">
                        削除
                      </button>
                    </div>
                  </div>
                </div>

                {/* Report panel */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-4">
                    {reportsLoading[aff.id] ? (
                      <div className="grid grid-cols-3 gap-3">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="h-14 bg-gray-200 rounded-lg animate-pulse" />
                        ))}
                      </div>
                    ) : !report ? (
                      <p className="text-xs text-gray-400 text-center py-3">データがありません</p>
                    ) : (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-3">レポート（全期間）</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
                            <p className="text-xs text-gray-500 mb-1">クリック数</p>
                            <p className="text-lg font-bold text-gray-900">{report.totalClicks.toLocaleString()}</p>
                          </div>
                          <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
                            <p className="text-xs text-gray-500 mb-1">CV数</p>
                            <p className="text-lg font-bold" style={{ color: '#06C755' }}>{report.totalConversions.toLocaleString()}</p>
                          </div>
                          <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
                            <p className="text-xs text-gray-500 mb-1">CVR</p>
                            <p className="text-lg font-bold text-blue-600">
                              {report.totalClicks > 0 ? ((report.totalConversions / report.totalClicks) * 100).toFixed(1) : '0.0'}%
                            </p>
                          </div>
                          <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
                            <p className="text-xs text-gray-500 mb-1">売上</p>
                            <p className="text-lg font-bold text-purple-700">{formatCurrency(report.totalRevenue)}</p>
                          </div>
                        </div>
                        {report.commissionRate > 0 && (
                          <p className="text-xs text-gray-400 mt-2 text-right">
                            手数料率: {(report.commissionRate * 100).toFixed(1)}% / 済手数料算定: {formatCurrency(report.totalRevenue * report.commissionRate)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <CcPromptButton prompts={ccPrompts} />
    </div>
  )
}
