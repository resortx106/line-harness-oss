'use client'
import { useState, useEffect, useCallback } from 'react'
import { fetchApi } from '@/lib/api'

interface AdPlatform {
  id: string
  name: string
  platform: string
  accountId?: string
  isActive: boolean
  conversions?: number
  spend?: number
  createdAt?: string
}

const PLATFORMS = [
  { value: 'google', label: 'Google広告', icon: '🔍' },
  { value: 'meta', label: 'Meta広告', icon: '📱' },
  { value: 'line', label: 'LINE広告', icon: '💬' },
  { value: 'twitter', label: 'X (旧Twitter)', icon: '🐦' },
  { value: 'tiktok', label: 'TikTok広告', icon: '🎵' },
  { value: 'other', label: 'その他', icon: '📊' },
]

export default function AdPlatformsPage() {
  const [platforms, setPlatforms] = useState<AdPlatform[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({ name: '', platform: 'google', accountId: '' })
  const [actionMsg, setActionMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const data = await fetchApi<{ platforms: AdPlatform[] }>('/api/ad-platforms')
      setPlatforms(data.platforms || [])
    } catch (e: any) { setError(e.message || '取得失敗')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true)
    try {
      await fetchApi('/api/ad-platforms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) })
      setShowForm(false); setFormData({ name: '', platform: 'google', accountId: '' })
      setActionMsg('広告プラットフォームを追加しました'); load()
    } catch (e: any) { setActionMsg('エラー: ' + (e.message || '失敗'))
    } finally { setSubmitting(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('削除しますか？')) return
    try { await fetchApi('/api/ad-platforms/' + id, { method: 'DELETE' }); setActionMsg('削除しました'); load()
    } catch (e: any) { setActionMsg('エラー') }
  }

  const getPlatformInfo = (p: string) => PLATFORMS.find(x => x.value === p) || { icon: '📊', label: p }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">広告プラットフォーム連携</h1>
          <p className="text-gray-500 text-sm mt-1">Google・Meta等の広告アカウントと連携してコンバージョンを管理</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium text-sm">+ 追加</button>
      </div>
      {actionMsg && <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm flex justify-between"><span>{actionMsg}</span><button onClick={() => setActionMsg(null)}>×</button></div>}
      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4">広告プラットフォーム追加</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">名前 *</label>
              <input type="text" required value={formData.name} onChange={e => setFormData({...formData,name:e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">プラットフォーム</label>
              <select value={formData.platform} onChange={e => setFormData({...formData,platform:e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.icon} {p.label}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">アカウントID</label>
              <input type="text" value={formData.accountId} onChange={e => setFormData({...formData,accountId:e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
          </div>
          <div className="mt-4 flex gap-3">
            <button type="submit" disabled={submitting} className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm">{submitting?'追加中...':'追加'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm border border-gray-300">キャンセル</button>
          </div>
        </form>
      )}
      {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" /></div>
      : error ? <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center"><p className="text-red-600">{error}</p></div>
      : platforms.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">広告プラットフォームがありません</h3>
          <p className="text-gray-500 text-sm">Googleメタ等の広告アカウントを連携してコンバージョンを自動記録できます</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {platforms.map(p => {
            const info = getPlatformInfo(p.platform)
            return (
              <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{info.icon}</div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{p.name}</h3>
                      <p className="text-xs text-gray-500">{info.label}{p.accountId ? ' · ID: ' + p.accountId : ''}</p>
                    </div>
                  </div>
                  <span className={'text-xs px-2 py-0.5 rounded-full ' + (p.isActive?'bg-green-100 text-green-700':'bg-gray-100 text-gray-600')}>{p.isActive?'連携中':'停止中'}</span>
                </div>
                {(p.conversions !== undefined || p.spend !== undefined) && (
                  <div className="grid grid-cols-2 gap-2 mb-4 bg-gray-50 rounded-lg p-3">
                    <div className="text-center"><div className="text-lg font-bold text-gray-900">{p.conversions || 0}</div><div className="text-xs text-gray-500">CV数</div></div>
                    <div className="text-center"><div className="text-lg font-bold text-gray-900">¥{(p.spend || 0).toLocaleString()}</div><div className="text-xs text-gray-500">広告費</div></div>
                  </div>
                )}
                <button onClick={() => handleDelete(p.id)} className="w-full text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-lg">連携解除</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
