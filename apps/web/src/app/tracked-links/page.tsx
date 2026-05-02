'use client'
import { useState, useEffect, useCallback } from 'react'
import { fetchApi } from '@/lib/api'

interface TrackedLink {
  id: string
  name: string
  originalUrl: string
  shortCode: string
  clickCount: number
  uniqueClicks: number
  createdAt: string
}

export default function TrackedLinksPage() {
  const [links, setLinks] = useState<TrackedLink[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', originalUrl: '' })
  const [actionMsg, setActionMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const data = await fetchApi<{ links: TrackedLink[] }>('/api/tracked-links')
      setLinks(data.links || [])
    } catch (e: any) {
      setError(e.message || 'トラッキングリンクの取得に失敗')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true)
    try {
      await fetchApi('/api/tracked-links', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) })
      setShowForm(false); setFormData({ name: '', originalUrl: '' })
      setActionMsg('トラッキングリンクを作成しました'); load()
    } catch (e: any) { setActionMsg('エラー: ' + (e.message || '作成失敗'))
    } finally { setSubmitting(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('削除しますか？')) return
    try { await fetchApi('/api/tracked-links/' + id, { method: 'DELETE' }); setActionMsg('削除しました'); load()
    } catch (e: any) { setActionMsg('エラー: ' + (e.message || '削除失敗')) }
  }

  const copyLink = async (link: TrackedLink) => {
    const url = window.location.origin + '/l/' + link.shortCode
    try { await navigator.clipboard.writeText(url); setCopied(link.id); setTimeout(() => setCopied(null), 2000)
    } catch { setActionMsg('コピー失敗') }
  }

  const fmt = (s: string) => { try { return new Date(s).toLocaleDateString('ja-JP') } catch { return s } }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">トラッキングリンク</h1>
          <p className="text-gray-500 text-sm mt-1">クリック数を計測できるリンクの発行・管理</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium text-sm">+ 新規作成</button>
      </div>
      {actionMsg && <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm flex justify-between"><span>{actionMsg}</span><button onClick={() => setActionMsg(null)}>×</button></div>}
      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4">新規トラッキングリンク作成</h2>
          <div className="grid gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">リンク名 *</label>
              <input type="text" required value={formData.name} onChange={e => setFormData({...formData,name:e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="例: LPページ" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">選移先URL *</label>
              <input type="url" required value={formData.originalUrl} onChange={e => setFormData({...formData,originalUrl:e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="https://example.com" /></div>
          </div>
          <div className="mt-4 flex gap-3">
            <button type="submit" disabled={submitting} className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm">{submitting ? '作成中...' : '作成'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm border border-gray-300">キャンセル</button>
          </div>
        </form>
      )}
      {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" /></div>
      : error ? <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center"><p className="text-red-600">{error}</p><button onClick={load} className="mt-3 text-sm text-red-500 underline">再読み込み</button></div>
      : links.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <div className="text-5xl mb-4">🔗</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">トラッキングリンクがありません</h3>
          <p className="text-gray-500 text-sm">「+ 新規作成」から作成できます</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-700">リンク名</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">選移先URL</th>
                <th className="text-center px-4 py-3 font-medium text-gray-700">クリック数</th>
                <th className="text-center px-4 py-3 font-medium text-gray-700">ユニーク</th>
                <th className="text-center px-4 py-3 font-medium text-gray-700">作成日</th>
                <th className="text-center px-4 py-3 font-medium text-gray-700">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {links.map(link => (
                <tr key={link.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><div className="font-medium text-gray-900">{link.name}</div><div className="text-xs text-gray-500 font-mono">/l/{link.shortCode}</div></td>
                  <td className="px-4 py-3"><a href={link.originalUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">{link.originalUrl}</a></td>
                  <td className="px-4 py-3 text-center font-bold">{link.clickCount ?? 0}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{link.uniqueClicks ?? 0}</td>
                  <td className="px-4 py-3 text-center text-gray-500 text-xs">{fmt(link.createdAt)}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => copyLink(link)} className={'text-xs px-3 py-1.5 rounded-lg ' + (copied===link.id?'bg-green-100 text-green-700':'bg-gray-100 text-gray-700')}>{copied===link.id?'コピー済':'コピー'}</button>
                      <button onClick={() => handleDelete(link.id)} className="text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded-lg">削除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
