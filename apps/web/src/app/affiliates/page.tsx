'use client'
import { useState, useEffect, useCallback } from 'react'
import { fetchApi } from '@/lib/api'
import { useAccount } from '@/contexts/account-context'

interface Affiliate {
  id: string
  name: string
  code: string
  commissionRate: number
  isActive: boolean
  createdAt: string
}

interface LineAccount {
  id: string
  channelId: string
  name: string
}

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">流入経路管理</h1>
            <p className="text-sm text-gray-500 mt-1">ref コード別の友だち獲得リンクを管理</p>
          </div>
          <button
            onClick={openCreate}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            ＋ 新規作成
          </button>
        </div>

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
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="例: Instagram広告"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ref コード</label>
                  <input
                    type="text"
                    value={formCode}
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
                <button
                  onClick={handleSave}
                  disabled={saving || !formName.trim() || !formCode.trim()}
                  className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium"
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
                <img
                  src={getQrUrl(qrTarget.url)}
                  alt="QRコード"
                  width={240}
                  height={240}
                  className="rounded-lg border border-gray-200"
                />
              </div>
              <p className="text-xs text-gray-500 text-center mb-4 break-all">{qrTarget.url}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setQrTarget(null)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm"
                >
                  閉じる
                </button>
                <button
                  onClick={() => downloadQr(qrTarget.code, qrTarget.url)}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg text-sm font-medium"
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
              return (
                <div key={aff.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">{aff.name}</span>
                        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded font-mono">{aff.code}</span>
                      </div>
                      {link ? (
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="text-xs text-gray-500 truncate max-w-xs">{link}</span>
                          <button
                            onClick={() => copyLink(aff.code)}
                            className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded"
                          >
                            {copied === aff.code ? 'コピー済み ✓' : 'コピー'}
                          </button>
                          <button
                            onClick={() => openQr(aff.code)}
                            className="text-xs bg-purple-50 text-purple-600 hover:bg-purple-100 px-2 py-1 rounded"
                          >
                            QRコード
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 mt-1">LINEアカウントを設定するとリンクが表示されます</p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => openEdit(aff)}
                        className="text-sm text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDelete(aff.id, aff.name)}
                        className="text-sm text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
