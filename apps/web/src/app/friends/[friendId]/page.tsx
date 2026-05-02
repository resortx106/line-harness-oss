import FriendDetail from './client'

// Required for Next.js static export with dynamic routes
export function generateStaticParams() {
  return []
}

type Params = { friendId: string }

export default async function FriendDetailPage({ params }: { params: Promise<Params> }) {
  const { friendId } = await params
  return <FriendDetail friendId={friendId} />
}
