'use client'
import { useState, useEffect, useCallback } from 'react'
import { fetchApi } from '@/lib/api'

interface Tag {
  id: string
  name: string
  color?: string
  friendCount?: number
}

const COLORS = ['#22c55e','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316']

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({ name: '', color: '#22c55e' })
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const data = await fetchApi<{ tags: Tag[] }>('/api/tags')
      setTags(data.tags || [])
    } catch (e: any) {
      setError(e.message || 'タグの取得に失敗')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true)
    try {
      await fetchApi('/api/tags', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) })
      setShowForm(false); setFormData({ name: '', color: '#22c55e' })
      setActionMsg('タグを作成しました'); load()
    } catch (e: any) { setActionMsg('エラー: ' + (e.message || '作成失敗'))
    } finally { setSubmitting(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('このタグを削除しますか？')) return
    try { await fetchApi('/api/tags/' + id, { method: 'DELETE' }); setActionMsg('削除しました'); load()
    } catch (e: any) { setActionMsg('エラー: ' + (e.message || '削除失敗')) }
  }

  const handleEdit = async (id: string) => {
    try {
      await fetchApi('/api/tags/' + id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: editName }) })
      setEditingId(null); setActionMsg('タグ名を更新しました'); load()
    } catch (e: any) { setActionMsg('エラー: ' + (e.message || '更新失敗')) }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">タグ管理</h1>
          <p className="text-gray-500 text-sm mt-1">友だちに付けるタグの作成・管理</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium text-sm">+ 新規作成</button>
      </div>
      {actionMsg && <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm flex justify-between"><span>{actionMsg}</span><button onClick={() => setActionMsg(null)}>×</button></div>}
      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4">新規タグ作成</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">タグ名 *</label>
              <input type="text" required value={formData.name} onChange={e => setFormData({...formData,name:e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="例: VIP会員" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">カラー</label>
              <div className="flex gap-2 flex-wrap">{COLORS.map(c => (<button key={c} type="button" onClick={() => setFormData({...formData,color:c})} className={'w-8 h-8 rounded-full border-2 ' + (formData.color===c?'border-gray-800':'border-transparent')} style={{backgroundColor:c}} />))}</div></div>
          </div>
          <div className="mt-4 flex gap-3">
            <button type="submit" disabled={submitting} className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm">{submitting?'作成中...':'作成'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm border border-gray-300">キャンセル</button>
          </div>
        </form>
      )}
      {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" /></div>
      : error ? <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center"><p className="text-red-600">{error}</p><button onClick={load} className="mt-3 text-sm text-red-500 underline">再読み込み</button></div>
      : tags.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <div className="text-5xl mb-4">🏷️</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">タグがありません</h3>
          <p className="text-gray-500 text-sm">「+ 新規作成」からタグを作成できます</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tags.map(tag => (
            <div key={tag.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
              {editingId === tag.id ? (
                <div className="flex gap-2">
                  <input value={editName} onChange={e => setEditName(e.target.value)} className="flex-1 border border-gray-300 rounded-lg px-2 py-1 text-sm" />
                  <button onClick={() => handleEdit(tag.id)} className="text-xs bg-green-500 text-white px-3 py-1 rounded-lg">保存</button>
                  <button onClick={() => setEditingId(null)} className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-lg">×</button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full flex-shrink-0" style={{backgroundColor: tag.color || '#22c55e'}} />
                    <div><div className="font-medium text-gray-900">{tag.name}</div>{tag.friendCount !== undefined && <div className="text-xs text-gray-500">{tag.friendCount}人</div>}</div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingId(tag.id); setEditName(tag.name) }} className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg">編集</button>
                    <button onClick={() => handleDelete(tag.id)} className="text-xs px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg">削除</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
