'use client'
import { useState, useEffect, useCallback } from 'react'
import { fetchApi } from '@/lib/api'

interface RichMenu {
  id: string
  name: string
  size: { width: number; height: number }
  selected: boolean
  areas: Array<{ bounds: { x: number; y: number; width: number; height: number }; action: { type: string; text?: string; uri?: string } }>
  chatBarText: string
  richMenuId?: string
  isDefault?: boolean
}

export default function RichMenusPage() {
  const [menus, setMenus] = useState<RichMenu[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({ name: '', chatBarText: 'メニュー', selected: true })
  const [actionMsg, setActionMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchApi<{ richMenus: RichMenu[] }>('/api/rich-menus')
      setMenus(data.richMenus || [])
    } catch (e: any) {
      setError(e.message || 'リッチメニューの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await fetchApi('/api/rich-menus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          chatBarText: formData.chatBarText,
          selected: formData.selected,
          size: { width: 2500, height: 843 },
          areas: []
        })
      })
      setShowForm(false)
      setFormData({ name: '', chatBarText: 'メニュー', selected: true })
      setActionMsg('リッチメニューを作成しました')
      load()
    } catch (e: any) {
      setActionMsg('エラー: ' + (e.message || '作成失敗'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (menuId: string) => {
    if (!confirm('このリッチメニューを削除しますか？')) return
    try {
      await fetchApi(`/api/rich-menus/${menuId}`, { method: 'DELETE' })
      setActionMsg('削除しました')
      load()
    } catch (e: any) {
      setActionMsg('エラー: ' + (e.message || '削除失敗'))
    }
  }

  const handleSetDefault = async (menuId: string) => {
    try {
      await fetchApi(`/api/rich-menus/${menuId}/default`, { method: 'POST' })
      setActionMsg('デフォルトに設定しました')
      load()
    } catch (e: any) {
      setActionMsg('エラー: ' + (e.message || '設定失敗'))
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">リッチメニュー管理</h1>
          <p className="text-gray-500 text-sm mt-1">LINEリッチメニューの作成・管理</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium text-sm"
        >
          + 新規作成
        </button>
      </div>

      {actionMsg && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm flex items-center justify-between">
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg(null)} className="text-blue-500 hover:text-blue-700 ml-4">×</button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4">新規リッチメニュー作成</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">メニュー名 <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="例: メインメニュー"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">チャットバーテキスト</label>
              <input
                type="text"
                value={formData.chatBarText}
                onChange={e => setFormData({ ...formData, chatBarText: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={formData.selected}
                onChange={e => setFormData({ ...formData, selected: e.target.checked })}
                className="rounded"
              />
              開く時に表示
            </label>
          </div>
          <div className="mt-4 flex gap-3">
            <button type="submit" disabled={submitting} className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium">
              {submitting ? '作成中...' : '作成'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-50">
              キャンセル
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 font-medium">{error}</p>
          <button onClick={load} className="mt-3 text-sm text-red-500 underline">再読み込み</button>
        </div>
      ) : menus.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <div className="text-5xl mb-4">📱</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">リッチメニューがありません</h3>
          <p className="text-gray-500 text-sm">「+ 新規作成」からLINEのリッチメニューを作成できます</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {menus.map(menu => (
            <div key={menu.id || menu.richMenuId} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{menu.name}</h3>
                    {menu.isDefault && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">デフォルト</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{menu.chatBarText}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${menu.selected ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                  {menu.selected ? '開く時表示' : '非表示'}
                </span>
              </div>
              <div className="text-xs text-gray-500 mb-4">
                サイズ: {menu.size?.width} × {menu.size?.height} | エリア数: {menu.areas?.length || 0}
              </div>
              <div className="flex gap-2">
                {!menu.isDefault && (
                  <button
                    onClick={() => handleSetDefault(menu.richMenuId || menu.id)}
                    className="flex-1 text-xs bg-green-50 hover:bg-green-100 text-green-700 px-3 py-2 rounded-lg transition-colors"
                  >
                    デフォルトに設定
                  </button>
                )}
                <button
                  onClick={() => handleDelete(menu.richMenuId || menu.id)}
                  className="flex-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-lg transition-colors"
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
