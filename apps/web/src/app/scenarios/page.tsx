'use client'
import { useState, useEffect, useCallback } from 'react'
import type { Scenario, ScenarioTriggerType, MessageType } from '@line-crm/shared'
import { api } from '@/lib/api'
import { useAccount } from '@/contexts/account-context'
import Header from '@/components/layout/header'
import CcPromptButton from '@/components/cc-prompt-button'

const ccPrompts = [
  { title: '新しいシナリオを作成', prompt: '新しいシナリオ配信を作成してください。' },
  { title: 'シナリオの効果分析', prompt: '現在のシナリオ配信の効果を分析してください。' },
]

type ScenarioWithCount = Scenario & { stepCount?: number }

interface ScenarioStep {
  id: string; scenarioId: string; stepOrder: number; delayMinutes: number
  messageType: string; messageContent: string
  conditionType: string | null; conditionValue: string | null
  nextStepOnFalse: number | null; createdAt: string
}

interface StepForm {
  stepOrder: number; delayMinutes: number; messageType: string; messageContent: string
}

const triggerLabelMap: Record<string, string> = {
  friend_add: '友だち追加時', tag_added: 'タグ付与時', manual: '手動'
}
const triggerBadgeColor: Record<string, string> = {
  friend_add: 'bg-green-100 text-green-700',
  tag_added: 'bg-blue-100 text-blue-700',
  manual: 'bg-gray-100 text-gray-600',
}
const triggerOptions = [
  { value: 'friend_add' as ScenarioTriggerType, label: '友だち追加時' },
  { value: 'tag_added' as ScenarioTriggerType, label: 'タグ付与時' },
  { value: 'manual' as ScenarioTriggerType, label: '手動' },
]
const messageTypeOptions = [
  { value: 'text', label: 'テキスト' },
  { value: 'flex', label: 'Flexメッセージ' },
  { value: 'image', label: '画像' },
]

interface CreateFormState {
  name: string; description: string; triggerType: ScenarioTriggerType
  triggerTagId: string; isActive: boolean
}

function formatDelay(minutes: number) {
  if (minutes === 0) return '即時'
  if (minutes < 60) return minutes + '分後'
  if (minutes < 1440) return Math.floor(minutes / 60) + '時間後'
  return Math.floor(minutes / 1440) + '日後'
}

export default function ScenariosPage() {
  const { selectedAccountId } = useAccount()
  const [scenarios, setScenarios] = useState<ScenarioWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<CreateFormState>({ name: '', description: '', triggerType: 'friend_add', triggerTagId: '', isActive: true })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null)
  const [editingScenarioName, setEditingScenarioName] = useState('')
  const [steps, setSteps] = useState<ScenarioStep[]>([])
  const [stepsLoading, setStepsLoading] = useState(false)
  const [showAddStep, setShowAddStep] = useState(false)
  const [stepForm, setStepForm] = useState<StepForm>({ stepOrder: 1, delayMinutes: 0, messageType: 'text', messageContent: '' })
  const [stepSaving, setStepSaving] = useState(false)
  const [stepError, setStepError] = useState('')
  const [editingStep, setEditingStep] = useState<ScenarioStep | null>(null)
  const [deletingStepId, setDeletingStepId] = useState<string | null>(null)

  const loadScenarios = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await api.scenarios.list({ accountId: selectedAccountId || undefined })
      if (res.success) { setScenarios(res.data) } else { setError(res.error) }
    } catch { setError('シナリオの読み込みに失敗しました。もう一度お試しください。') }
    finally { setLoading(false) }
  }, [selectedAccountId])

  useEffect(() => { loadScenarios() }, [loadScenarios])

  const loadSteps = useCallback(async (scenarioId: string) => {
    setStepsLoading(true); setStepError('')
    try {
      const res = await api.scenarios.get(scenarioId)
      if (res.success) {
        const detail = res.data as unknown as { steps: ScenarioStep[] }
        const sorted = [...(detail.steps || [])].sort((a, b) => a.stepOrder - b.stepOrder)
        setSteps(sorted)
        setStepForm(f => ({ ...f, stepOrder: sorted.length + 1 }))
      }
    } catch { setStepError('ステップの読み込みに失敗しました') }
    finally { setStepsLoading(false) }
  }, [])

  const openStepModal = (scenario: ScenarioWithCount) => {
    setEditingScenarioId(scenario.id)
    setEditingScenarioName(scenario.name)
    setShowAddStep(false); setEditingStep(null); setStepError('')
    loadSteps(scenario.id)
  }

  const closeStepModal = () => {
    setEditingScenarioId(null); setSteps([]); setShowAddStep(false)
    setEditingStep(null); setStepError('')
  }

  const handleCreate = async () => {
    if (!form.name.trim()) { setFormError('シナリオ名を入力してください'); return }
    setSaving(true); setFormError('')
    try {
      const res = await api.scenarios.create({ name: form.name, description: form.description || null, triggerType: form.triggerType, triggerTagId: form.triggerTagId || null, isActive: form.isActive })
      if (res.success) { setShowCreate(false); setForm({ name: '', description: '', triggerType: 'friend_add', triggerTagId: '', isActive: true }); loadScenarios() }
      else { setFormError(res.error) }
    } catch { setFormError('作成に失敗しました') }
    finally { setSaving(false) }
  }

  const handleToggleActive = async (id: string, current: boolean) => {
    try { await api.scenarios.update(id, { isActive: !current }); loadScenarios() }
    catch { setError('ステータスの変更に失敗しました') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('このシナリオを削除しますか？')) return
    try { await api.scenarios.delete(id); loadScenarios() }
    catch { setError('削除に失敗しました') }
  }

  const handleAddStep = async () => {
    if (!editingScenarioId) return
    if (!stepForm.messageContent.trim()) { setStepError('メッセージ内容を入力してください'); return }
    setStepSaving(true); setStepError('')
    try {
      const res = await api.scenarios.addStep(editingScenarioId, { stepOrder: stepForm.stepOrder, delayMinutes: stepForm.delayMinutes, messageType: stepForm.messageType as MessageType, messageContent: stepForm.messageContent })
      if (res.success) { setShowAddStep(false); loadSteps(editingScenarioId); loadScenarios() }
      else { setStepError(res.error || '失敗しました') }
    } catch { setStepError('ステップの追加に失敗しました') }
    finally { setStepSaving(false) }
  }

  const handleUpdateStep = async () => {
    if (!editingScenarioId || !editingStep) return
    if (!stepForm.messageContent.trim()) { setStepError('メッセージ内容を入力してください'); return }
    setStepSaving(true); setStepError('')
    try {
      const res = await api.scenarios.updateStep(editingScenarioId, editingStep.id, { stepOrder: stepForm.stepOrder, delayMinutes: stepForm.delayMinutes, messageType: stepForm.messageType as MessageType, messageContent: stepForm.messageContent })
      if (res.success) { setEditingStep(null); setStepForm({ stepOrder: steps.length + 1, delayMinutes: 0, messageType: 'text', messageContent: '' }); loadSteps(editingScenarioId) }
      else { setStepError(res.error || '失敗しました') }
    } catch { setStepError('ステップの更新に失敗しました') }
    finally { setStepSaving(false) }
  }

  const handleDeleteStep = async (stepId: string) => {
    if (!editingScenarioId) return
    if (!confirm('このステップを削除しますか？')) return
    setDeletingStepId(stepId)
    try { await api.scenarios.deleteStep(editingScenarioId, stepId); loadSteps(editingScenarioId); loadScenarios() }
    catch { setStepError('ステップの削除に失敗しました') }
    finally { setDeletingStepId(null) }
  }

  const openEditStep = (step: ScenarioStep) => {
    setEditingStep(step)
    setStepForm({ stepOrder: step.stepOrder, delayMinutes: step.delayMinutes, messageType: step.messageType, messageContent: step.messageContent })
    setStepError(''); setShowAddStep(false)
  }

  const StepFormPanel = ({ isEdit }: { isEdit: boolean }) => (
    <div className='mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2'>
      <h4 className='text-xs font-semibold text-gray-700'>{isEdit ? 'ステップを編集' : 'ステップを追加'}</h4>
      <div className='grid grid-cols-2 gap-2'>
        <div><label className='block text-xs font-medium text-gray-600 mb-1'>順番</label>
          <input type='number' min={1} className='w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500' value={stepForm.stepOrder} onChange={e => setStepForm({ ...stepForm, stepOrder: Number(e.target.value) })} /></div>
        <div><label className='block text-xs font-medium text-gray-600 mb-1'>送信遷延（分）</label>
          <input type='number' min={0} className='w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500' value={stepForm.delayMinutes} onChange={e => setStepForm({ ...stepForm, delayMinutes: Number(e.target.value) })} /></div>
      </div>
      <div><label className='block text-xs font-medium text-gray-600 mb-1'>メッセージタイプ</label>
        <select className='w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-green-500' value={stepForm.messageType} onChange={e => setStepForm({ ...stepForm, messageType: e.target.value })}>
          {messageTypeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select></div>
      <div><label className='block text-xs font-medium text-gray-600 mb-1'>メッセージ内容 <span className='text-red-500'>*</span></label>
        <textarea className='w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-green-500 resize-y' rows={stepForm.messageType === 'flex' ? 6 : 3} placeholder={stepForm.messageType === 'flex' ? '{"type":"bubble",...}' : 'メッセージの内容を入力'} value={stepForm.messageContent} onChange={e => setStepForm({ ...stepForm, messageContent: e.target.value })} /></div>
      {stepError && <p className='text-xs text-red-600'>{stepError}</p>}
      <div className='flex gap-2'>
        <button onClick={isEdit ? handleUpdateStep : handleAddStep} disabled={stepSaving} className='px-3 py-1.5 text-xs font-medium text-white rounded disabled:opacity-50' style={{ backgroundColor: '#06C755' }}>{stepSaving ? '保存中...' : (isEdit ? '更新' : '追加')}</button>
        <button onClick={() => { setShowAddStep(false); setEditingStep(null); setStepError('') }} className='px-3 py-1.5 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded'>キャンセル</button>
      </div>
    </div>
  )

  return (
    <div>
      <Header title='シナリオ配信' action={
        <button onClick={() => setShowCreate(true)} className='px-4 py-2 min-h-[44px] text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90' style={{ backgroundColor: '#06C755' }}>
          + 新規シナリオ
        </button>
      } />
      {error && <div className='mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm'>{error}</div>}
      {showCreate && (
        <div className='mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6'>
          <h2 className='text-sm font-semibold text-gray-800 mb-4'>新規シナリオを作成</h2>
          <div className='space-y-4 max-w-lg'>
            <div><label className='block text-xs font-medium text-gray-600 mb-1'>シナリオ名 <span className='text-red-500'>*</span></label>
              <input type='text' className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500' placeholder='例: 友だち追加ウェルカムシナリオ' value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className='block text-xs font-medium text-gray-600 mb-1'>説明</label>
              <textarea className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none' rows={2} placeholder='シナリオの説明 (省略可)' value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div><label className='block text-xs font-medium text-gray-600 mb-1'>トリガー</label>
              <select className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white' value={form.triggerType} onChange={e => setForm({ ...form, triggerType: e.target.value as ScenarioTriggerType })}>
                {triggerOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select></div>
            <div className='flex items-center gap-2'>
              <input type='checkbox' id='isActive' checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className='w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500' />
              <label htmlFor='isActive' className='text-sm text-gray-600'>作成後すぐに有効にする</label>
            </div>
            {formError && <p className='text-xs text-red-600'>{formError}</p>}
            <div className='flex gap-2'>
              <button onClick={handleCreate} disabled={saving} className='px-4 py-2 min-h-[44px] text-sm font-medium text-white rounded-lg disabled:opacity-50 transition-opacity' style={{ backgroundColor: '#06C755' }}>{saving ? '作成中...' : '作成'}</button>
              <button onClick={() => { setShowCreate(false); setFormError('') }} className='px-4 py-2 min-h-[44px] text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors'>キャンセル</button>
            </div>
          </div>
        </div>
      )}
      {loading ? (
        
        <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'>
          {[...Array(3)].map((_, i) => (
            <div key={i} className='bg-white rounded-lg border border-gray-200 p-5 animate-pulse space-y-3'>
              <div className='h-4 bg-gray-200 rounded w-3/4' /><div className='h-3 bg-gray-100 rounded w-full' />
            </div>
          ))}
        </div>
      ) : scenarios.length === 0 && !showCreate ? (
        <div className='bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center'>
          <p className='text-gray-500'>シナリオがありません。「新規シナリオ」から作成してください。</p>
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'>
          {scenarios.map(scenario => (
            <div key={scenario.id} className='bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow'>
              <div className='flex items-start justify-between mb-2'>
                <h3 className='text-sm font-semibold text-gray-900 leading-tight'>{scenario.name}</h3>
                <button onClick={() => handleToggleActive(scenario.id, scenario.isActive)}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${scenario.isActive ? 'bg-green-500' : 'bg-gray-300'}`}
                  title={scenario.isActive ? '有効' : '無効'}>
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${scenario.isActive ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>
              {scenario.description && <p className='text-xs text-gray-500 mb-3 line-clamp-2'>{scenario.description}</p>}
              <div className='flex items-center gap-2 mb-3'>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${triggerBadgeColor[scenario.triggerType] || 'bg-gray-100 text-gray-600'}`}>{triggerLabelMap[scenario.triggerType] || scenario.triggerType}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${scenario.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{scenario.isActive ? '有効' : '無効'}</span>
              </div>
              {scenario.stepCount !== undefined && <p className='text-xs text-gray-400 mb-3'>ステップ数: {scenario.stepCount}件</p>}
              <div className='flex items-center justify-end gap-2 pt-2 border-t border-gray-100'>
                <button onClick={() => openStepModal(scenario)} className='px-3 py-1 min-h-[36px] flex items-center text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors'>ステップ編集</button>
                <button onClick={() => handleDelete(scenario.id)} className='px-3 py-1 min-h-[36px] text-xs font-medium text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors'>削除</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {editingScenarioId && (
        <div className='fixed inset-0 z-50 flex items-start justify-center pt-16 pb-8 px-4' style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className='bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col'>
            <div className='flex items-center justify-between px-5 py-4 border-b border-gray-200'>
              <div>
                <h2 className='text-sm font-bold text-gray-900'>配信ステップ編集</h2>
                <p className='text-xs text-gray-500 mt-0.5'>{editingScenarioName}</p>
              </div>
              <button onClick={closeStepModal} className='p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors'>
                <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' /></svg>
              </button>
            </div>
            <div className='flex-1 overflow-y-auto p-5 space-y-3'>
              {stepsLoading ? (
                <div className='py-8 text-center text-gray-400 text-sm'>読み込み中...</div>
              ) : steps.length === 0 && !showAddStep ? (
                <div className='py-8 text-center text-gray-400 text-sm'>ステップがまだありません。下のボタンから追加してください。</div>
              ) : (
                steps.map((step, idx) => (
                  <div key={step.id} className='bg-gray-50 rounded-lg border border-gray-200 p-3'>
                    <div className='flex items-start justify-between gap-2'>
                      <div className='flex items-start gap-2 min-w-0'>
                        <div className='shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold' style={{ backgroundColor: '#06C755' }}>{idx + 1}</div>
                        <div className='min-w-0'>
                          <div className='flex flex-wrap items-center gap-1.5 mb-1'>
                            <span className='text-xs px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium'>{messageTypeOptions.find(o => o.value === step.messageType)?.label || step.messageType}</span>
                            <span className='text-xs text-gray-400'>{formatDelay(step.delayMinutes)}</span>
                          </div>
                          <p className='text-xs text-gray-700 break-all line-clamp-2 font-mono whitespace-pre-wrap'>{step.messageContent}</p>
                        </div>
                      </div>
                      <div className='flex gap-1 shrink-0'>
                        <button onClick={() => openEditStep(step)} className='px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded'>編集</button>
                        <button onClick={() => handleDeleteStep(step.id)} disabled={deletingStepId === step.id} className='px-2 py-1 text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded disabled:opacity-50'>削除</button>
                      </div>
                    </div>
                    {editingStep?.id === step.id && <StepFormPanel isEdit={true} />}
                  </div>
                ))
              )}
              {showAddStep && <StepFormPanel isEdit={false} />}
            </div>
            <div className='px-5 py-3 border-t border-gray-100'>
              <button onClick={() => { setShowAddStep(true); setEditingStep(null); setStepError('') }} className='w-full py-2 text-sm font-medium text-white rounded-lg' style={{ backgroundColor: '#06C755' }}>+ ステップを追加</button>
            </div>
          </div>
        </div>
      )}
      <CcPromptButton prompts={ccPrompts} />
    </div>
  )
}
