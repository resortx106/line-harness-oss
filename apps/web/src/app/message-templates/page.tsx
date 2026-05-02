'use client'
import { useState, useEffect, useCallback } from 'react'
import { fetchApi } from '@/lib/api'
import Header from '@/components/layout/header'
import CcPromptButton from '@/components/cc-prompt-button'

interface MessageTemplate {
  id: string
  name: string
  messageType: 'text' | 'flex'
  messageContent: string
  createdAt: string
  updatedAt: string
}

interface FormState {
  name: string
  messageType: 'text' | 'flex'
  messageContent: string
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

const ccPrompts = [
  {
    title: '配信用テンプレート作成',
    prompt: `配信用テンプレートの作成をサポートしてください。
1. シナリオ・一斉配信用の効果的なテスト部手メッセージの例
2. FlexメッセージJSONのテンプレート文例
3. テンプレートを活用した配信フローの構築方法
手順を示してください。`,
  },
]

export default function MessageTemplatesPage() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<MessageTemplate | null>(null)
  const [form, setForm] = useState<FormState>({ name: '', messageType: 'text', messageContent: '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<'all' | 'text' | 'flex'>('all')
  const [copyMsg, setCopyMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetchApi<{ success: boolean; data: MessageTemplate[] }>('/api/message-templates')
      if (res.success) setTemplates(res.data)
      else setError('テンプレートの読み込みに失敗しました。')
    } catch {
      setError('テンプレートの読み込みに失敗しました。')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', messageType: 'text', messageContent: '' })
    setFormError('')
    setShowForm(true)
  }

  const openEdit = (t: MessageTemplate) => {
    setEditing(t)
    setForm({ name: t.name, messageType: t.messageType, messageContent: t.messageContent })
    setFormError('')
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError('テンプレート名を入力してください'); return }
    if (!form.messageContent.trim()) { setFormError('メッセージ内容を入力してください'); return }
    if (form.messageType === 'flex') {
      try { JSON.parse(form.messageContent) } catch { setFormError('FlexメッセージはJSON形式で入力してください'); return }
    }
    setSaving(true)
    setFormError('')
    try {
      if (editing) {
        await fetchApi(`/api/message-templates/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify({ name: form.name, messageType: form.messageType, messageContent: form.messageContent }),
        })
      } else {
        await fetchApi('/api/message-templates', {
          method: 'POST',
          body: JSON.stringify({ name: form.name, messageType: form.messageType, messageContent: form.messageContent }),
        })
      }
      setShowForm(false)
      load()
    } catch {
      setFormError('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('このテンプレートを削除しますか？')) return
    try {
      await fetchApi(`/api/message-templates/${id}`, { method: 'DELETE' })
      load()
    } catch { setError('削除に失敗しました') }
  }

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopyMsg('コピーしました')
      setTimeout(() => setCopyMsg(null), 2000)
    })
  }

  const filtered = templates.filter((t) => typeFilter === 'all' || t.messageType === typeFilter)

  return (
    <div>
      <Header
        title="配信用テンプレート"
        description="シナリオ・一斉配信用のメッセージテンプレートライブラリ"
        action={
          <button
            onClick={openCreate}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#06C755' }}
          >
            + 新規テンプレート
          </button>
        }
      />

      {copyMsg && (
        <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded text-green-700 text-xs text-center">{copyMsg}</div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      {/* Type filter */}
      <div className="mb-4 flex gap-2">
        {([['all', '全て'], ['text', 'テキスト'], ['flex', 'Flex']] as const).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setTypeFilter(val)}
            className={`px-3 py-1.5 min-h-[44px] text-xs font-medium rounded-full transition-colors ${
              typeFilter === val ? 'text-white' : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
            }`}
            style={typeFilter === val ? { backgroundColor: '#06C755' } : undefined}
          >
            {label}
            {val !== 'all' && (
              <span className="ml-1 text-gray-400 font-normal">
                ({templates.filter(t => t.messageType === val).length})
              </span>
            )}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400 self-center">計 {filtered.length}件</span>
      </div>

      {/* Create/Edit form */}
      {showForm && (
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">
            {editing ? 'テンプレート編集' : '新規テンプレート'}
          </h2>
          <div className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                テンプレート名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="例: ウェルカムメッセージ"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">メッセージタイプ</label>
              <div className="flex gap-3">
                {(['text', 'flex'] as const).map((t) => (
                  <label key={t} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={form.messageType === t}
                      onChange={() => setForm({ ...form, messageType: t })}
                      className="accent-green-600"
                    />
                    <span className="text-sm text-gray-700">{t === 'text' ? 'テキスト' : 'Flex'}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                メッセージ内容 <span className="text-red-500">*</span>
                {form.messageType === 'flex' && (
                  <span className="ml-1 text-gray-400 font-normal">(JSON形式)</span>
                )}
              </label>
              <textarea
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none font-mono"
                rows={form.messageType === 'flex' ? 8 : 4}
                placeholder={form.messageType === 'flex' ? '{"type":"bubble","body":{...}}' : 'メッセージ内容を入力...'}
                value={form.messageContent}
                onChange={(e) => setForm({ ...form, messageContent: e.target.value })}
              />
            </div>
            {formError && <p className="text-xs text-red-600">{formError}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 transition-opacity"
                style={{ backgroundColor: '#06C755' }}
              >
                {saving ? '保存中...' : editing ? '更新' : '作成'}
              </button>
              <button
                onClick={() => { setShowForm(false); setFormError('') }}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-5 animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-full" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 && !showForm ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500">
            {templates.length === 0
              ? 'テンプレートがありません。「新規テンプレート」から作成してください。'
              : '該当するテンプレートがありません。'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((t) => (
            <div key={t.id} className="bg-white rounded-lg border border-gray-200 p-5 flex flex-col gap-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{t.name}</p>
                  <span className={`inline-flex items-center px-2 py-0.5 mt-1 rounded-full text-xs font-medium ${
                    t.messageType === 'flex' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {t.messageType === 'flex' ? 'Flex' : 'テキスト'}
                  </span>
                </div>
                <button
                  onClick={() => setPreviewId(previewId === t.id ? null : t.id)}
                  className="flex-shrink-0 text-xs text-gray-400 hover:text-gray-600 px-2 py-1 bg-gray-50 hover:bg-gray-100 rounded"
                >
                  {previewId === t.id ? '閉じる' : 'プレビュー'}
                </button>
              </div>

              {/* Preview */}
              {previewId === t.id ? (
                <pre className="bg-gray-50 rounded p-3 text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                  {t.messageContent}
                </pre>
              ) : (
                <p className="text-sm text-gray-500 line-clamp-2 break-words">
                  {t.messageType === 'flex' ? '[Flexメッセージ]' : t.messageContent}
                </p>
              )}

              {/* Footer */}
              <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-400">{formatDate(t.createdAt)}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(t.messageContent)}
                    className="px-2 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded"
                  >
                    コピー
                  </button>
                  <button
                    onClick={() => openEdit(t)}
                    className="px-2 py-1 text-xs font-medium text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="px-2 py-1 text-xs font-medium text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded"
                  >
                    削除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <CcPromptButton prompts={ccPrompts} />
    </div>
  )
}
