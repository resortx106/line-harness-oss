import FriendDetail from './client'

export function generateStaticParams() {
  return []
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function FriendDetailPage(props: any) {
  const friendId = props.params?.friendId ?? ''
  return <FriendDetail friendId={friendId} />
}
