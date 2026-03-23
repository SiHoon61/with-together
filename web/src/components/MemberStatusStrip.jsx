import { getAvatarAppearance } from '../lib/avatar'

export default function MemberStatusStrip({
  members,
  currentMemberId,
  activeQuestCount,
  todayCompletions,
  memberStatuses,
  selectedMemberId,
  onSelectMember,
}) {
  const orderedMembers = [
    ...members.filter((member) => member.id === currentMemberId),
    ...members.filter((member) => member.id !== currentMemberId),
  ]

  return (
    <div className="member-strip">
      {orderedMembers.map((member) => {
        const isMe = member.id === currentMemberId
        const memberStatus = memberStatuses?.find((status) => status.memberId === member.id)
        const todayDone = memberStatus?.completedQuestCount
          ?? (todayCompletions ?? []).filter((completion) => completion.memberId === member.id).length
        const totalCount = memberStatus?.totalActiveQuestCount ?? activeQuestCount
        const progress = totalCount > 0
          ? Math.min(100, Math.round((todayDone / totalCount) * 100))
          : 0
        const { bg, fg, text } = getAvatarAppearance(member.nickname, member.nickname)

        return (
          <button
            key={member.id}
            type="button"
            className={`member-chip ${selectedMemberId === member.id ? 'active' : ''}`}
            onClick={() => onSelectMember?.(member)}
          >
            <div
              className={`member-avatar-progress ${isMe ? 'me' : ''}`}
              style={{ '--progress-angle': `${progress * 3.6}deg` }}
            >
              <div
                className={`member-avatar ${isMe ? 'me' : ''}`}
                style={{ background: bg, color: fg }}
              >
                {text}
              </div>
            </div>
            <div className="member-chip-name">{isMe ? '나' : member.nickname}</div>
            <div className="member-chip-rate">{todayDone}/{totalCount}</div>
          </button>
        )
      })}
    </div>
  )
}
