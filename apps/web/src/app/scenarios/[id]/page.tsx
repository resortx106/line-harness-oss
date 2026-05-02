'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import Header from '@/components/layout/header'
import CcPromptButton from '@/components/cc-prompt-button'

interface ScenarioStep {
  id: string
  scenarioId: string
  stepOrder: number
  delayMinutes: number
  messageType: string
  messageContent: string
  conditionType: string | null
  conditionValue: string | null
  nextStepOnFalse: number | null
  createdAt: string
}

interface ScenarioDetail {
  id: string
  name: string
  description: string | null
  triggerType: string
  triggerTagId: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  steps: ScenarioStep[]
}

interface StepForm {
  stepOrder: number
  delayMinutes: number
  messageType: string
  messageContent: string
}

const triggerLabelMap: Record<string, string> = {
  friend_add: '友だち追加時',
  tag_added: 'タグ付与時',
  manual: '手動',
}

const messageTypeOptions = [
  { value: 'text', label: 'テキスト' },
  { value: 'flex', label: 'Flexメッセージ' },
  { value: 'image', label: '画像' },
]

const ccPrompts = [
  {
    title: 'ステップ設計サポート',
    prompt: 'このシナリオのステップ構成を最適化してください。
1. 配信間隔の推奨設定（ステップ毎）
2. メッセージ内容の改善提案
3. 離脱防止のための条件分岐設定
具体的な改善案を提示してください。',
  },
  {
    title: 'Flexメッセージ生成',
    prompt: 'このシナリオ用のFlexメッセージJSONを作成してください。
1. 視覚的に目立つヘッダー・ボディ・フッター構成
2. アクションボタン（LINE URL等）の添加
3. ブランドカラー（#06C755）を活用
コピペできるJSONコードを出力してください。',
  },
]

export function generateStaticParams() {
  return [{ id: 'placeholder' }]
}

export default function ScenarioDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [scenario, setScenario] = useState<ScenarioDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddStep, setShowAddStep] = useState(false)
  const [stepForm, setStepForm] = useState<StepForm>({
    stepOrder: 1,
    delayMinutes: 0,
    messageType: 'text',
    messageContent: '',
  })
  const [stepSaving, setStepSaving] = useState(false)
  const [stepError, setStepError] = useState('')
  const [editingStep, setEditingStep] = useState<ScenarioStep | null>(null)
  const [deletingStepId, setDeletingStepId] = useState<string | null>(null)

  const loadScenario = useCallback(async () => {
    if (!id || id === 'placeholder') return
    setLoading(true)
    setError('')
    try {
      const res = await api.scenarios.get(id)
      if (res.success) {
        setScenario(res.data as unknown as ScenarioDetail)
        const steps = (res.data as unknown as ScenarioDetail).steps || []
        setStepForm((f) => ({ ...f, stepOrder: steps.length + 1 }))
      } else {
        setError(res.error || 'シナリオの読み込みに失敗しました')
      }
    } catch {
      setError('シナリオの読み込みに失敗しました。もう一度お試しください。')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadScenario()
  }, [loadScenario])

  const handleAddStep = async () => {
    if (!stepForm.messageContent.trim()) {
      setStepError('メッセージ内容を入力してください')
      return
    }
    setStepSaving(true)
    setStepError('')
    try {
      const res = await api.scenarios.addStep(id, {
        stepOrder: stepForm.stepOrder,
        delayMinutes: stepForm.delayMinutes,
        messageType: stepForm.messageType,
        messageContent: stepForm.messageContent,
      })
      if (res.success) {
        setShowAddStep(false)
        setStepForm({ stepOrder: (scenario?.steps.length || 0) + 2, delayMinutes: 0, messageType: 'text', messageContent: '' })
        loadScenario()
      } else {
        setStepError(res.error || '失敗しました')
      }
    } catch {
      setStepError('ステップの追加に失敗しました')
    } finally {
      setStepSaving(false)
    }
  }

  const handleUpdateStep = async () => {
    if (!editingStep) return
    if (!stepForm.messageContent.trim()) {
      setStepError('メッセージ内容を入力してください')
      return
    }
    setStepSaving(true)
    setStepError('')
    try {
      const res = await api.scenarios.updateStep(id, editingStep.id, {
        stepOrder: stepForm.stepOrder,
        delayMinutes: stepForm.delayMinutes,
        messageType: stepForm.messageType,
        messageContent: stepForm.messageContent,
      })
      if (res.success) {
        setEditingStep(null)
        setStepForm({ stepOrder: (scenario?.steps.length || 0) + 1, delayMinutes: 0, messageType: 'text', messageContent: '' })
        loadScenario()
      } else {
        setStepError(res.error || '失敗しました')
      }
    } catch {
      setStepError('ステップの更新に失敗しました')
    } finally {
      setStepSaving(false)
    }
  }

  const handleDeleteStep = async (stepId: string) => {
    if (!confirm('このステップを削除しますか？')) return
    setDeletingStepId(stepId)
    try {
      await api.scenarios.deleteStep(id, stepId)
      loadScenario()
    } catch {
      setError('ステップの削除に失敗しました')
    } finally {
      setDeletingStepId(null)
    }
  }

  const openEditStep = (step: ScenarioStep) => {
    setEditingStep(step)
    setStepForm({
      stepOrder: step.stepOrder,
      delayMinutes: step.delayMinutes,
      messageType: step.messageType,
      messageContent: step.messageContent,
    })
    setStepError('')
    setShowAddStep(false)
  }

  const formatDelay = (minutes: number) => {
    if (minutes === 0) return '即時'
    if (minutes < 60) return `${minutes}分後`
    if (minutes < 1440) return `${Math.floor(minutes / 60)}時間後`
    return `${Math.floor(minutes / 1440)}日後`
  }

  const StepFormPanel = ({ isEdit }: { isEdit: boolean }) => (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
      <h4 className="text-xs font-semibold text-gray-700">{isEdit ? 'ステップを編集' : 'ステップを追加'}</h4>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">順番</label>
          <input type="number" min={1}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
            value={stepForm.stepOrder}
            onChange={(e) => setStepForm({ ...stepForm, stepOrder: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">送信遷延（分）</label>
          <input type="number" min={0}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
            value={stepForm.delayMinutes}
            onChange={(e) => setStepForm({ ...stepForm, delayMinutes: Number(e.target.value) })}
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">メッセージタイプ</label>
        <select
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-green-500"
          value={stepForm.messageType}
          onChange={(e) => setStepForm({ ...stepForm, messageType: e.target.value })}
        >
          {messageTypeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">メッセージ内容 <span className="text-red-500">*</span></label>
        <textarea
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-green-500 resize-y"
          rows={stepForm.messageType === 'flex' ? 8 : 4}
          placeholder={stepForm.messageType === 'flex' ? '{"type":"bubble","body":{...}}' : 'メッセージの内容を入力'}
          value={stepForm.messageContent}
          onChange={(e) => setStepForm({ ...stepForm, messageContent: e.target.value })}
        />
      </div>
      {stepError && <p className="text-xs text-red-600">{stepError}</p>}
      <div className="flex gap-2">
        <button
          onClick={isEdit ? handleUpdateStep : handleAddStep}
          disabled={stepSaving}
          className="px-3 py-1.5 text-sm font-medium text-white rounded-lg disabled:opacity-50"
          style={{ backgroundColor: '#06C755' }}
        >
          {stepSaving ? '保存中...' : (isEdit ? '更新' : '追加')}
        </button>
        <button
          onClick={() => { setShowAddStep(false); setEditingStep(null); setStepError('') }}
          className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg"
        >
          キャンセル
        </button>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div>
        <Header title="シナリオ詳細" />
        <div className="animate-pulse space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-5 h-24" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !scenario) {
    return (
      <div>
        <Header title="シナリオ詳細" />
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm mb-4">{error || 'シナリオが見つかりません'}</div>
        <Link href="/scenarios" className="text-sm text-green-600 hover:underline">← シナリオ一覧に戻る</Link>
      </div>
    )
  }

  const sortedSteps = [...(scenario.steps || [])].sort((a, b) => a.stepOrder - b.stepOrder)

  return (
    <div>
      <Header
        title={scenario.name}
        action={
          <Link
            href="/scenarios"
            className="px-4 py-2 min-h-[44px] flex items-center text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ← 一覧
          </Link>
        }
      />

      {/* Scenario info */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            {scenario.description && (
              <p className="text-sm text-gray-500 mb-2">{scenario.description}</p>
            )}
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                {triggerLabelMap[scenario.triggerType] || scenario.triggerType}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${scenario.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {scenario.isActive ? '有効' : '無効'}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                {sortedSteps.length}ステップ
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-800">配信ステップ</h2>
        <button
          onClick={() => { setShowAddStep(true); setEditingStep(null); setStepError('') }}
          className="px-3 py-1.5 text-sm font-medium text-white rounded-lg"
          style={{ backgroundColor: '#06C755' }}
        >
          + ステップを追加
        </button>
      </div>

      {showAddStep && <StepFormPanel isEdit={false} />}

      {sortedSteps.length === 0 && !showAddStep ? (
        <div className="bg-white rounded-lg border border-gray-200 p-10 text-center text-gray-400 text-sm">
          ステップがまだありません。「＋ ステップを追加」から作成してください。
        </div>
      ) : (
        <div className="space-y-3">
          {sortedSteps.map((step, idx) => (
            <div key={step.id} className="bg-white rounded-lg border border-gray-200">
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: '#06C755' }}
                    >
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
                          {messageTypeOptions.find((o) => o.value === step.messageType)?.label || step.messageType}
                        </span>
                        <span className="text-xs text-gray-400">{formatDelay(step.delayMinutes)}</span>
                      </div>
                      <p className="text-sm text-gray-700 break-all line-clamp-3 font-mono whitespace-pre-wrap">
                        {step.messageContent}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => openEditStep(step)}
                      className="px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDeleteStep(step.id)}
                      disabled={deletingStepId === step.id}
                      className="px-2.5 py-1 text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded transition-colors disabled:opacity-50"
                    >
                      削除
                    </button>
                  </div>
                </div>
                {editingStep?.id === step.id && <StepFormPanel isEdit={true} />}
              </div>
              {idx < sortedSteps.length - 1 && (
                <div className="flex justify-center py-1">
                  <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <CcPromptButton prompts={ccPrompts} />
    </div>
  )
}
