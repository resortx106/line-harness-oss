'use client'
import { useParams } from 'next/navigation'
import FriendDetail from './client'

export function generateStaticParams() {
  return []
}

export default function FriendDetailPage() {
  const { friendId } = useParams<{ friendId: string }>()
  return <FriendDetail friendId={friendId} />
}
