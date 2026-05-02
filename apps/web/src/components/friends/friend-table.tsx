'use client'
import { useState } from 'react'
import Link from 'next/link'
import type { Tag } from '@line-crm/shared'
import type { FriendWithTags } from '@/lib/api'
import { api } from '@/lib/api'
import TagBadge from './tag-badge'

interface FriendTableProps {
  friends: FriendWithTags[]
  allTags: Tag[]
  onRefresh: () => void
}

export default function FriendTable({ friends, allTags, onRefresh }: FriendTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [addingTagForFriend, setAddingTagForFriend] = useState<string | null>(null)
  const [selectedTagId, setSelectedTagId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 一括操作用 state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkTagId, setBulkTagId] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkError, setBulkError] = useState('')
  const [bulkSuccess, setBulkSuccess] = useState('')

  const allSelected = friends.length > 0 && selectedIds.size === friends.length
  const someSelected = selectedIds.size > 0 && !allSelected

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(friends.map((f) => f.id)))
  }

  const handleBulkAddTag = async () => {
    if (!bulkTagId || selectedIds.size === 0) return
    setBulkLoading(true)
    setBulkError('')
    setBulkSuccess('')
    try {
      await Promise.all(Array.from(selectedIds).map((id) => api.friends.addTag(id, bulkTagId)))
      setBulkSuccess(`${selectedIds.size}件の友だちにタグを追加しました`)
      setSelectedIds(new Set())
      setBulkTagId('')
      onRefresh()
    } catch {
      setBulkError('一括タグ追加に失敗しました')
    } finally {
      setBulkLoading(false)
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
    setAddingTagForFriend(null)
    setSelectedTagId('')
    setError('')
  }

  const handleAddTag = async (friendId: string) => {
    if (!selectedTagId) return
    setLoading(true)
    setError('')
    try {
      await api.friends.addTag(friendId, selectedTagId)
      setAddingTagForFriend(null)
      setSelectedTagId('')
      onRefresh()
    } catch {
      setError('タグの追加に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveTag = async (friendId: string, tagId: string) => {
    setLoading(true)
    setError('')
    try {
      await api.friends.removeTag(friendId, tagId)
      onRefresh()
    } catch {
      setError('タグの削除に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('ja-JP', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    })
  }

  if (friends.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <p className="text-gray-500">友だちが見つかりません</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {error && (
        <div className="px-4 py-3 bg-red-50 border-b border-red-100 text-red-700 text-sm">{error}</div>
      )}

      {/* 一括操作バー */}
      {selectedIds.size > 0 && (
        <div className="px-4 py-3 bg-green-50 border-b border-green-200 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-green-800">{selectedIds.size}件選択中</span>
          <div className="flex items-center gap-2">
            <select
              className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              value={bulkTagId}
              onChange={(e) => setBulkTagId(e.target.value)}
            >
              <option value="">タグを選択...</option>
              {allTags.map((tag) => (
                <option key={tag.id} value={tag.id}>{tag.name}</option>
              ))}
            </select>
            <button
              onClick={handleBulkAddTag}
              disabled={!bulkTagId || bulkLoading}
              className="px-3 py-1 text-xs font-medium text-white rounded-md disabled:opacity-50 transition-opacity"
              style={{ backgroundColor: '#06C755' }}
            >
              {bulkLoading ? '追加中...' : '一括タグ追加'}
            </button>
          </div>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            選択解除
          </button>
          {bulkError && <span className="text-xs text-red-600">{bulkError}</span>}
          {bulkSuccess && <span className="text-xs text-green-700">{bulkSuccess}</span>}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected }}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                アイコン / 表示名
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                ステータス
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                タグ / 流入
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                登録日
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {friends.map((friend) => {
              const isExpanded = expandedId === friend.id
              const isAddingTag = addingTagForFriend === friend.id
              const isSelected = selectedIds.has(friend.id)
              const availableTags = allTags.filter(
                (t) => !friend.tags.some((ft) => ft.id === t.id)
              )
              return (
                <>
                  <tr
                    key={friend.id}
                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${isSelected ? 'bg-green-50' : ''}`}
                    onClick={() => toggleExpand(friend.id)}
                  >
                    <td className="px-4 py-3 w-10" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(friend.id)}
                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {friend.pictureUrl ? (
                          <img src={friend.pictureUrl} alt={friend.displayName} className="w-9 h-9 rounded-full object-cover bg-gray-100" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-medium">
                            {friend.displayName?.charAt(0) ?? '?'}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">{friend.displayName}</p>
                          {friend.statusMessage && (
                            <p className="text-xs text-gray-400 truncate max-w-[160px]">{friend.statusMessage}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {friend.isFollowing ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          フォロー中
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                          ブロック/退会
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(friend as unknown as { refCode?: string }).refCode && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            {(friend as unknown as { refCode: string }).refCode}
                          </span>
                        )}
                        {friend.tags.length > 0 ? (
                          friend.tags.map((tag) => <TagBadge key={tag.id} tag={tag} />)
                        ) : !((friend as unknown as { refCode?: string }).refCode) ? (
                          <span className="text-xs text-gray-400">なし</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(friend.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <svg className={`w-4 h-4 text-gray-400 transition-transform inline-block ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${friend.id}-detail`} className="bg-gray-50">
                      <td colSpan={6} className="px-6 py-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-semibold text-gray-500 mb-1">LINE ユーザーID</p>
                              <p className="text-xs text-gray-600 font-mono">{friend.lineUserId}</p>
                            </div>
                            <Link href={`/friends/${friend.id}`} onClick={(e) => e.stopPropagation()} className="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg font-medium transition-colors">
                              詳細ページへ →
                            </Link>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-500 mb-2">タグ管理</p>
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {friend.tags.map((tag) => (
                                <TagBadge key={tag.id} tag={tag} onRemove={() => handleRemoveTag(friend.id, tag.id)} />
                              ))}
                            </div>
                            {isAddingTag ? (
                              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <select className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-500" value={selectedTagId} onChange={(e) => setSelectedTagId(e.target.value)}>
                                  <option value="">タグを選択...</option>
                                  {availableTags.map((tag) => (
                                    <option key={tag.id} value={tag.id}>{tag.name}</option>
                                  ))}
                                </select>
                                <button onClick={() => handleAddTag(friend.id)} disabled={!selectedTagId || loading} className="px-3 py-1 text-xs font-medium rounded-md text-white disabled:opacity-50 transition-opacity" style={{ backgroundColor: '#06C755' }}>
                                  追加
                                </button>
                                <button onClick={() => { setAddingTagForFriend(null); setSelectedTagId('') }} className="px-3 py-1 text-xs font-medium rounded-md text-gray-600 bg-gray-200 hover:bg-gray-300 transition-colors">
                                  キャンセル
                                </button>
                              </div>
                            ) : (
                              availableTags.length > 0 && (
                                <button onClick={(e) => { e.stopPropagation(); setAddingTagForFriend(friend.id) }} className="text-xs font-medium text-green-600 hover:text-green-700 flex items-center gap-1 transition-colors">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                  タグを追加
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
