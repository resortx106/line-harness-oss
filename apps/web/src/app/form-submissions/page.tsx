'use client'

import { useState, useEffect, useCallback } from 'react'
import { fetchApi } from '@/lib/api'
import Header from '@/components/layout/header'
import { useAccount } from '@/contexts/account-context'

interface FormField {
  id: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox'
  required: boolean
  options?: string[]
}

interface Form {
  id: string
  name: string
  description: string
  fields: FormField[]
  submitCount: number
  isActive: boolean
  createdAt: string
}

interface Submission {
  id: string
  friendId: string
  friendName?: string
  data: Record<string, unknown>
  createdAt: string
}

export default function FormSubmissionsPage() {
  const { selectedAccountId } = useAccount()
  const [forms, setForms] = useState<Form[]>([])
  const [selectedForm, setSelectedForm] = useState<Form | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(false)
  const [submissionsLoading, setSubmissionsLoading] = useState(false)
  const [error, setError] = useState('')
  const [view, setView] = useState<'list' | 'create' | 'submissions'>('list')

  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [fields, setFields] = useState<FormField[]>([])
  const [saving, setSaving] = useState(false)

  const loadForms = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = selectedAccountId ? `?accountId=${selectedAccountId}` : ''
      const data = await fetchApi<Form[] | { items: Form[] } | { forms: Form[] } | { success: boolean; data: Form[] }>(`/api/forms${params}`)
      if (Array.isArray(data)) {
        setForms(data)
      } else if ('items' in data && Array.isArray(data.items)) {
        setForms(data.items)
      } else if ('forms' in data && Array.isArray(data.forms)) {
        setForms(data.forms)
      } else if ('data' in data && Array.isArray(data.data)) {
        setForms(data.data)
      } else {
        setForms([])
      }
    } catch {
      setError('フォームの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }, [selectedAccountId])

  const loadSubmissions = useCallback(async (formId: string) => {
    setSubmissionsLoading(true)
    try {
      const params = selectedAccountId ? `?accountId=${selectedAccountId}` : ''
      const data = await fetchApi<Submission[] | { items: Submission[] } | { submissions: Submission[] }>(`/api/forms/${formId}/submissions${params}`)
      if (Array.isArray(data)) {
        setSubmissions(data)
      } else if ('items' in data && Array.isArray(data.items)) {
        setSubmissions(data.items)
      } else if ('submissions' in data && Array.isArray(data.submissions)) {
        setSubmissions(data.submissions)
      } else {
        setSubmissions([])
      }
    } catch {
      setSubmissions([])
    } finally {
      setSubmissionsLoading(false)
    }
  }, [selectedAccountId])

  useEffect(() => {
    loadForms()
  }, [loadForms])

  const openSubmissions = (form: Form) => {
    setSelectedForm(form)
    setView('submissions')
    loadSubmissions(form.id)
  }

  const openCreate = () => {
    setFormName('')
    setFormDesc('')
    setFields([{ id: Date.now().toString(), label: '', type: 'text', required: false }])
    setView('create')
  }

  const addField = () => {
    setFields(prev => [...prev, { id: Date.now().toString(), label: '', type: 'text', required: false }])
  }

  const removeField = (id: string) => {
    setFields(prev => prev.filter(f => f.id !== id))
  }

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f))
  }

  const handleSave = async () => {
    if (!formName.trim()) return
    setSaving(true)
    try {
      const body = {
        name: formName.trim(),
        description: formDesc.trim(),
        fields: fields.filter(f => f.label.trim()).map(f => ({
          label: f.label.trim(),
          type: f.type,
          required: f.required,
        })),
      }
      const params = selectedAccountId ? `?accountId=${selectedAccountId}` : ''
      await fetchApi<unknown>(`/api/forms${params}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      setView('list')
      await loadForms()
    } catch {
      alert('フォームの作成に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return
    try {
      await fetchApi<unknown>(`/api/forms/${id}`, { method: 'DELETE' })
      await loadForms()
      if (selectedForm?.id === id) setView('list')
    } catch {
      alert('削除に失敗しました')
    }
  }

  if (view === 'create') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="フォーム作成" description="新しいフォームを作成します" />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">フォーム名 <span className="text-red-500">*</span></label>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="例: お問い合わせフォーム" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
                <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="フォームの説明（任意）" rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
            </div>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700">質問項目</h3>
                <button onClick={addField} className="text-xs text-green-600 hover:text-green-800 border border-green-300 px-2 py-1 rounded">＋ 項目追加</button>
              </div>
              <div className="space-y-3">
                {fields.map((field, idx) => (
                  <div key={field.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-400 w-4">{idx + 1}</span>
                      <input type="text" value={field.label} onChange={(e) => updateField(field.id, { label: e.target.value })} placeholder="質問文" className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-green-400" />
                      <select value={field.type} onChange={(e) => updateField(field.id, { type: e.target.value as FormField['type'] })} className="border border-gray-300 rounded px-2 py-1 text-sm">
                        <option value="text">テキスト</option>
                        <option value="textarea">テキストエリア</option>
                        <option value="select">セレクト</option>
                      </select>
                      <label className="flex items-center gap-1 text-xs text-gray-600 whitespace-nowrap">
                        <input type="checkbox" checked={field.required} onChange={(e) => updateField(field.id, { required: e.target.checked })} />
                        必須
                      </label>
                      {fields.length > 1 && <button onClick={() => removeField(field.id)} className="text-red-400 hover:text-red-600 text-xs">✕</button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setView('list')} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">キャンセル</button>
              <button onClick={handleSave} disabled={saving || !formName.trim()} className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium">
                {saving ? '作成中...' : 'フォームを作成'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (view === 'submissions' && selectedForm) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title={selectedForm.name} description="フォーム回答一覧" />
        <div className="max-w-4xl mx-auto px-4 py-6">
          <button onClick={() => setView('list')} className="text-sm text-gray-500 hover:text-gray-700 mb-4">← フォーム一覧に戻る</button>
          {submissionsLoading ? (
            <div className="text-center py-12 text-gray-400">読み込み中...</div>
          ) : submissions.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 py-12 text-center text-gray-400">回答がまだありません</div>
          ) : (
            <div className="space-y-3">
              {submissions.map((sub) => (
                <div key={sub.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-800">{sub.friendName || sub.friendId}</span>
                    <span className="text-xs text-gray-400">{new Date(sub.createdAt).toLocaleString('ja-JP')}</span>
                  </div>
                  <div className="space-y-1">
                    {Object.entries(sub.data || {}).map(([key, val]) => (
                      <div key={key} className="text-sm"><span className="text-gray-500">{key}: </span><span className="text-gray-800">{String(val)}</span></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="フォーム回答" description="フォーム送信データの一覧" />
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-800">フォーム一覧</h2>
          <button onClick={openCreate} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">＋ 新規フォーム作成</button>
        </div>
        {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
        {loading ? (
          <div className="text-center py-12 text-gray-400">読み込み中...</div>
        ) : forms.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 py-12 text-center text-gray-400">フォームがまだ作成されていません</div>
        ) : (
          <div className="space-y-3">
            {forms.map((form) => (
              <div key={form.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{form.name}</p>
                  {form.description && <p className="text-sm text-gray-500 mt-0.5">{form.description}</p>}
                  <p className="text-xs text-gray-400 mt-1">回答数: {form.submitCount ?? 0}件 · 項目: {(form.fields || []).length}個</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openSubmissions(form)} className="text-sm text-blue-600 hover:text-blue-800 px-3 py-1 rounded border border-blue-200 hover:bg-blue-50">回答を見る</button>
                  <button onClick={() => handleDelete(form.id, form.name)} className="text-sm text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50">削除</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
