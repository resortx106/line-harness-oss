'use client'
import { useState, useEffect, useCallback } from 'react'
import { fetchApi } from '@/lib/api'

interface TrafficPool {
  id: string
  name: string
  description?: string
  accountIds: string[]
  distributionMode: string
  isActive: boolean
  totalRedirects?: number
  createdAt?: string
}

export default function TrafficPoolsPage() {
  const [pools, setPools] = useState<TrafficPool[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({ name: '', description: '', distributionMode: 'round_robin' })
  const [actionMsg, setActionMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const data = await fetchApi<{ pools: TrafficPool[] }>('/api/traffic-pools')
      setPools(data.pools || [])
    } catch (e: any) {
      setError(e.message || 'トラフィックプールの取得に失敗')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true)
    try {
      await fetchApi('/api/traffic-pools', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) })
      setShowForm(false); setFormData({ name: '', description: '', distributionMode: 'round_robin' })
      setActionMsg('トラフィックプールを作成しました'); load()
    } catch (e: any) { setActionMsg('エラー: ' + (e.message || '作成失敗'))
    } finally { setSubmitting(false) }
  }

  const handleToggle = async (pool: TrafficPool) => {
    try {
      await fetchApi('/api/traffic-pools/' + pool.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !pool.isActive }) })
      setActionMsg((!pool.isActive ? '有効' : '無効') + 'にしました'); load()
    } catch (e: any) { setActionMsg('エラー: ' + (e.message || '更新失敗')) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('削除しますか？')) return
    try { await fetchApi('/api/traffic-pools/' + id, { method: 'DELETE' }); setActionMsg('削除しました'); load()
    } catch (e: any) { setActionMsg('エラー: ' + (e.message || '削除失敗')) }
  }

  const modeLabel = (m: string) => ({ round_robin: 'ラウンドロビン', random: 'ランダム', weighted: '重み付き' }[m] || m)

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">トラフィックプール</h1>
          <p className="text-gray-500 text-sm mt-1">複数アカウントへの友だち誘導・分散管理</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium text-sm">+ 新規作成</button>
      </div>
      {actionMsg && <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm flex justify-between"><span>{actionMsg}</span><button onClick={() => setActionMsg(null)}>×</button></div>}
      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4">新規トラフィックプール作成</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">プール名 *</label>
              <input type="text" required value={formData.name} onChange={e => setFormData({...formData,name:e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="例: メインプール" /></div>
import { useState, useEffect, useCallback } from 'react'
import { fetchApi } from '@/lib/api'

interface TrafficPool {
  id: string
  name: string
  description?: string
  accountIds: string[]
  distributionMode: string
  isActive: boolean
  totalRedirects?: number
}

export default function TrafficPoolsPage() {
  const [pools, setPools] = useState<TrafficPool[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({ name: '', description: '', distributionMode: 'round_robin' })
  const [actionMsg, setActionMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const data = await fetchApi<{ pools: TrafficPool[] }>('/api/traffic-pools')
      setPools(data.pools || [])
    } catch (e: any) { setError(e.message || '取得失敗')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true)
    try {
      await fetchApi('/api/traffic-pools', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) })
      setShowForm(false); setFormData({ name: '', description: '', distributionMode: 'round_robin' })
      setActionMsg('プールを作成しました'); load()
    } catch (e: any) { setActionMsg('エラー: ' + (e.message || '失敗'))
    } finally { setSubmitting(false) }
  }

  const handleToggle = async (pool: TrafficPool) => {
    try {
      await fetchApi('/api/traffic-pools/' + pool.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !pool.isActive }) })
      setActionMsg('更新しました'); load()
    } catch (e: any) { setActionMsg('エラー') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('削除しますか？')) return
    try { await fetchApi('/api/traffic-pools/' + id, { method: 'DELETE' }); setActionMsg('削除しました'); load()
    } catch (e: any) { setActionMsg('エラー') }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">トラフィックプール</h1>
          <p className="text-gray-500 text-sm mt-1">複数アカウントへの友だち誘導・分散管理</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium text-sm">+ 新規作成</button>
      </div>
      {actionMsg && <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm flex justify-between"><span>{actionMsg}</span><button onClick={() => setActionMsg(null)}>×</button></div>}
      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4">新規プール作成</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">プール名 *</label>
              <input type="text" required value={formData.name} onChange={e => setFormData({...formData,name:e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">配分モード</label>
              <select value={formData.distributionMode} onChange={e => setFormData({...formData,distributionMode:e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="round_robin">ラウンドロビン</option>
                <option value="random">ランダム</option>
                <option value="weighted">重み付き</option>
              </select></div>
          </div>
          <div className="mt-4 flex gap-3">
            <button type="submit" disabled={submitting} className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm">{submitting?'作成中...':'作成'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm border border-gray-300">キャンセル</button>
          </div>
        </form>
      )}
      {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" /></div>
      : error ? <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center"><p className="text-red-600">{error}</p></div>
      : pools.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <div className="text-5xl mb-4">🌊</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">トラフィックプールがありません</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pools.map(pool => (
            <div key={pool.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{pool.name}</h3>
                  <span className={'text-xs px-2 py-0.5 rounded-full ' + (pool.isActive?'bg-green-100 text-green-700':'bg-gray-100 text-gray-600')}>{pool.isActive?'有効':'無効'}</span>
                </div>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-lg">{pool.distributionMode}</span>
              </div>
              <div className="text-xs text-gray-500 mb-4">アカウント数: {pool.accountIds?.length || 0}</div>
              <div className="flex gap-2">
                <button onClick={() => handleToggle(pool)} className="flex-1 text-xs bg-yellow-50 hover:bg-yellow-100 text-yellow-700 px-3 py-2 rounded-lg">
                  {pool.isActive?'無効にする':'有効にする'}
                </button>
                <button onClick={() => handleDelete(pool.id)} className="flex-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-lg">削除</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
