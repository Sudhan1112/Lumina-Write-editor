import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export type PresenceUser = {
  id: string
  name?: string
  fullName?: string | null
  email?: string | null
  avatarUrl?: string | null
  color?: string
}

function displayName(user: PresenceUser) {
  return user.fullName || user.name || user.email?.split('@')[0] || 'Collaborator'
}

function initials(user: PresenceUser) {
  const base = displayName(user)
  return base.slice(0, 2).toUpperCase()
}

export function PresenceBar({ activeUsers }: { activeUsers: PresenceUser[] }) {
  const uniqueUsers = Array.from(new Map(activeUsers.map((u) => [u.id, u])).values())
  const displayLimit = 5

  const displayed = uniqueUsers.slice(0, displayLimit)
  const overflow = uniqueUsers.length - displayed.length

  return (
    <div className="flex -space-x-2" aria-label="Active collaborators">
      {displayed.map((user, index) => {
        const label = displayName(user)
        const url = user.avatarUrl?.trim()
        return (
          <div
            key={user.id}
            className="relative shrink-0"
            style={{ zIndex: displayed.length - index }}
          >
            <Avatar
              className={cn(
                'h-8 w-8 border-2 border-[#fffaf4] shadow-sm ring-1 ring-[#eadfcd]',
                !url && 'text-white'
              )}
              style={!url ? { backgroundColor: user.color || '#9a5b2b' } : undefined}
              title={label}
            >
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={url}
                  alt=""
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <AvatarFallback className="text-[10px] font-semibold bg-transparent text-white">
                  {initials(user)}
                </AvatarFallback>
              )}
            </Avatar>
          </div>
        )
      })}
      {overflow > 0 && (
        <Avatar
          className="h-8 w-8 border-2 border-[#fffaf4] bg-[#f3ede2] text-[#6b5f52]"
          style={{ zIndex: 0 }}
          title={`${overflow} more`}
        >
          <AvatarFallback className="bg-transparent text-xs font-semibold text-[#6b5f52]">
            +{overflow}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  )
}
