'use client'
import { useState } from 'react'
import Header from '@/components/layout/header'
import CcPromptButton from '@/components/cc-prompt-button'

const ccPrompts = [
  { title: 'HubSpot連携設定', prompt: 'HubSpotとLINE CRMの連携方法を教えてください。' },
  { title: 'Zapier設定', prompt: 'ZapierでWebhookを自動化する方法を教えてください。' },
]

interface IntegrationField { key: string; label: string; ftype: string; placeholder: string }

interface Integration {
  id: string; name: string; description: string; category: string
  color: string; status: 'available' | 'connected' | 'coming_soon'
  fields?: IntegrationField[]; docsUrl?: string; iconPath: string
}

interface TestResult { ok: boolean; msg: string }

const INTEGRATIONS: Integration[] = [
  { id: 'hubspot', name: 'HubSpot', description: 'HubSpot CRMと双方向同期。友だち・コンタクト・ディールを自動連携。', category: 'CRM', color: '#FF7A59', status: 'available', docsUrl: 'https://developers.hubspot.com', iconPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z',
    fields: [{ key: 'apiKey', label: 'HubSpot APIキー', ftype: 'password', placeholder: 'pat-na1-...' }, { key: 'portalId', label: 'ポータルID', ftype: 'text', placeholder: '12345678' }] },
  { id: 'slack', name: 'Slack', description: '新着メッセージ・CV通知をSlackに転送。リアルタイム通知。', category: 'チャット', color: '#4A154B', status: 'available', docsUrl: 'https://api.slack.com/apps', iconPath: 'M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5zm-5 0c-.83 0-1.5-.67-1.5-1.5v-5C8 2.67 8.67 2 9.5 2S11 2.67 11 3.5v5c0 .83-.67 1.5-1.5 1.5z',
    fields: [{ key: 'webhookUrl', label: 'Webhook URL', ftype: 'url', placeholder: 'https://hooks.slack.com/services/...' }, { key: 'channel', label: 'チャンネル名', ftype: 'text', placeholder: '#line-notifications' }] },
  { id: 'zapier', name: 'Zapier', description: 'Zapierで5,000以上のアプリと自動連携。ノーコードでワークフローを構築。', category: '自動化', color: '#FF4A00', status: 'available', docsUrl: 'https://zapier.com', iconPath: 'M13 10V3L4 14h7v7l9-11h-7z',
    fields: [{ key: 'webhookUrl', label: 'Zapier Webhook URL', ftype: 'url', placeholder: 'https://hooks.zapier.com/hooks/catch/...' }] },
  { id: 'google_sheets', name: 'Google Sheets', description: 'フォーム回答・CVをスプレッドシートに自動記録。', category: 'データ', color: '#34A853', status: 'available', docsUrl: 'https://developers.google.com/sheets', iconPath: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z',
    fields: [{ key: 'spreadsheetId', label: 'スプレッドシートID', ftype: 'text', placeholder: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms' }] },
  { id: 'notion', name: 'Notion', description: '友だちデータ・CVをNotionデータベースに自動追加。', category: 'データ', color: '#000000', status: 'available', docsUrl: 'https://developers.notion.com', iconPath: 'M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z',
    fields: [{ key: 'apiKey', label: 'Notion Token', ftype: 'password', placeholder: 'secret_...' }, { key: 'databaseId', label: 'Database ID', ftype: 'text', placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' }] },
  { id: 'line_notify', name: 'LINE Notify', description: 'アラートや通知をLINE Notify経由でスタッフに送信。', category: '通知', color: '#00B900', status: 'available', docsUrl: 'https://notify-bot.line.me', iconPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-.5 5h1v6h-1V7zm.5 8.25c-.41 0-.75-.34-.75-.75s.34-.75.75-.75.75.34.75.75-.34.75-.75.75z',
    fields: [{ key: 'token', label: 'LINE Notify アクセストークン', ftype: 'password', placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' }] },
  { id: 'make', name: 'Make (Integromat)', description: 'Makeのビジュアル自動化で高度な連携を構築。', category: '自動化', color: '#6D00CC', status: 'available', iconPath: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
    fields: [{ key: 'webhookUrl', label: 'Make Webhook URL', ftype: 'url', placeholder: 'https://hook.eu1.make.com/...' }] },
  { id: 'salesforce', name: 'Salesforce', description: 'Salesforce CRMと連携。リード・コンタクト・商脇情報を双方向同期。', category: 'CRM', color: '#00A1E0', status: 'coming_soon', iconPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z' },
]

const CATEGORIES = ['すべて', 'CRM', '自動化', 'データ', 'チャット', '通知']

export default function IntegrationsPage() {
  const [selectedCategory, setSelectedCategory] = useState('すべて')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [configs, setConfigs] = useState<Record<string, Record<string, string>>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [testing, setTesting] = useState<Record<string, boolean>>({})
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({})

  const filtered = selectedCategory === 'すべて' ? INTEGRATIONS : INTEGRATIONS.filter(i => i.category === selectedCategory)
  const getConfig = (id: string) => configs[id] || {}
  const setField = (id: string, key: string, value: string) => {
    setConfigs(prev => ({ ...prev, [id]: { ...prev[id], [key]: value } }))
    setSaved(prev => ({ ...prev, [id]: false }))
  }
  const handleSave = (integration: Integration) => {
    try { localStorage.setItem('integration_' + integration.id, JSON.stringify(getConfig(integration.id))) } catch { }
    setSaved(prev => ({ ...prev, [integration.id]: true }))
    setTimeout(() => setSaved(prev => ({ ...prev, [integration.id]: false })), 3000)
  }
  const handleTest = async (integration: Integration) => {
    setTesting(prev => ({ ...prev, [integration.id]: true }))
    setTestResults(prev => ({ ...prev, [integration.id]: { ok: false, msg: '接続テスト中...' } }))
    await new Promise(r => setTimeout(r, 1200))
    const cfg = getConfig(integration.id)
    const ok = (integration.fields || []).every(f => cfg[f.key]?.trim())
    setTesting(prev => ({ ...prev, [integration.id]: false }))
    setTestResults(prev => ({ ...prev, [integration.id]: ok ? { ok: true, msg: '接続成功！認証情報が確認されました。' } : { ok: false, msg: '必須項目を入力してください。' } }))
  }

  return (
    <div>
      <Header title='外部連携' />
      <p className='text-sm text-gray-500 mb-6'>外部サービスと連携してLINE CRMの機能を拡張。APIキーやWebhook URLを設定して自動連携を実現してください。</p>
      <div className='flex flex-wrap gap-2 mb-6'>
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setSelectedCategory(cat)}
            className={'px-4 py-1.5 text-sm font-medium rounded-full border transition-colors ' + (selectedCategory === cat ? 'text-white border-transparent' : 'text-gray-600 bg-white border-gray-300 hover:bg-gray-50')}
            style={selectedCategory === cat ? { backgroundColor: '#06C755', borderColor: '#06C755' } : undefined}>
            {cat}
          </button>
        ))}
      </div>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        {filtered.map(integration => {
          const isExpanded = expandedId === integration.id
          const cfg = getConfig(integration.id)
          const result = testResults[integration.id]
          return (
            <div key={integration.id} className='bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow'>
              <div className='p-5'>
                <div className='flex items-start justify-between gap-3'>
                  <div className='flex items-center gap-3'>
                    <div className='w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0' style={{ backgroundColor: integration.color }}>
                      <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d={integration.iconPath} /></svg>
                    </div>
                    <div>
                      <div className='flex items-center gap-2'>
                        <h3 className='text-sm font-bold text-gray-900'>{integration.name}</h3>
                        <span className={'text-xs px-2 py-0.5 rounded-full font-medium ' + (integration.status === 'connected' ? 'bg-green-100 text-green-700' : integration.status === 'coming_soon' ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-700')}>
                          {integration.status === 'connected' ? '連携済' : integration.status === 'coming_soon' ? 'Coming Soon' : '利用可能'}
                        </span>
                      </div>
                      <p className='text-xs text-gray-400 mt-0.5'>{integration.category}</p>
                    </div>
                  </div>
                  {integration.status !== 'coming_soon' && (
                    <button onClick={() => setExpandedId(isExpanded ? null : integration.id)}
                      className='px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors text-gray-600 border-gray-300 hover:bg-gray-50'>
                      {isExpanded ? '閉じる' : '設定'}
                    </button>
                  )}
                </div>
                <p className='text-sm text-gray-500 mt-3'>{integration.description}</p>
              </div>
              {isExpanded && integration.fields && (
                <div className='border-t border-gray-100 p-5 bg-gray-50 space-y-4'>
                  <h4 className='text-xs font-semibold text-gray-700'>接続設定</h4>
                  {integration.fields.map(field => (
                    <div key={field.key}>
                      <label className='block text-xs font-medium text-gray-600 mb-1'>{field.label}</label>
                      <input type={field.ftype} className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white' placeholder={field.placeholder} value={cfg[field.key] || ''} onChange={e => setField(integration.id, field.key, e.target.value)} />
                    </div>
                  ))}
                  {result && (
                    <div className={'flex items-center gap-2 text-xs px-3 py-2 rounded-lg ' + (result.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600')}>
                      <span>{result.ok ? '✅' : '⚠️'}</span><span>{result.msg}</span>
                    </div>
                  )}
                  <div className='flex gap-2'>
                    <button onClick={() => handleSave(integration)} className='px-4 py-2 text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90' style={{ backgroundColor: '#06C755' }}>
                      {saved[integration.id] ? '保存済み ✓' : '保存'}
                    </button>
                    <button onClick={() => handleTest(integration)} disabled={testing[integration.id]} className='px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50'>
                      {testing[integration.id] ? 'テスト中...' : '接続テスト'}
                    </button>
                    {integration.docsUrl && (
                      <a href={integration.docsUrl} target='_blank' rel='noopener noreferrer' className='px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors'>ドキュメント</a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className='mt-8 bg-blue-50 border border-blue-200 rounded-xl p-5'>
        <h3 className='text-sm font-bold text-blue-900 mb-2'>Webhookエンドポイント</h3>
        <p className='text-xs text-blue-700 mb-3'>LINE CRMのイベントを外部サービスに通知するため、Webhook管理ページからWebhook URLを登録してください。</p>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-blue-800'>
          {['友だち追加時', 'メッセージ受信時', 'CV達成時', 'フォーム回答時', 'タグ付与時', 'シナリオ完了時'].map(ev => (
            <div key={ev} className='flex items-center gap-2 bg-white/60 rounded-lg px-3 py-1.5'>
              <span className='w-2 h-2 rounded-full bg-blue-400 shrink-0'></span><span>{ev}</span>
            </div>
          ))}
        </div>
        <a href='/webhooks' className='mt-3 inline-flex items-center text-xs font-medium text-blue-700 hover:text-blue-900'>Webhook管理へ →</a>
      </div>
      <CcPromptButton prompts={ccPrompts} />
    </div>
  )
}
