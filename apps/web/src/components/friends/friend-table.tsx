'use client'
import { useState } from 'react'
import Link from 'next/link'
import type { Tag } from '@line-crm/shared'
import { api } from '@/lib/api'
import type { FriendWithTags } from '@/lib/api'

interface FriendTableProps {
  friends: FriendWithTags[]
  tags: Tag[]
  onRefresh: () => void
  // Search/filter state (controlled from parent)
  searchQuery: string
  onSearchChange: (v: string) => void
  filterTagId: string
  onFilterTagChange: (v: string) => void
}

export default function FriendTable({
  friends,
  tags,
  onRefresh,
  searchQuery,
  onSearchChange,
  filterTagId,
  onFilterTagChange,
}: FriendTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkTagId, setBulkTagId] = useState('')
  const [bulkAction, setBulkAction] = useState<'add' | 'remove'>('add')
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkMsg, setBulkMsg] = useState('')

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === friends.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(friends.map((f) => f.id)))
    }
  }

  const handleBulk = async () => {
    if (!bulkTagId || selectedIds.size === 0) return
    setBulkLoading(true)
    setBulkMsg('')
    let ok = 0
    let fail = 0
    for (const friendId of Array.from(selectedIds)) {
      try {
        if (bulkAction === 'add') {
          await api.friends.addTag(friendId, bulkTagId)
        } else {
          await api.friends.removeTag(friendId, bulkTagId)
        }
        ok++
      } catch {
        fail++
      }
    }
    setBulkMsg(
      bulkAction === 'add'
        ? `${ok}件タグ追加完了${fail > 0 ? `（${fail}件失敗）` : ''}`
        : `${ok}件タグ削除完了${fail > 0 ? `（${fail}件失敗）` : ''}`
    )
    setBulkLoading(false)
    setSelectedIds(new Set())
    setBulkTagId('')
    onRefresh()
  }

  const handleAddTag = async (friendId: string, tagId: string) => {
    await api.friends.addTag(friendId, tagId)
    onRefresh()
  }

  const handleRemoveTag = async (friendId: string, tagId: string) => {
    await api.friends.removeTag(friendId, tagId)
    onRefresh()
  }

  return (
    <div>
      {/* Search + Tag filter bar */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="表示名で検索..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <select
          value={filterTagId}
          onChange={(e) => onFilterTagChange(e.target.value)}
          className="sm:w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        >
          <option value="">全タグ</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-lg">
          <span className="text-sm font-medium text-green-800">{selectedIds.size}件選択中</span>
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value as 'add' | 'remove')}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="add">タグ追加</option>
              <option value="remove">タグ削除</option>
            </select>
            <select
              value={bulkTagId}
              onChange={(e) => setBulkTagId(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">タグを選択...</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <button
              onClick={handleBulk}
              disabled={!bulkTagId || bulkLoading}
              className={`px-4 py-1.5 text-sm font-medium text-white rounded-lg disabled:opacity-50 ${bulkAction === 'add' ? '' : 'bg-red-500 hover:bg-red-600'}`}
              style={bulkAction === 'add' ? { backgroundColor: '#06C755' } : undefined}
            >
              {bulkLoading ? '処理中...' : bulkAction === 'add' ? '一括タグ追加' : '一括タグ削除'}
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              選択解除
            </button>
          </div>
          {bulkMsg && <span className="text-xs text-green-700 font-medium">{bulkMsg}</span>}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={friends.length > 0 && selectedIds.size === friends.length}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  友だち
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  タグ
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  登録日
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {friends.map((friend) => {
                const isSelected = selectedIds.has(friend.id)
                const isExpanded = expandedId === friend.id
                const friendTags = friend.tags || []
                const availableTags = tags.filter((t) => !friendTags.find((ft) => ft.id === t.id))

                return (
                  <>
                    <tr
                      key={friend.id}
                      className={`transition-colors ${isSelected ? 'bg-green-50' : 'hover:bg-gray-50'}`}
                    >
                      <td className="px-4 py-3">
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
                            <img
                              src={friend.pictureUrl}
                              alt={friend.displayName || ''}
                              className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                              <span className="text-gray-500 text-sm font-medium">
                                {(friend.displayName || '?').charAt(0)}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {friend.displayName || '名前なし'}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5 font-mono truncate max-w-[160px]">
                              {friend.lineUserId}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {friendTags.map((tag) => (
                            <span
                              key={tag.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: tag.color ? tag.color + '20' : '#e5e7eb',
                                color: tag.color || '#374151',
                              }}
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                        {new Date(friend.createdAt).toLocaleDateString('ja-JP')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/friends/${friend.id}`}
                            className="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                          >
                            詳細
                          </Link>
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : friend.id)}
                            className="px-3 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
                          >
                            {isExpanded ? '閉じる' : 'タグ編集'}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${friend.id}-expanded`} className="bg-gray-50">
                        <td colSpan={5} className="px-6 py-4">
                          <div className="space-y-3">
                            {/* Current tags with remove */}
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-2">現在のタグ</p>
                              {friendTags.length === 0 ? (
                                <p className="text-xs text-gray-400">タグなし</p>
                              ) : (
                                <div className="flex flex-wrap gap-1.5">
                                  {friendTags.map((tag) => (
                                    <span
                                      key={tag.id}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                                      style={{
                                        backgroundColor: tag.color ? tag.color + '20' : '#e5e7eb',
                                        color: tag.color || '#374151',
                                      }}
                                    >
                                      {tag.name}
                                      <button
                                        onClick={() => handleRemoveTag(friend.id, tag.id)}
                                        className="hover:text-red-500 transition-colors"
                                      >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            {/* Add tag */}
                            {availableTags.length > 0 && (
                              <div className="flex items-center gap-2">
                                <select
                                  defaultValue=""
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      handleAddTag(friend.id, e.target.value)
                                      e.target.value = ''
                                    }
                                  }}
                                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                                >
                                  <option value="">タグを追加...</option>
                                  {availableTags.map((t) => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                  ))}
                                </select>
                              </div>
                            )}
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
        {friends.length === 0 && (
          <div className="p-8 text-center text-gray-400 text-sm">
            該当する友だちがいません
          </div>
        )}
      </div>
    </div>
  )
}
