'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '@/lib/api'
import type { Tag } from '@line-crm/shared'
import type { FriendWithTags } from '@/lib/api'
import { useAccount } from '@/contexts/account-context'
import Header from '@/components/layout/header'
import FriendTable from '@/components/friends/friend-table'

const PAGE_SIZE = 1000

export default function FriendsPage() {
  const { selectedAccountId } = useAccount()
  const [friends, setFriends] = useState<FriendWithTags[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTagId, setFilterTagId] = useState('')
  // AND/OR multi-tag filter (client-side)
  const [filterTagIds, setFilterTagIds] = useState<string[]>([])
  const [tagFilterMode, setTagFilterMode] = useState<'OR' | 'AND'>('OR')
  const [total, setTotal] = useState(0)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(
    async (search: string, tagId: string) => {
      setLoading(true)
      setError('')
      try {
        const [friendRes, tagRes] = await Promise.all([
          api.friends.list({
            limit: PAGE_SIZE,
            offset: '0',
            accountId: selectedAccountId || undefined,
            search: search || undefined,
            tagId: tagId || undefined,
          }),
          api.tags.list(),
        ])
        if (friendRes.success) {
          setFriends(friendRes.data.items)
          setTotal(friendRes.data.total)
        } else {
          setError('友だち一覧の読み込みに失敗しました。')
        }
        if (tagRes.success) setTags(tagRes.data)
      } catch {
        setError('友だち一覧の読み込みに失敗しました。')
      } finally {
        setLoading(false)
      }
    },
    [selectedAccountId],
  )

  useEffect(() => {
    load(searchQuery, filterTagId)
  }, [load, selectedAccountId])

  const handleSearchChange = (v: string) => {
    setSearchQuery(v)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      load(v, filterTagId)
    }, 400)
  }

  const handleFilterTagChange = (v: string) => {
    setFilterTagId(v)
    load(searchQuery, v)
  }

  const handleRefresh = () => {
    load(searchQuery, filterTagId)
  }

  const toggleFilterTag = (tagId: string) => {
    setFilterTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    )
  }

  // Apply client-side AND/OR filter when filterTagIds is active
  const displayedFriends = filterTagIds.length === 0
    ? friends
    : friends.filter(f => {
        const fTagIds = (f.tags || []).map((t: Tag) => t.id)
        if (tagFilterMode === 'AND') {
          return filterTagIds.every(tid => fTagIds.includes(tid))
        } else {
          return filterTagIds.some(tid => fTagIds.includes(tid))
        }
      })

  return (
    <div>
      <Header
        title="友だち管理"
        description={`合計 ${total.toLocaleString()}件 / 表示 ${displayedFriends.length.toLocaleString()}件`}
      />

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* AND/OR Multi-tag Segment Filter */}
      {!loading && tags.length > 0 && (
        <div className="mb-4 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <span className="text-xs font-semibold text-gray-600">セグメントフィルター</span>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setTagFilterMode('OR')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${tagFilterMode === 'OR' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                OR (いずれか)
              </button>
              <button
                onClick={() => setTagFilterMode('AND')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${tagFilterMode === 'AND' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                AND (すべて)
              </button>
            </div>
            {filterTagIds.length > 0 && (
              <button
                onClick={() => setFilterTagIds([])}
                className="text-xs text-gray-400 hover:text-gray-600 underline"
              >
                クリア
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => {
              const isActive = filterTagIds.includes(tag.id)
              return (
                <button
                  key={tag.id}
                  onClick={() => toggleFilterTag(tag.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    isActive
                      ? 'text-white border-transparent shadow-sm'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                  }`}
                  style={isActive ? { backgroundColor: tag.color || '#06C755', borderColor: tag.color || '#06C755' } : undefined}
                >
                  {tag.name}
                  {isActive && <span className="ml-1 opacity-70">✓</span>}
                </button>
              )
            })}
          </div>
          {filterTagIds.length > 0 && (
            <p className="mt-2 text-xs text-gray-500">
              {filterTagIds.length}個のタグでフィルター中 ({tagFilterMode === 'AND' ? 'すべてのタグを持つ友だち' : 'いずれかのタグを持つ友だち'}): {displayedFriends.length.toLocaleString()}件表示
            </p>
          )}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="px-4 py-3 border-b border-gray-100 flex items-center gap-4 animate-pulse">
              <div className="w-9 h-9 bg-gray-200 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-32" />
                <div className="h-2 bg-gray-100 rounded w-48" />
              </div>
              <div className="flex gap-1">
                <div className="h-5 bg-gray-100 rounded-full w-14" />
              </div>
              <div className="h-3 bg-gray-100 rounded w-20" />
              <div className="h-7 bg-gray-100 rounded-md w-16" />
            </div>
          ))}
        </div>
      ) : (
        <FriendTable
          friends={displayedFriends}
          tags={tags}
          onRefresh={handleRefresh}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          filterTagId={filterTagId}
          onFilterTagChange={handleFilterTagChange}
        />
      )}
    </div>
  )
}
