'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Tag } from '@line-crm/shared'
import { api } from '@/lib/api'
import type { FriendWithTags } from '@/lib/api'
import Header from '@/components/layout/header'
import FriendTable from '@/components/friends/friend-table'
import CcPromptButton from '@/components/cc-prompt-button'
import { useAccount } from '@/contexts/account-context'

const ccPrompts = [
  {
    title: 'åã ã¡ã®ã»ã°ã¡ã³ãåæ',
    prompt: `åã ã¡ä¸è¦§ã®ãã¼ã¿ãåæãã¦ãã ããã
1. ã¿ã°å¥ã®åã ã¡æ°ãéè¨
2. ã¢ã¯ãã£ãçã®é«ãã»ã°ã¡ã³ããç¹å®
3. ã¨ã³ã²ã¼ã¸ã¡ã³ããä½ãå±¤ã¸ã®æ½ç­ãææ¡
ã¬ãã¼ãå½¢å¼ã§åºåãã¦ãã ããã`,
  },
  {
    title: 'ã¿ã°ä¸æ¬ç®¡ç',
    prompt: `åã ã¡ã®ã¿ã°ãä¸æ¬ç®¡çãã¦ãã ããã
1. æªã¿ã°ã®åã ã¡ãç¹å®
2. è¡åå±¥æ­´ã«åºã¥ããã¿ã°ä»ãææ¡
3. ä¸è¦ã¿ã°ã®æ´ç
ä½æ¥­æé ãç¤ºãã¦ãã ããã`,
  },
]

const PAGE_SIZE = 1000

export default function FriendsPage() {
  const { selectedAccountId } = useAccount()
  const [friends, setFriends] = useState<FriendWithTags[]>([])
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [selectedTagId, setSelectedTagId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadTags = useCallback(async () => {
    try {
      const res = await api.tags.list()
      if (res.success) setAllTags(res.data)
    } catch {
      // Non-blocking â tags used for filter
    }
  }, [])

  const loadFriends = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params: Record<string, string> = {
        offset: String((page - 1) * PAGE_SIZE),
        limit: String(PAGE_SIZE),
      }
      if (selectedTagId) params.tagId = selectedTagId
      if (searchQuery) params.search = searchQuery
      if (selectedAccountId) params.accountId = selectedAccountId

      const res = await api.friends.list(params)
      if (res.success) {
        setFriends(res.data.items.filter((f) => f.displayName && f.displayName.trim() !== ''))
        setTotal(res.data.total)
        setHasNextPage(res.data.hasNextPage)
      } else {
        setError(res.error)
      }
    } catch {
      setError('åã ã¡ã®èª­ã¿è¾¼ã¿ã«å¤±æãã¾ãããããä¸åº¦ãè©¦ããã ããã')
    } finally {
      setLoading(false)
    }
  }, [page, selectedTagId, searchQuery, selectedAccountId])

  useEffect(() => {
    loadTags()
  }, [loadTags])

  useEffect(() => {
    setPage(1)
  }, [selectedTagId, searchQuery, selectedAccountId])

  useEffect(() => {
    loadFriends()
  }, [loadFriends])

  const handleTagFilter = (tagId: string) => {
    setSelectedTagId(tagId)
  }

  return (
    <div>
      <Header title="åã ã¡ç®¡ç" />

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 mb-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="ååã§æ¤ç´¢..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 min-h-[44px] bg-white focus:outline-none focus:ring-2 focus:ring-green-500 w-48"
          />
          <label className="text-sm text-gray-600 font-medium whitespace-nowrap">ã¿ã°ã§çµãè¾¼ã¿:</label>
          <select
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 min-h-[44px] bg-white focus:outline-none focus:ring-2 focus:ring-green-500 flex-1 sm:flex-none"
            value={selectedTagId}
            onChange={(e) => handleTagFilter(e.target.value)}
          >
            <option value="">ãã¹ã¦</option>
            {allTags.map((tag) => (
              <option key={tag.id} value={tag.id}>{tag.name}</option>
            ))}
          </select>
        </div>
        <span className="text-sm text-gray-500">
          {loading ? 'èª­ã¿è¾¼ã¿ä¸­...' : `${total.toLocaleString('ja-JP')} ä»¶`}
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="px-4 py-4 border-b border-gray-100 flex items-center gap-4 animate-pulse">
              <div className="w-9 h-9 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-32" />
                <div className="h-2 bg-gray-100 rounded w-20" />
              </div>
              <div className="h-5 bg-gray-100 rounded-full w-16" />
              <div className="h-5 bg-gray-100 rounded-full w-12" />
              <div className="h-3 bg-gray-100 rounded w-20" />
            </div>
          ))}
        </div>
      ) : (
        <FriendTable
          friends={friends}
          allTags={allTags}
          onRefresh={loadFriends}
        />
      )}

      {/* Pagination */}
      {!loading && total > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mt-4">
          <p className="text-sm text-gray-500">
            {((page - 1) * PAGE_SIZE) + 1}ã{Math.min(page * PAGE_SIZE, total)} ä»¶ / å¨{total.toLocaleString('ja-JP')}ä»¶
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-2 min-h-[44px] text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              åã¸
            </button>
            <span className="text-sm text-gray-600 px-1">{page} ãã¼ã¸</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasNextPage}
              className="px-3 py-2 min-h-[44px] text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              æ¬¡ã¸
            </button>
          </div>
        </div>
      )}

      <CcPromptButton prompts={ccPrompts} />
    </div>
  )
}
