'use client'
import { useState, useEffect, useCallback } from 'react'
import { fetchApi, api } from '@/lib/api'
import { useAccount } from '@/contexts/account-context'
import Header from '@/components/layout/header'
import CcPromptButton from '@/components/cc-prompt-button'

interface Affiliate { id: string; name: string; code: string; commissionRate: number; isActive: boolean; createdAt: string }
interface AffiliateReport { affiliateId: string; affiliateName: string; code: string; commissionRate: number; totalClicks: number; totalConversions: number; totalRevenue: number }
interface LineAccount { id: string; channelId: string; name: string }

const ccPrompts = [
  { title: '\u30a2\u30d5\u30a3\u30ea\u30a8\u30a4\u30c8\u5206\u6790', prompt: '\u6d41\u5165\u7d4c\u8def\u5225\u306e\u53cb\u3060\u3061\u7372\u5f97\u6210\u679c\u3092\u5206\u6790\u3057\u3066\u304f\u3060\u3055\u3044' },
  { title: '\u65b0\u898f\u6d41\u5165\u7d4c\u8def\u306e\u63d0\u6848', prompt: '\u65b0\u3057\u3044\u6d41\u5165\u7d4c\u8def\u3092\u8ffd\u52a0\u3059\u308b\u63d0\u6848\u3092\u3057\u3066\u304f\u3060\u3055\u3044' },
]

export default function AffiliatesPage() {
  const { selectedAccountId } = useAccount()
  const [affiliates, setAffiliates] = useState<Affiliate[]>([])
  const [lineAccount, setLineAccount] = useState<LineAccount | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formCode, setFormCode] = useState('')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [qrTarget, setQrTarget] = useState<{ code: string; url: string } | null>(null)
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null)
  const [reports, setReports] = useState<Record<string, AffiliateReport | null>>({})
  const [reportsLoading, setReportsLoading] = useState<Record<string, boolean>>({})

  const loadAffiliates = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = selectedAccountId ? '?accountId=' + selectedAccountId : ''
      const data = await fetchApi<Affiliate[] | { items: Affiliate[] } | { success: boolean; data: Affiliate[] }>('/api/affiliates' + params)
      if (Array.isArray(data)) { setAffiliates(data) }
      else if ('items' in data && Array.isArray(data.items)) { setAffiliates(data.items) }
      else if ('data' in data && Array.isArray(data.data)) { setAffiliates(data.data) }
      else { setAffiliates([]) }
    } catch { setError('\u6d41\u5165\u7d4c\u8def\u306e\u8aad\u307f\u8fbc\u307f\u306b\u5931\u6557\u3057\u307e\u3057\u305f') }
    finally { setLoading(false) }
  }, [selectedAccountId])

  const loadLineAccount = useCallback(async () => {
    try {
      const params = selectedAccountId ? '?accountId=' + selectedAccountId : ''
      const data = await fetchApi<LineAccount[] | { items: LineAccount[] }>('/api/line-accounts' + params)
      const accounts = Array.isArray(data) ? data : (data.items || [])
      if (accounts.length > 0) setLineAccount(accounts[0])
    } catch { /* ignore */ }
  }, [selectedAccountId])

  useEffect(() => { loadAffiliates(); loadLineAccount() }, [loadAffiliates, loadLineAccount])

  const toggleReport = async (id: string) => {
    if (expandedReportId === id) { setExpandedReportId(null); return }
    setExpandedReportId(id)
    if (reports[id] !== undefined) return
    setReportsLoading((prev) => ({ ...prev, [id]: true }))
    try {
      const res = await api.affiliates.report(id)
      if (res.success) { setReports((prev) => ({ ...prev, [id]: res.data })) }
      else { setReports((prev) => ({ ...prev, [id]: null })) }
    } catch { setReports((prev) => ({ ...prev, [id]: null })) }
    finally { setReportsLoading((prev) => ({ ...prev, [id]: false })) }
  }

  const getLineLink = (code: string) => {
    if (!lineAccount?.channelId) return null
    return 'https://line.me/R/ti/p/@' + lineAccount.channelId + '?ref=' + code
  }
  const getQrUrl = (link: string) => 'https://api.qrserver.com/v1/create-qr-code/?data=' + encodeURIComponent(link) + '&size=300x300&margin=10'
  const copyLink = async (code: string) => {
    const link = getLineLink(code); if (!link) return
    await navigator.clipboard.writeText(link); setCopied(code); setTimeout(() => setCopied(null), 2000)
  }
  const openQr = (code: string) => { const link = getLineLink(code); if (!link) return; setQrTarget({ code, url: link }) }
  const downloadQr = (code: string, url: string) => { const qrUrl = getQrUrl(url); const a = document.createElement('a'); a.href = qrUrl; a.download = 'qr-' + code + '.png'; a.target = '_blank'; a.click() }
  const openCreate = () => { setEditingId(null); setFormName(''); setFormCode(''); setShowForm(true) }
  const openEdit = (aff: Affiliate) => { setEditingId(aff.id); setFormName(aff.name); setFormCode(aff.code); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setEditingId(null); setFormName(''); setFormCode('') }
  const handleSave = async () => {
    if (!formName.trim() || !formCode.trim()) return
    setSaving(true)
    try {
      const body = { name: formName.trim(), code: formCode.trim() }
      const url = editingId ? '/api/affiliates/' + editingId : '/api/affiliates'
      const method = editingId ? 'PUT' : 'POST'
      await fetchApi<unknown>(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      closeForm(); await loadAffiliates()
    } catch { alert('\u4fdd\u5b58\u306b\u5931\u6557\u3057\u307e\u3057\u305f') }
    finally { setSaving(false) }
  }
  const handleDelete = async (id: string, name: string) => {
    if (!confirm('\u300c' + name + '\u300d\u3092\u524a\u9664\u3057\u307e\u3059\u304b\uff1f')) return
    try { await fetchApi<unknown>('/api/affiliates/' + id, { method: 'DELETE' }); await loadAffiliates() }
    catch { alert('\u524a\u9664\u306b\u5931\u6557\u3057\u307e\u3057\u305f') }
  }
  const formatCurrency = (value: number) => new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value)

  return (
    <div>
      <Header title='\u6d41\u5165\u7d4c\u8def\u7ba1\u7406'
        action={<button onClick={openCreate} className='px-4 py-2 min-h-[44px] text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90' style={{ backgroundColor: '#06C755' }}>+ \u65b0\u898f\u4f5c\u6210</button>}
      />
      {error && <div className='bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm'>{error}</div>}
      {showForm && (
        <div className='fixed inset-0 bg-black/40 z-50 flex items-center justify-center' onClick={closeForm}>
          <div className='bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4' onClick={(e) => e.stopPropagation()}>
            <h2 className='text-lg font-bold mb-4'>{editingId ? '\u6d41\u5165\u7d4c\u8def\u3092\u7de8\u96c6' : '\u65b0\u3057\u3044\u6d41\u5165\u7d4c\u8def\u3092\u4f5c\u6210'}</h2>
            <div className='space-y-4'>
              <div><label className='block text-sm font-medium text-gray-700 mb-1'>\u7d4c\u8def\u540d</label>
                <input type='text' value={formName} onChange={(e) => setFormName(e.target.value)} placeholder='\u4f8b: Instagram\u5e83\u544a' className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400' /></div>
              <div><label className='block text-sm font-medium text-gray-700 mb-1'>ref \u30b3\u30fc\u30c9</label>
                <input type='text' value={formCode} onChange={(e) => setFormCode(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))} placeholder='\u4f8b: instagram' className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 font-mono' />
                <p className='text-xs text-gray-400 mt-1'>\u534a\u89d2\u82f1\u6570\u5b57\u30fb\u30cf\u30a4\u30d5\u30f3\u30fb\u30a2\u30f3\u30c0\u30fc\u30d0\u30fc\u306e\u307f</p></div>
            </div>
            <div className='flex gap-2 mt-6'>
              <button onClick={closeForm} className='flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50'>\u30ad\u30e3\u30f3\u30bb\u30eb</button>
              <button onClick={handleSave} disabled={saving || !formName.trim() || !formCode.trim()} className='flex-1 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium' style={{ backgroundColor: '#06C755' }}>{saving ? '\u4fdd\u5b58\u4e2d...' : '\u4fdd\u5b58'}</button>
            </div>
          </div>
        </div>
      )}
      {qrTarget && (
        <div className='fixed inset-0 bg-black/50 z-50 flex items-center justify-center' onClick={() => setQrTarget(null)}>
          <div className='bg-white rounded-2xl shadow-2xl p-6 w-full max-w-xs mx-4' onClick={(e) => e.stopPropagation()}>
            <h2 className='text-base font-bold text-center mb-4'>QR\u30b3\u30fc\u30c9</h2>
            <div className='flex justify-center mb-4'><img src={getQrUrl(qrTarget.url)} alt='QR\u30b3\u30fc\u30c9' width={240} height={240} className='rounded-lg border border-gray-200' /></div>
            <p className='text-xs text-gray-500 text-center mb-4 break-all'>{qrTarget.url}</p>
            <div className='flex gap-2'>
              <button onClick={() => setQrTarget(null)} className='flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm'>\u9589\u3058\u308b</button>
              <button onClick={() => downloadQr(qrTarget.code, qrTarget.url)} className='flex-1 text-white py-2 rounded-lg text-sm font-medium' style={{ backgroundColor: '#06C755' }}>\u30c0\u30a6\u30f3\u30ed\u30fc\u30c9</button>
            </div>
          </div>
        </div>
      )}
      {loading ? (<div className='text-center py-12 text-gray-400'>\u8aad\u307f\u8fbc\u307f\u4e2d...</div>)
      : affiliates.length === 0 ? (<div className='bg-white rounded-xl border border-gray-200 py-12 text-center text-gray-400'>\u6d41\u5165\u7d4c\u8def\u304c\u307e\u3060\u767b\u9332\u3055\u308c\u3066\u3044\u307e\u305b\u3093</div>)
      : (
        <div className='space-y-3'>
          {affiliates.map((aff) => {
            const link = getLineLink(aff.code)
            const report = reports[aff.id]
            const isExpanded = expandedReportId === aff.id
            return (
              <div key={aff.id} className='bg-white rounded-xl border border-gray-200 overflow-hidden'>
                <div className='p-4'>
                  <div className='flex items-start justify-between'>
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-2 mb-1'>
                        <span className='font-semibold text-gray-900'>{aff.name}</span>
                        <span className='bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded font-mono'>{aff.code}</span>
                      </div>
                      {link ? (
                        <div className='flex items-center gap-2 mt-2 flex-wrap'>
                          <span className='text-xs text-gray-500 truncate max-w-xs'>{link}</span>
                          <button onClick={() => copyLink(aff.code)} className='text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded'>{copied === aff.code ? '\u30b3\u30d4\u30fc\u6e08\u307f \u2713' : '\u30b3\u30d4\u30fc'}</button>
                          <button onClick={() => openQr(aff.code)} className='text-xs bg-purple-50 text-purple-600 hover:bg-purple-100 px-2 py-1 rounded'>QR\u30b3\u30fc\u30c9</button>
                        </div>
                      ) : (<p className='text-xs text-gray-400 mt-1'>LINE\u30a2\u30ab\u30a6\u30f3\u30c8\u3092\u8a2d\u5b9a\u3059\u308b\u3068\u30ea\u30f3\u30af\u304c\u8868\u793a\u3055\u308c\u307e\u3059</p>)}
                    </div>
                    <div className='flex gap-2 ml-4 shrink-0'>
                      <button onClick={() => toggleReport(aff.id)} className={'flex items-center gap-1 text-xs px-2.5 py-1 rounded transition-colors ' + (isExpanded ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100')}>
                        <svg className='w-3.5 h-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' /></svg>
                        \u30ec\u30dd\u30fc\u30c8
                      </button>
                      <button onClick={() => openEdit(aff)} className='text-sm text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50'>\u7de8\u96c6</button>
                      <button onClick={() => handleDelete(aff.id, aff.name)} className='text-sm text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50'>\u524a\u9664</button>
                    </div>
                  </div>
                </div>
                {isExpanded && (
                  <div className='border-t border-gray-100 bg-gray-50 px-4 py-4'>
                    {reportsLoading[aff.id] ? (
                      <div className='grid grid-cols-3 gap-3'>{[...Array(3)].map((_, i) => (<div key={i} className='h-14 bg-gray-200 rounded-lg animate-pulse' />))}</div>
                    ) : !report ? (
                      <p className='text-xs text-gray-400 text-center py-3'>\u30c7\u30fc\u30bf\u304c\u3042\u308a\u307e\u305b\u3093</p>
                    ) : (
                      <div>
                        <p className='text-xs font-semibold text-gray-600 mb-3'>\u30ec\u30dd\u30fc\u30c8\uff08\u5168\u671f\u9593\uff09</p>
                        <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
                          <div className='bg-white rounded-lg border border-gray-200 p-3 text-center'><p className='text-xs text-gray-500 mb-1'>\u30af\u30ea\u30c3\u30af\u6570</p><p className='text-lg font-bold text-gray-900'>{report.totalClicks.toLocaleString()}</p></div>
                          <div className='bg-white rounded-lg border border-gray-200 p-3 text-center'><p className='text-xs text-gray-500 mb-1'>CV\u6570</p><p className='text-lg font-bold' style={{ color: '#06C755' }}>{report.totalConversions.toLocaleString()}</p></div>
                          <div className='bg-white rounded-lg border border-gray-200 p-3 text-center'><p className='text-xs text-gray-500 mb-1'>CVR</p><p className='text-lg font-bold text-blue-600'>{report.totalClicks > 0 ? ((report.totalConversions / report.totalClicks) * 100).toFixed(1) : '0.0'}%</p></div>
                          <div className='bg-white rounded-lg border border-gray-200 p-3 text-center'><p className='text-xs text-gray-500 mb-1'>\u58f2\u4e0a</p><p className='text-lg font-bold text-purple-700'>{formatCurrency(report.totalRevenue)}</p></div>
                        </div>
                        {report.commissionRate > 0 && (<p className='text-xs text-gray-400 mt-2 text-right'>\u624b\u6570\u6599\u7387: {(report.commissionRate * 100).toFixed(1)}% / \u6e08\u624b\u6570\u6599\u7b97\u5b9a: {formatCurrency(report.totalRevenue * report.commissionRate)}</p>)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      <CcPromptButton prompts={ccPrompts} />
    </div>
  )
}
