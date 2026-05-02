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

  return (
    <div>
      <Header
        title="友だち管理"
        description={`合計 ${total.toLocaleString()}件 / 表示 ${friends.length.toLocaleString()}件`}
      />

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
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
          friends={friends}
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
