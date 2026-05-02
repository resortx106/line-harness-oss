'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import type { MessageType } from '@line-crm/shared'
import { api } from '@/lib/api'
import Header from '@/components/layout/header'
import CcPromptButton from '@/components/cc-prompt-button'

interface ScenarioStep { id: string; scenarioId: string; stepOrder: number; delayMinutes: number; messageType: string; messageContent: string; conditionType: string | null; conditionValue: string | null; nextStepOnFalse: number | null; createdAt: string }
interface ScenarioDetail { id: string; name: string; description: string | null; triggerType: string; triggerTagId: string | null; isActive: boolean; createdAt: string; updatedAt: string; steps: ScenarioStep[] }
interface StepForm { stepOrder: number; delayMinutes: number; messageType: string; messageContent: string }

const triggerLabelMap: Record<string, string> = { friend_add: '\u53cb\u3060\u3061\u8ffd\u52a0\u6642', tag_added: '\u30bf\u30b0\u4ed8\u4e0e\u6642', manual: '\u624b\u52d5' }
const messageTypeOptions = [{ value: 'text', label: '\u30c6\u30ad\u30b9\u30c8' }, { value: 'flex', label: 'Flex\u30e1\u30c3\u30bb\u30fc\u30b8' }, { value: 'image', label: '\u753b\u50cf' }]
const ccPrompts = [
  { title: '\u30b9\u30c6\u30c3\u30d7\u8a2d\u8a08\u30b5\u30dd\u30fc\u30c8', prompt: '\u3053\u306e\u30b7\u30ca\u30ea\u30aa\u306e\u30b9\u30c6\u30c3\u30d7\u69cb\u6210\u3092\u6700\u9069\u5316\u3057\u3066\u304f\u3060\u3055\u3044' },
  { title: 'Flex\u30e1\u30c3\u30bb\u30fc\u30b8\u751f\u6210', prompt: '\u3053\u306e\u30b7\u30ca\u30ea\u30aa\u7528\u306eFlex\u30e1\u30c3\u30bb\u30fc\u30b8JSON\u3092\u4f5c\u6210\u3057\u3066\u304f\u3060\u3055\u3044' },
]

export default function ScenarioDetailClient() {
  const params = useParams()
  const id = params.id as string
  const [scenario, setScenario] = useState<ScenarioDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddStep, setShowAddStep] = useState(false)
  const [stepForm, setStepForm] = useState<StepForm>({ stepOrder: 1, delayMinutes: 0, messageType: 'text', messageContent: '' })
  const [stepSaving, setStepSaving] = useState(false)
  const [stepError, setStepError] = useState('')
  const [editingStep, setEditingStep] = useState<ScenarioStep | null>(null)
  const [deletingStepId, setDeletingStepId] = useState<string | null>(null)

  const loadScenario = useCallback(async () => {
    if (!id || id === 'placeholder') return
    setLoading(true); setError('')
    try {
      const res = await api.scenarios.get(id)
      if (res.success) {
        setScenario(res.data as unknown as ScenarioDetail)
        const steps = (res.data as unknown as ScenarioDetail).steps || []
        setStepForm((f) => ({ ...f, stepOrder: steps.length + 1 }))
      } else { setError(res.error || '\u30b7\u30ca\u30ea\u30aa\u306e\u8aad\u307f\u8fbc\u307f\u306b\u5931\u6557\u3057\u307e\u3057\u305f') }
    } catch { setError('\u30b7\u30ca\u30ea\u30aa\u306e\u8aad\u307f\u8fbc\u307f\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002\u3082\u3046\u4e00\u5ea6\u304a\u8a66\u3057\u304f\u3060\u3055\u3044\u3002') }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { loadScenario() }, [loadScenario])

  const handleAddStep = async () => {
    if (!stepForm.messageContent.trim()) { setStepError('\u30e1\u30c3\u30bb\u30fc\u30b8\u5185\u5bb9\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044'); return }
    setStepSaving(true); setStepError('')
    try {
      const res = await api.scenarios.addStep(id, { stepOrder: stepForm.stepOrder, delayMinutes: stepForm.delayMinutes, messageType: stepForm.messageType as MessageType, messageContent: stepForm.messageContent })
      if (res.success) { setShowAddStep(false); setStepForm({ stepOrder: (scenario?.steps.length || 0) + 2, delayMinutes: 0, messageType: 'text', messageContent: '' }); loadScenario() }
      else { setStepError(res.error || '\u5931\u6557\u3057\u307e\u3057\u305f') }
    } catch { setStepError('\u30b9\u30c6\u30c3\u30d7\u306e\u8ffd\u52a0\u306b\u5931\u6557\u3057\u307e\u3057\u305f') }
    finally { setStepSaving(false) }
  }

  const handleUpdateStep = async () => {
    if (!editingStep) return
    if (!stepForm.messageContent.trim()) { setStepError('\u30e1\u30c3\u30bb\u30fc\u30b8\u5185\u5bb9\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044'); return }
    setStepSaving(true); setStepError('')
    try {
      const res = await api.scenarios.updateStep(id, editingStep.id, { stepOrder: stepForm.stepOrder, delayMinutes: stepForm.delayMinutes, messageType: stepForm.messageType as MessageType, messageContent: stepForm.messageContent })
      if (res.success) { setEditingStep(null); setStepForm({ stepOrder: (scenario?.steps.length || 0) + 1, delayMinutes: 0, messageType: 'text', messageContent: '' }); loadScenario() }
      else { setStepError(res.error || '\u5931\u6557\u3057\u307e\u3057\u305f') }
    } catch { setStepError('\u30b9\u30c6\u30c3\u30d7\u306e\u66f4\u65b0\u306b\u5931\u6557\u3057\u307e\u3057\u305f') }
    finally { setStepSaving(false) }
  }

  const handleDeleteStep = async (stepId: string) => {
    if (!confirm('\u3053\u306e\u30b9\u30c6\u30c3\u30d7\u3092\u524a\u9664\u3057\u307e\u3059\u304b\uff1f')) return
    setDeletingStepId(stepId)
    try { await api.scenarios.deleteStep(id, stepId); loadScenario() }
    catch { setError('\u30b9\u30c6\u30c3\u30d7\u306e\u524a\u9664\u306b\u5931\u6557\u3057\u307e\u3057\u305f') }
    finally { setDeletingStepId(null) }
  }

  const openEditStep = (step: ScenarioStep) => {
    setEditingStep(step)
    setStepForm({ stepOrder: step.stepOrder, delayMinutes: step.delayMinutes, messageType: step.messageType, messageContent: step.messageContent })
    setStepError(''); setShowAddStep(false)
  }

  const formatDelay = (minutes: number) => {
    if (minutes === 0) return '\u5373\u6642'
    if (minutes < 60) return minutes + '\u5206\u5f8c'
    if (minutes < 1440) return Math.floor(minutes / 60) + '\u6642\u9593\u5f8c'
    return Math.floor(minutes / 1440) + '\u65e5\u5f8c'
  }

  const StepFormPanel = ({ isEdit }: { isEdit: boolean }) => (
    <div className='mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3'>
      <h4 className='text-xs font-semibold text-gray-700'>{isEdit ? '\u30b9\u30c6\u30c3\u30d7\u3092\u7de8\u96c6' : '\u30b9\u30c6\u30c3\u30d7\u3092\u8ffd\u52a0'}</h4>
      <div className='grid grid-cols-2 gap-3'>
        <div><label className='block text-xs font-medium text-gray-600 mb-1'>\u9806\u756a</label>
          <input type='number' min={1} className='w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500' value={stepForm.stepOrder} onChange={(e) => setStepForm({ ...stepForm, stepOrder: Number(e.target.value) })} /></div>
        <div><label className='block text-xs font-medium text-gray-600 mb-1'>\u9001\u4fe1\u9077\u5ef6\uff08\u5206\uff09</label>
          <input type='number' min={0} className='w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500' value={stepForm.delayMinutes} onChange={(e) => setStepForm({ ...stepForm, delayMinutes: Number(e.target.value) })} /></div>
      </div>
      <div><label className='block text-xs font-medium text-gray-600 mb-1'>\u30e1\u30c3\u30bb\u30fc\u30b8\u30bf\u30a4\u30d7</label>
        <select className='w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-green-500' value={stepForm.messageType} onChange={(e) => setStepForm({ ...stepForm, messageType: e.target.value })}>
          {messageTypeOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
        </select></div>
      <div><label className='block text-xs font-medium text-gray-600 mb-1'>\u30e1\u30c3\u30bb\u30fc\u30b8\u5185\u5bb9 <span className='text-red-500'>*</span></label>
        <textarea className='w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-green-500 resize-y' rows={stepForm.messageType === 'flex' ? 8 : 4} placeholder={stepForm.messageType === 'flex' ? '{"type":"bubble","body":{...}}' : '\u30e1\u30c3\u30bb\u30fc\u30b8\u306e\u5185\u5bb9\u3092\u5165\u529b'} value={stepForm.messageContent} onChange={(e) => setStepForm({ ...stepForm, messageContent: e.target.value })} /></div>
      {stepError && <p className='text-xs text-red-600'>{stepError}</p>}
      <div className='flex gap-2'>
        <button onClick={isEdit ? handleUpdateStep : handleAddStep} disabled={stepSaving} className='px-3 py-1.5 text-sm font-medium text-white rounded-lg disabled:opacity-50' style={{ backgroundColor: '#06C755' }}>{stepSaving ? '\u4fdd\u5b58\u4e2d...' : (isEdit ? '\u66f4\u65b0' : '\u8ffd\u52a0')}</button>
        <button onClick={() => { setShowAddStep(false); setEditingStep(null); setStepError('') }} className='px-3 py-1.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg'>\u30ad\u30e3\u30f3\u30bb\u30eb</button>
      </div>
    </div>
  )

  if (loading) return (<div><Header title='\u30b7\u30ca\u30ea\u30aa\u8a73\u7d30' /><div className='animate-pulse space-y-4'>{[...Array(4)].map((_, i) => (<div key={i} className='bg-white rounded-lg border border-gray-200 p-5 h-24' />))}</div></div>)
  if (error || !scenario) return (<div><Header title='\u30b7\u30ca\u30ea\u30aa\u8a73\u7d30' /><div className='bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm mb-4'>{error || '\u30b7\u30ca\u30ea\u30aa\u304c\u898b\u3064\u304b\u308a\u307e\u305b\u3093'}</div><Link href='/scenarios' className='text-sm text-green-600 hover:underline'>\u2190 \u30b7\u30ca\u30ea\u30aa\u4e00\u89a7\u306b\u623b\u308b</Link></div>)

  const sortedSteps = [...(scenario.steps || [])].sort((a, b) => a.stepOrder - b.stepOrder)

  return (
    <div>
      <Header title={scenario.name} action={<Link href='/scenarios' className='px-4 py-2 min-h-[44px] flex items-center text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'>\u2190 \u4e00\u89a7</Link>} />
      <div className='bg-white rounded-lg border border-gray-200 p-5 mb-6'>
        <div className='flex flex-wrap gap-2'>
          {scenario.description && (<p className='w-full text-sm text-gray-500 mb-1'>{scenario.description}</p>)}
          <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700'>{triggerLabelMap[scenario.triggerType] || scenario.triggerType}</span>
          <span className={'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ' + (scenario.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>{scenario.isActive ? '\u6709\u52b9' : '\u7121\u52b9'}</span>
          <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600'>{sortedSteps.length}\u30b9\u30c6\u30c3\u30d7</span>
        </div>
      </div>
      <div className='mb-4 flex items-center justify-between'>
        <h2 className='text-sm font-semibold text-gray-800'>\u914d\u4fe1\u30b9\u30c6\u30c3\u30d7</h2>
        <button onClick={() => { setShowAddStep(true); setEditingStep(null); setStepError('') }} className='px-3 py-1.5 text-sm font-medium text-white rounded-lg' style={{ backgroundColor: '#06C755' }}>+ \u30b9\u30c6\u30c3\u30d7\u3092\u8ffd\u52a0</button>
      </div>
      {showAddStep && <StepFormPanel isEdit={false} />}
      {sortedSteps.length === 0 && !showAddStep ? (
        <div className='bg-white rounded-lg border border-gray-200 p-10 text-center text-gray-400 text-sm'>\u30b9\u30c6\u30c3\u30d7\u304c\u307e\u3060\u3042\u308a\u307e\u305b\u3093\u3002\u300c\uff0b \u30b9\u30c6\u30c3\u30d7\u3092\u8ffd\u52a0\u300d\u304b\u3089\u4f5c\u6210\u3057\u3066\u304f\u3060\u3055\u3044\u3002</div>
      ) : (
        <div className='space-y-3'>
          {sortedSteps.map((step, idx) => (
            <div key={step.id} className='bg-white rounded-lg border border-gray-200'>
              <div className='p-4'>
                <div className='flex items-start justify-between gap-3'>
                  <div className='flex items-start gap-3 min-w-0'>
                    <div className='shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold' style={{ backgroundColor: '#06C755' }}>{idx + 1}</div>
                    <div className='min-w-0'>
                      <div className='flex flex-wrap items-center gap-2 mb-1'>
                        <span className='text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium'>{messageTypeOptions.find((o) => o.value === step.messageType)?.label || step.messageType}</span>
                        <span className='text-xs text-gray-400'>{formatDelay(step.delayMinutes)}</span>
                      </div>
                      <p className='text-sm text-gray-700 break-all line-clamp-3 font-mono whitespace-pre-wrap'>{step.messageContent}</p>
                    </div>
                  </div>
                  <div className='flex gap-1.5 shrink-0'>
                    <button onClick={() => openEditStep(step)} className='px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors'>\u7de8\u96c6</button>
                    <button onClick={() => handleDeleteStep(step.id)} disabled={deletingStepId === step.id} className='px-2.5 py-1 text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded transition-colors disabled:opacity-50'>\u524a\u9664</button>
                  </div>
                </div>
                {editingStep?.id === step.id && <StepFormPanel isEdit={true} />}
              </div>
              {idx < sortedSteps.length - 1 && (<div className='flex justify-center py-1'><svg className='w-5 h-5 text-gray-300' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' /></svg></div>)}
            </div>
          ))}
        </div>
      )}
      <CcPromptButton prompts={ccPrompts} />
    </div>
  )
}
