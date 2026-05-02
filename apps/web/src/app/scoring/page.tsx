'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Header from '@/components/layout/header'
import { api } from '@/lib/api'
import CcPromptButton from '@/components/cc-prompt-button'

interface ScoringRule {
  id: string
  name: string
  eventType: string
  scoreValue: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface FriendScore {
  id: string
  displayName: string
  score: number
}

interface CreateFormState {
  name: string
  eventType: string
  scoreValue: string
}

const ccPrompts = [
  {
    title: 'スコアリングルール設計',
    prompt: `スコアリングルールの設計をサポートしてください。
1. 主要なイベントタイプ別の推奨スコア値を提案
2. 正のスコア（エンゲージメント）と負のスコア（離脱兆候）のバランス設計
3. スコア閾値に基づくセグメント分類の推奨設定
手順を示してください。`,
  },
  {
    title: 'スコア分析レポート',
    prompt: `現在のスコアリングデータを分析してください。
1. ルール別のスコア付与回数と合計値を集計
2. 有効・無効ルールの見直しと最適化提案
3. スコア分布に基づく友だちのセグメント分析
結果をレポートしてください。`,
  },
]

export default function ScoringPage() {
  const [rules, setRules] = useState<ScoringRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<CreateFormState>({ name: '', eventType: '', scoreValue: '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  // Top scorer ranking
  const [topScorers, setTopScorers] = useState<FriendScore[]>([])
  const [scorersLoading, setScorersLoading] = useState(false)
  const [showRanking, setShowRanking] = useState(false)

  const loadRules = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.scoring.rules()
      if (res.success) {
        setRules(res.data)
      } else {
        setError(res.error)
      }
    } catch {
      setError('スコアリングルールの読み込みに失敗しました。もう一度お試しください。')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRules()
  }, [loadRules])

  const loadTopScorers = async () => {
    if (topScorers.length > 0) {
      setShowRanking(!showRanking)
      return
    }
    setShowRanking(true)
    setScorersLoading(true)
    try {
      // Get friends list then fetch scores for top ones
      const friendsRes = await api.friends.list({ limit: 20 })
      if (!friendsRes.success) {
        setScorersLoading(false)
        return
      }
      const friends = friendsRes.data.items || []
      const scoreResults = await Promise.allSettled(
        friends.slice(0, 20).map(async (f) => {
          const s = await api.scoring.friendScore(f.id)
          return {
            id: f.id,
            displayName: f.displayName || f.id,
            score: s.success ? (s.data as { totalScore?: number; currentScore?: number }).totalScore ?? (s.data as { totalScore?: number; currentScore?: number }).currentScore ?? 0 : 0,
          }
        })
      )
      const scored = scoreResults
        .filter((r): r is PromiseFulfilledResult<FriendScore> => r.status === 'fulfilled')
        .map((r) => r.value)
        .sort((a, b) => b.score - a.score)
        .filter((f) => f.score !== 0)
        .slice(0, 10)
      setTopScorers(scored)
    } catch {
      // ignore
    } finally {
      setScorersLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!form.name.trim()) {
      setFormError('ルール名を入力してください')
      return
    }
    if (!form.eventType.trim()) {
      setFormError('イベントタイプを入力してください')
      return
    }
    if (!form.scoreValue || isNaN(Number(form.scoreValue))) {
      setFormError('スコア値を数値で入力してください')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      const res = await api.scoring.createRule({
        name: form.name,
        eventType: form.eventType,
        scoreValue: Number(form.scoreValue),
      })
      if (res.success) {
        setShowCreate(false)
        setForm({ name: '', eventType: '', scoreValue: '' })
        loadRules()
      } else {
        setFormError(res.error)
      }
    } catch {
      setFormError('作成に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      await api.scoring.updateRule(id, { isActive: !current })
      loadRules()
    } catch {
      setError('ステータスの変更に失敗しました')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('このスコアリングルールを削除しますか？')) return
    try {
      await api.scoring.deleteRule(id)
      loadRules()
    } catch {
      setError('削除に失敗しました')
    }
  }

  const totalRules = rules.length
  const activeRules = rules.filter((r) => r.isActive).length
  const maxAbsScore = rules.length > 0 ? Math.max(...rules.map((r) => Math.abs(r.scoreValue))) : 1

  return (
    <div>
      <Header
        title="スコアリングルール"
        action={
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#06C755' }}
          >
            + 新規ルール
          </button>
        }
      />

      {/* Summary stats */}
      {!loading && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500">ルール總数</p>
            <p className="text-2xl font-bold text-gray-900">{totalRules}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500">有効なルール</p>
            <p className="text-2xl font-bold" style={{ color: '#06C755' }}>{activeRules}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={loadTopScorers}>
            <p className="text-xs text-gray-500">スコアランキング</p>
            <p className="text-sm font-semibold text-indigo-600 mt-1">トップ10を見る →</p>
          </div>
        </div>
      )}

      {/* Top scorer ranking panel */}
      {showRanking && (
        <div className="mb-6 bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-800">スコア上位友だち（トップ10）</h2>
            <button onClick={() => setShowRanking(false)} className="text-xs text-gray-400 hover:text-gray-600">閉じる</button>
          </div>
          {scorersLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-9 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : topScorers.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">スコアデータがありません。ルールを設定してスコアが付与されるとここに表示されます。</p>
          ) : (
            <div className="space-y-2">
              {topScorers.map((friend, idx) => (
                <Link key={friend.id} href={`/friends/${friend.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${idx === 0 ? 'bg-yellow-400' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-amber-600' : 'bg-gray-200 text-gray-600'}`}>
                    {idx + 1}
                  </span>
                  <span className="flex-1 text-sm text-gray-800 truncate">{friend.displayName}</span>
                  <span className={`text-sm font-bold ${friend.score >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {friend.score >= 0 ? '+' : ''}{friend.score}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {showCreate && (
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">新規スコアリングルールを作成</h2>
          <div className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">ルール名 <span className="text-red-500">*</span></label>
              <input type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="例: メッセージ開封"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">イベントタイプ <span className="text-red-500">*</span></label>
              <input type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="例: message_open, url_click, friend_add"
                value={form.eventType}
                onChange={(e) => setForm({ ...form, eventType: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">スコア値 <span className="text-red-500">*</span></label>
              <input type="number"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="例: 10 (正の値で加算、負の値で減算)"
                value={form.scoreValue}
                onChange={(e) => setForm({ ...form, scoreValue: e.target.value })}
              />
            </div>
            {formError && <p className="text-xs text-red-600">{formError}</p>}
            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 transition-opacity"
                style={{ backgroundColor: '#06C755' }}
              >
                {saving ? '作成中...' : '作成'}
              </button>
              <button onClick={() => { setShowCreate(false); setFormError('') }}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400">読み込み中...</div>
      ) : rules.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400">スコアリングルールがまだありません</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ルール名</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">イベントタイプ</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">スコア値</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">割合</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rules.map((rule) => {
                  const barWidth = maxAbsScore > 0 ? (Math.abs(rule.scoreValue) / maxAbsScore) * 100 : 0
                  const isPositive = rule.scoreValue >= 0
                  return (
                    <tr key={rule.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{rule.name}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{rule.eventType}</span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold">
                        <span style={{ color: isPositive ? '#06C755' : '#EF4444' }}>
                          {isPositive ? `+${rule.scoreValue}` : rule.scoreValue}
                        </span>
                      </td>
                      <td className="px-4 py-3 w-32">
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${barWidth}%`,
                                backgroundColor: isPositive ? '#06C755' : '#EF4444',
                              }}
                            />
                          </div>
                          <span className="text-xs text-gray-400 w-8 text-right">{Math.round(barWidth)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleActive(rule.id, rule.isActive)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${rule.isActive ? 'bg-green-500' : 'bg-gray-300'}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${rule.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleDelete(rule.id)} className="text-red-500 hover:text-red-700 text-sm">
                          削除
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CcPromptButton prompts={ccPrompts} />
    </div>
  )
}
