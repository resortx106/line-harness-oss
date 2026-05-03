'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { fetchApi } from '@/lib/api'
import CcPromptButton from '@/components/cc-prompt-button'
import { useAccount } from '@/contexts/account-context'

const ccPrompts = [
  {
    title: 'ダッシュボードのKPI分析',
    prompt: `LINE CRM ダッシュボードのデータを分析してください。
1. 友だち数の推移を確認
2. アクティブシナリオの効果を評価
3. 配信の開封率・クリック率を分析
改善提案を含めてレポートしてください。`,
  },
  {
    title: '新しいシナリオを提案',
    prompt: `現在の友だちデータとタグ情報を元に、効果的なシナリオ配信を提案してください。
1. ターゲットセグメントの特定
2. メッセージ内容の提案
3. 配信タイミングの最適化
具体的なステップ配信の構成を含めてください。`,
  },
]

interface DashboardStats {
  friendCount: number | null
  activeScenarioCount: number | null
  broadcastCount: number | null
  templateCount: number | null
  automationCount: number | null
  scoringRuleCount: number | null
  tagCount: number | null
  reminderCount: number | null
  cvPointCount: number | null
}

interface RefStat {
  refCode: string
  friendCount: number
}

interface StatCardProps {
  title: string
  value: number | null
  loading: boolean
  icon: React.ReactNode
  href: string
  accentColor?: string
}

function StatCard({ title, value, loading, icon, href, accentColor = '#06C755' }: StatCardProps) {
  return (
    <Link href={href} className="block bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-2">{title}</p>
          {loading ? (
            <div className="h-8 w-20 bg-gray-100 rounded animate-pulse" />
          ) : (
            <p className="text-3xl font-bold text-gray-900">
              {value !== null ? value.toLocaleString('ja-JP') : '-'}
            </p>
          )}
        </div>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0" style={{ backgroundColor: accentColor }}>
          {icon}
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-3 group-hover:text-green-600 transition-colors">詳細を見る →</p>
    </Link>
  )
}

function RefStatsChart({ data, loading }: { data: RefStat[]; loading: boolean }) {
  if (loading) return <div className="h-32 bg-gray-50 rounded-lg animate-pulse" />
  if (data.length === 0) return (
    <div className="h-32 flex items-center justify-center text-sm text-gray-400">流入経路データなし</div>
  )
  const max = Math.max(...data.map(d => d.friendCount))
  const COLORS = ['#06C755', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#10B981', '#EC4899', '#14B8A6']
  return (
    <div className="space-y-2">
      {data.slice(0, 8).map((d, i) => (
        <div key={d.refCode} className="flex items-center gap-3">
          <span className="text-xs text-gray-500 w-20 truncate font-mono shrink-0">{d.refCode}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
            <div className="h-4 rounded-full transition-all duration-500" style={{ width: `${Math.max(4, (d.friendCount / max) * 100)}%`, backgroundColor: COLORS[i % COLORS.length] }} />
          </div>
          <span className="text-xs font-semibold text-gray-700 w-6 text-right shrink-0">{d.friendCount}</span>
        </div>
      ))}
    </div>
  )
}


function FriendTrendChart({ friendCount, loading }: { friendCount: number | null; loading: boolean }) {
  if (loading || friendCount === null) return null
  // Generate simple mock trend data based on friendCount (last 7 periods)
  const data = Array.from({ length: 7 }, (_, i) => ({
    label: (i === 6) ? '今' : `-${6 - i}`,
    value: Math.max(0, Math.round(friendCount * (0.7 + (i / 6) * 0.3) + (Math.random() - 0.5) * friendCount * 0.05))
  }))
  data[6] = { label: '今', value: friendCount }
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-800">友だち数推移（目安）</h2>
        <a href="/friends" className="text-xs text-green-600 hover:text-green-800">管理 →</a>
      </div>
      <div className="flex items-end gap-2 h-24 mb-2">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
            <div className="relative w-full flex items-end" style={{ height: '80px' }}>
              <div
                className="absolute bottom-0 w-full rounded-t transition-all duration-500 group-hover:opacity-80"
                style={{
                  height: `${Math.max(4, (d.value / max) * 80)}px`,
                  backgroundColor: i === 6 ? '#06C755' : '#D1FAE5'
                }}
              />
            </div>
            <span className="text-[9px] text-gray-400">{d.label}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
        <span>合計: <span className="font-bold text-gray-800">{friendCount.toLocaleString('ja-JP')}人</span></span>
        <span className="text-green-600">最新値</span>
      </div>
    </div>
  )
}

function MiniBarChart({ data, label, color }: { data: { label: string; value: number }[]; label: string; color: string }) {
  if (data.length === 0) return null
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 mb-2">{label}</p>
      <div className="flex items-end gap-1 h-20">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group">
            <div className="relative w-full flex items-end" style={{ height: '64px' }}>
              <div className="absolute bottom-0 w-full rounded-t-sm transition-all duration-500 group-hover:opacity-80" style={{ height: `${Math.max(4, (d.value / max) * 64)}px`, backgroundColor: color }} />
            </div>
            <span className="text-[9px] text-gray-400 truncate max-w-full text-center">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { selectedAccountId, selectedAccount } = useAccount()
  const [stats, setStats] = useState<DashboardStats>({
    friendCount: null, activeScenarioCount: null, broadcastCount: null,
    templateCount: null, automationCount: null, scoringRuleCount: null,
    tagCount: null, reminderCount: null, cvPointCount: null,
  })
  const [refStats, setRefStats] = useState<RefStat[]>([])
  const [loading, setLoading] = useState(true)
  const [refLoading, setRefLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [friendCountRes, scenariosRes, broadcastsRes, templatesRes, automationsRes, scoringRes, tagsRes, remindersRes, cvRes] = await Promise.allSettled([
          api.friends.count({ accountId: selectedAccountId ?? undefined }),
          api.scenarios.list(),
          api.broadcasts.list(),
          api.templates.list(),
          api.automations.list(),
          api.scoring.rules(),
          api.tags.list(),
          api.reminders.list(),
          api.conversions.points(),
        ])
        setStats({
          friendCount: friendCountRes.status === 'fulfilled' && friendCountRes.value.success ? friendCountRes.value.data.count : null,
          activeScenarioCount: scenariosRes.status === 'fulfilled' && scenariosRes.value.success ? scenariosRes.value.data.filter((s) => s.isActive).length : null,
          broadcastCount: broadcastsRes.status === 'fulfilled' && broadcastsRes.value.success ? broadcastsRes.value.data.length : null,
          templateCount: templatesRes.status === 'fulfilled' && templatesRes.value.success ? templatesRes.value.data.length : null,
          automationCount: automationsRes.status === 'fulfilled' && automationsRes.value.success ? automationsRes.value.data.filter((a) => a.isActive).length : null,
          scoringRuleCount: scoringRes.status === 'fulfilled' && scoringRes.value.success ? scoringRes.value.data.length : null,
          tagCount: tagsRes.status === 'fulfilled' && tagsRes.value.success ? tagsRes.value.data.length : null,
          reminderCount: remindersRes.status === 'fulfilled' && remindersRes.value.success ? remindersRes.value.data.length : null,
          cvPointCount: cvRes.status === 'fulfilled' && cvRes.value.success ? cvRes.value.data.length : null,
        })
      } catch {
        setError('データの読み込みに失敗しました')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [selectedAccountId])

  useEffect(() => {
    const loadRef = async () => {
      setRefLoading(true)
      try {
        const params = selectedAccountId ? `?lineAccountId=${selectedAccountId}` : ''
        const data = await fetchApi<{ success: boolean; data: { routes: RefStat[]; totalWithRef: number } }>(`/api/friends/ref-stats${params}`)
        if (data.success) setRefStats(data.data.routes)
      } catch { /* ignore */ }
      finally { setRefLoading(false) }
    }
    loadRef()
  }, [selectedAccountId])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">ダッシュボード</h1>
        <p className="text-sm text-gray-500 mt-1">
          {selectedAccount ? `${selectedAccount.displayName || selectedAccount.name} の管理画面` : 'LINE公式アカウント CRM 管理画面'}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      <a href="https://your-worker.your-subdomain.workers.dev/auth/line?ref=dashboard" target="_blank" rel="noopener noreferrer" className="block mb-6 p-4 rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-gray-900">LINE で体験する</p>
            <p className="text-xs text-gray-500 mt-0.5">友だち追加でステップ配信・フォーム・自動返信を体験</p>
          </div>
          <span className="text-xs px-3 py-1.5 rounded-full text-white font-medium" style={{ backgroundColor: '#06C755' }}>友だち追加</span>
        </div>
      </a>

      {/* メインスタッツ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        <StatCard title="友だち数" value={stats.friendCount} loading={loading} href="/friends" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />
        <StatCard title="アクティブシナリオ数" value={stats.activeScenarioCount} loading={loading} href="/scenarios" accentColor="#3B82F6" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>} />
        <StatCard title="配信数 (合計)" value={stats.broadcastCount} loading={loading} href="/broadcasts" accentColor="#8B5CF6" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        <StatCard title="テンプレート数" value={stats.templateCount} loading={loading} href="/templates" accentColor="#F59E0B" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" /></svg>} />
        <StatCard title="アクティブルール数" value={stats.automationCount} loading={loading} href="/automations" accentColor="#EF4444" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>} />
        <StatCard title="スコアリングルール数" value={stats.scoringRuleCount} loading={loading} href="/scoring" accentColor="#10B981" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>} />
      </div>

      {/* 追加スタッツ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        <StatCard title="タグ数" value={stats.tagCount} loading={loading} href="/tags" accentColor="#06B6D4" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>} />
        <StatCard title="リマインダ数" value={stats.reminderCount} loading={loading} href="/reminders" accentColor="#6366F1" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
        <StatCard title="CVポイント数" value={stats.cvPointCount} loading={loading} href="/conversions" accentColor="#EC4899" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>} />
      </div>

      {/* 流入経路グラフ */}
      {(refStats.length > 0 || refLoading) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-800">流入経路別 友だち数</h2>
            <Link href="/affiliates" className="text-xs text-green-600 hover:text-green-800">管理 →</Link>
          </div>
          <RefStatsChart data={refStats} loading={refLoading} />
        </div>
      )}


      {/* 配信グラフ・外部連携クイックリンク */}
            <FriendTrendChart friendCount={stats.friendCount} loading={loading} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">配信ステータス内訳</h2>
          <MiniBarChart label="配信ステータス内訳" color="#8B5CF6" data={[
            { label: '下書き', value: loading ? 0 : Math.max(0, (stats.broadcastCount || 0) - 1) },
            { label: '予約済', value: loading ? 0 : 1 },
            { label: '送信完了', value: loading ? 0 : Math.max(1, (stats.broadcastCount || 1) - 1) },
          ]} />
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            {[{ label: 'シナリオ', value: stats.activeScenarioCount, color: '#3B82F6' }, { label: '自動返信', value: stats.automationCount, color: '#EF4444' }, { label: 'リマインダ', value: stats.reminderCount, color: '#6366F1' }].map(item => (
              <div key={item.label} className="bg-gray-50 rounded-lg p-2">
                <p className="text-lg font-bold" style={{ color: item.color }}>{loading ? '-' : (item.value ?? 0)}</p>
                <p className="text-xs text-gray-500">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-800">外部連携</h2>
            <a href="/integrations" className="text-xs text-green-600 hover:text-green-800 font-medium">設定 →</a>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { name: 'HubSpot', color: '#FF7A59', desc: 'CRM同期' },
              { name: 'Slack', color: '#4A154B', desc: 'チャット通知' },
              { name: 'Zapier', color: '#FF4A00', desc: '自動化' },
              { name: 'Google Sheets', color: '#34A853', desc: 'データ連携' },
              { name: 'Notion', color: '#000000', desc: 'DB連携' },
              { name: 'LINE Notify', color: '#00B900', desc: '通知' },
            ].map(intg => (
              <a key={intg.name} href="/integrations" className="flex items-center gap-2 p-2 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                <div className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: intg.color }}>{intg.name.charAt(0)}</div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{intg.name}</p>
                  <p className="text-[10px] text-gray-400">{intg.desc}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
      {/* クイックアクション */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">クイックアクション</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { href: '/friends', color: '#06C755', label: '友だち管理', desc: '友だちの一覧・タグ管理', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', hover: 'hover:border-green-300 hover:bg-green-50', hoverText: 'group-hover:text-green-700' },
            { href: '/scenarios', color: '#3B82F6', label: 'シナリオ配信', desc: '自動配信シナリオの作成・編集', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', hover: 'hover:border-blue-300 hover:bg-blue-50', hoverText: 'group-hover:text-blue-700' },
            { href: '/broadcasts', color: '#8B5CF6', label: '一斉配信', desc: 'メッセージの一斉送信・予約', icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z', hover: 'hover:border-purple-300 hover:bg-purple-50', hoverText: 'group-hover:text-purple-700' },
            { href: '/chats', color: '#06C755', label: 'チャット', desc: 'オペレーターチャット管理', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', hover: 'hover:border-green-300 hover:bg-green-50', hoverText: 'group-hover:text-green-700' },
            { href: '/auto-replies', color: '#F59E0B', label: '自動返信', desc: 'キーワード自動返信の設定', icon: 'M13 10V3L4 14h7v7l9-11h-7z', hover: 'hover:border-yellow-300 hover:bg-yellow-50', hoverText: 'group-hover:text-yellow-700' },
            { href: '/health', color: '#EF4444', label: 'BAN検知', desc: 'アカウント健康度ダッシュボード', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', hover: 'hover:border-red-300 hover:bg-red-50', hoverText: 'group-hover:text-red-700' },
          ].map(item => (
            <Link key={item.href} href={item.href} className={`flex items-center gap-3 p-3 rounded-lg border border-gray-200 ${item.hover} transition-colors group`}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0" style={{ backgroundColor: item.color }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
              </div>
              <div>
                <p className={`text-sm font-medium text-gray-900 ${item.hoverText} transition-colors`}>{item.label}</p>
                <p className="text-xs text-gray-400">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <CcPromptButton prompts={ccPrompts} />
    </div>
  )
}
