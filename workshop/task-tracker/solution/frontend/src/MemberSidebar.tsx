import type { Member } from './types'

export function MemberSidebar({ members }: { members: Member[] }) {
  return (
    <aside aria-label="Members" style={{ minWidth: 180 }}>
      <h2>Members</h2>
      <ul>
        {members.map((m) => (
          <li key={m.id}>{`${m.name} (${m.openTaskCount}/${m.openTaskLimit} open)`}</li>
        ))}
      </ul>
    </aside>
  )
}