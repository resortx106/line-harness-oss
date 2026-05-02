import FriendDetail from './client'

// Required for Next.js static export with dynamic routes
export function generateStaticParams() {
  return []
}

export default function FriendDetailPage({ params }: { params: { friendId: string } }) {
  return <FriendDetail friendId={params.friendId} />
}
