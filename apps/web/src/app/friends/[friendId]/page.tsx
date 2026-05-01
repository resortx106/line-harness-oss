'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { fetchApi } from '@/lib/api'

interface Tag {
  id: string
  name: string
  color: string
}

interface Friend {
  id: string
  displayName: string
  pictureUrl: string | null
  statusMessage: string | null
  isFollowing: boolean
  refCode: string | null
  tags: Tag[]
  metadata: Record<string, string>
  createdAt: string
}

const TAG_COLORS = ['#06C755','#3B82F6','#8B5CF6','#F59E0B','#EF4444','#10B981','#EC4899','#14B8A6']

export default function FriendDetailPage() {
  const params = useParams()
  const friendId = params.friendId as string

  const [friend, setFriend] = useState<Friend | null>(null)
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newTagName, setNewTagName] = useState('')
  const [addingTag, setAddingTag] = useState(false)
  const [showTagPicker, setShowTagPicker] = useState(false)
  const [noteKey, setNoteKey] = useState('')
  const [noteValue, setNoteValue] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  const loadFriend = useCallback(async () => {
    try {
      const data = await fetchApi<{ success: boolean; data: Friend }>(`/api/friends/${friendId}`)
      if (data.success) setFriend(data.data)
    } catch {
      setError('友だちの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }, [friendId])

  const loadTags = useCallback(async () => {
    try {
      const data = await fetchApi<{ success: boolean; data: Tag[] }>('/api/tags')
      if (data.success) setAllTags(data.data)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    loadFriend()
    loadTags()
  }, [loadFriend, loadTags])

  const addExistingTag = async (tag: Tag) => {
    if (!friend) return
    if (friend.tags.some(t => t.id === tag.id)) return
    setAddingTag(true)
    try {
      await fetchApi<unknown>(`/api/friends/${friendId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagId: tag.id }),
      })
      await loadFriend()
    } catch { alert('タグの追加に失敗しました') }
    finally { setAddingTag(false); setShowTagPicker(false) }
  }

  const createAndAddTag = async () => {
    if (!newTagName.trim()) return
    setAddingTag(true)
    try {
      const color = TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]
      const created = await fetchApi<{ success: boolean; data: Tag }>('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName.trim(), color }),
      })
      if (created.success) {
        await fetchApi<unknown>(`/api/friends/${friendId}/tags`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tagId: created.data.id }),
        })
        setNewTagName('')
        await loadFriend()
        await loadTags()
      }
    } catch { alert('タグの作成に失敗しました') }
    finally { setAddingTag(false) }
  }

  const removeTag = async (tagId: string) => {
    try {
      await fetchApi<unknown>(`/api/friends/${friendId}/tags/${tagId}`, { method: 'DELETE' })
      await loadFriend()
    } catch { alert('タグの削除に失敗しました') }
  }

  const saveNote = async () => {
    if (!noteKey.trim() || !noteValue.trim()) return
    setSavingNote(true)
    try {
      await fetchApi<unknown>(`/api/friends/${friendId}/metadata`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [noteKey.trim()]: noteValue.trim() }),
      })
      setNoteKey('')
      setNoteValue('')
      await loadFriend()
    } catch { alert('メモの保存に失敗しました') }
    finally { setSavingNote(false) }
  }

  const deleteNote = async (key: string) => {
    try {
      const upd: Record<string, string | null> = { [key]: null }
      await fetchApi<unknown>(`/api/friends/${friendId}/metadata`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(upd),
      })
      await loadFriend()
    } catch { alert('メモの削除に失敗しました') }
  }

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-400">読み込み中...</p></div>
  if (error || !friend) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-red-500 mb-4">{error || '友だちが見つかりません'}</p>
        <Link href="/friends" className="text-blue-600 hover:underline">一覧に戻る</Link>
      </div>
    </div>
  )

  const metaEntries = Object.entries(friend.metadata || {}).filter(([, v]) => v !== null)
  const unattachedTags = allTags.filter(t => !friend.tags.some(ft => ft.id === t.id))

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/friends" className="text-sm text-gray-500 hover:text-gray-700">← 友だち一覧</Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
          <div className="flex items-center gap-4">
            {friend.pictureUrl ? (
              <img src={friend.pictureUrl} alt={friend.displayName} className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-2xl">👤</div>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">{friend.displayName}</h1>
              {friend.statusMessage && <p className="text-sm text-gray-500 mt-0.5">{friend.statusMessage}</p>}
              <div className="flex items-center gap-3 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${friend.isFollowing ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {friend.isFollowing ? 'フォロー中' : 'ブロック済み'}
                </span>
                {friend.refCode && (
                  <span className="text-xs text-gray-400">ref: <span className="font-mono text-gray-600">{friend.refCode}</span></span>
                )}
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">登録日: {new Date(friend.createdAt).toLocaleDateString('ja-JP')}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">タグ</h2>
          <div className="flex flex-wrap gap-2 mb-3">
            {friend.tags.length === 0 && <p className="text-sm text-gray-400">タグなし</p>}
            {friend.tags.map(tag => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: tag.color || '#06C755' }}
              >
                {tag.name}
                <button
                  onClick={() => removeTag(tag.id)}
                  className="ml-1 hover:opacity-70 leading-none"
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          {unattachedTags.length > 0 && (
            <div className="mb-3">
              <button
                onClick={() => setShowTagPicker(!showTagPicker)}
                className="text-xs text-blue-600 hover:text-blue-800 border border-blue-200 px-3 py-1 rounded-full"
              >
                + 既存タグを追加
              </button>
              {showTagPicker && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {unattachedTags.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => addExistingTag(tag)}
                      disabled={addingTag}
                      className="px-3 py-1 rounded-full text-sm font-medium text-white disabled:opacity-50"
                      style={{ backgroundColor: tag.color || '#06C755' }}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createAndAddTag()}
              placeholder="新しいタグ名"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <button
              onClick={createAndAddTag}
              disabled={addingTag || !newTagName.trim()}
              className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
            >
              {addingTag ? '...' : '作成&追加'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">メモ（カスタム情報）</h2>
          {metaEntries.length > 0 && (
            <div className="space-y-2 mb-4">
              {metaEntries.map(([key, val]) => (
                <div key={key} className="flex items-start justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <div>
                    <span className="text-xs text-gray-500 font-mono">{key}</span>
                    <p className="text-sm text-gray-800">{String(val)}</p>
                  </div>
                  <button
                    onClick={() => deleteNote(key)}
                    className="text-xs text-red-400 hover:text-red-600 ml-3 mt-0.5"
                  >
                    削除
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={noteKey}
              onChange={(e) => setNoteKey(e.target.value)}
              placeholder="項目名"
              className="w-28 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-400"
            />
            <input
              type="text"
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveNote()}
              placeholder="内容"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-400"
            />
            <button
              onClick={saveNote}
              disabled={savingNote || !noteKey.trim() || !noteValue.trim()}
              className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
            >
              {savingNote ? '...' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
