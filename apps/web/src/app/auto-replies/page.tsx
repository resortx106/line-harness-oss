'use client'

import { useState, useEffect, useCallback } from 'react'
import { fetchApi } from '@/lib/api'
import { useAccount } from '@/contexts/account-context'
import Header from '@/components/layout/header'

interface AutoReply {
  id: string
  keyword: string
  matchType: 'exact' | 'contains'
  responseType: string
  responseContent: string
  lineAccountId: string | null
  isActive: boolean
  createdAt: string
}

const MATCH_TYPE_LABELS: Record<string, string> = {
  exact: '完全一致',
  contains: '部分一致',
}

const defaultForm = {
  keyword: '',
  matchType: 'contains' as const,
  responseType: 'text',
  responseContent: '',
}

export default function AutoRepliesPage() {
  const { selectedAccountId } = useAccount()
  const [items, setItems] = useState<AutoReply[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<AutoReply | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = selectedAccountId ? '?accountId=' + selectedAccountId : ''
      const res = await fetchApi<{ success: boolean; data: AutoReply[] }>('/api/auto-replies' + params)
      if (res.success) {
        setItems(res.data)
      } else {
        setError('読み込みに失敗しました')
      }
    } catch {
      setError('読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }, [selectedAccountId])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setEditItem(null)
    setForm(defaultForm)
    setShowForm(true)
  }

  const openEdit = (item: AutoReply) => {
    setEditItem(item)
    setForm({
      keyword: item.keyword,
      matchType: item.matchType,
      responseType: item.responseType,
      responseContent: item.responseContent,
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.keyword.trim() || !form.responseContent.trim()) return
    setSaving(true)
    try {
      const body = {
        keyword: form.keyword,
        matchType: form.matchType,
        responseType: form.responseType,
        responseContent: form.responseContent,
        lineAccountId: selectedAccountId || null,
      }
      if (editItem) {
        await fetchApi('/api/auto-replies/' + editItem.id, { method: 'PUT', body: JSON.stringify(body) })
      } else {
        await fetchApi('/api/auto-replies', { method: 'POST', body: JSON.stringify(body) })
      }
      setShowForm(false)
      load()
    } catch {
      alert('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('削除しますか？')) return
    try {
      await fetchApi('/api/auto-replies/' + id, { method: 'DELETE' })
      load()
    } catch {
      alert('削除に失敗しました')
    }
  }

  const handleToggle = async (item: AutoReply) => {
    try {
      await fetchApi('/api/auto-replies/' + item.id, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !item.isActive }),
      })
      load()
    } catch {
      alert('更新に失敗しました')
    }
  }

  return (
    <div>
      <Header title="自動返信設定" />

      <div className="flex justify-end mb-4">
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
        >
          + 新規キーワード追加
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-bold mb-4">
              {editItem ? '自動返信を編集' : '新規自動返信'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">キーワード *</label>
                <input
                  type="text"
                  value={form.keyword}
                  onChange={e => setForm(f => ({ ...f, keyword: e.target.value }))}
                  placeholder="例: キャンセル"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">一致タイプ</label>
                <div className="flex gap-2">
                  {(['contains', 'exact'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setForm(f => ({ ...f, matchType: t }))}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${form.matchType === t ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                    >
                      {MATCH_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {form.matchType === 'exact' ? 'メッセージがキーワードと完全一致したときに返信' : 'メッセージにキーワードが含まれるときに返信'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">返信メッセージ *</label>
                <textarea
                  value={form.responseContent}
                  onChange={e => setForm(f => ({ ...f, responseContent: e.target.value }))}
                  placeholder="返信するメッセージを入力..."
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.keyword.trim() || !form.responseContent.trim()}
                className="px-4 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-40 transition-colors"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">読み込み中...</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-4xl mb-3">🤖</div>
          <p className="text-gray-500 text-sm">自動返信がまだ設定されていません。<br />「新規キーワード追加」から作成してください。</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">キーワード</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">一致</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">返信内容</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">状態</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium">{item.keyword}</td>
                  <td className="px-4 py-3 text-gray-500">{MATCH_TYPE_LABELS[item.matchType] || item.matchType}</td>
                  <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{item.responseContent}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggle(item)}
                      className={`px-2 py-1 text-xs rounded-full font-medium transition-colors ${item.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                      {item.isActive ? '有効' : '無効'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(item)}
                      className="text-xs text-blue-600 hover:text-blue-800 mr-3"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      削除
                    </button>
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
