import { useEffect } from "react";
import GlobalTopBar from "../components/GlobalTopBar";
import LocalSegmentTabs from "../components/LocalSegmentTabs";
import { useAuth } from "../context/AuthContext";
import { useDashboard } from "../hooks/useDashboard";
import { useMonthlyCompletions } from "../hooks/useMonthlyCompletions";
import { getAvatarAppearance } from "../lib/avatar";

function statusLabel(memberStatus, totalQuests) {
  if (!memberStatus || totalQuests <= 0) return "📅 미션 없음";
  if (memberStatus.status === "perfect") return "✨ 오늘 목표 완벽 달성";
  if (memberStatus.status === "goal_met") return "✅ 오늘 목표 달성";
  return "📅 오늘 목표 미달성";
}

function MemberRow({
  member,
  roomId,
  isMe,
  isLeader,
  totalQuests,
  cutoffPercent,
  memberStatus,
}) {
  const now = new Date();
  const { achieveRate } = useMonthlyCompletions(
    roomId,
    now.getFullYear(),
    now.getMonth() + 1,
    member.id,
    totalQuests,
    cutoffPercent,
  );
  const { bg, fg, text } = getAvatarAppearance(
    member.nickname,
    member.nickname,
  );
  const streakLabel = statusLabel(memberStatus, totalQuests);
  const todayRate = memberStatus
    ? `${memberStatus.completedQuestCount}/${memberStatus.totalActiveQuestCount}`
    : `${0}/${totalQuests}`;

  return (
    <div className="member-row">
      <div className="member-row-avatar" style={{ background: bg, color: fg }}>
        {text}
      </div>
      <div className="member-row-info">
        <div className="member-row-name">
          {member.nickname}
          {isMe ? " (나)" : ""}
          {isLeader && <span className="leader-badge">리더</span>}
          {isMe && !isLeader && <span className="me-badge">나</span>}
        </div>
        <div className="member-row-streak">{streakLabel}</div>
      </div>
      <div className="member-row-rate">
        <div>{achieveRate}%</div>
        <div className="member-row-rate-sub">{todayRate}</div>
      </div>
    </div>
  );
}

export default function Members({ roomId, onNavigate }) {
  const { getRoomAccess, markRoomVisited } = useAuth();
  const roomAccess = getRoomAccess(roomId);
  const { data, loading } = useDashboard(roomId);

  useEffect(() => {
    if (roomId && roomAccess) {
      markRoomVisited(roomId);
    }
  }, [roomId, roomAccess, markRoomVisited]);

  if (!roomAccess) {
    return (
      <div className="center-msg">
        <div className="center-msg-text">이 방에 접근할 수 없어요</div>
        <button
          className="btn-primary"
          style={{ marginTop: 16 }}
          onClick={() => onNavigate("home")}
        >
          메인으로 이동
        </button>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="center-msg">
        <div className="spinner" />
      </div>
    );
  }

  const { room, members, currentMember, recurringQuests } = data;
  const totalQuests = recurringQuests.filter((quest) => quest.isActive).length;
  const cutoffPercent = room.dailyGoalCutoffPercent ?? 50;
  const todayMemberStatuses = data.todayMemberStatuses ?? [];

  const todayAvg =
    members.length > 0
      ? Math.round(
          members.reduce((sum, member) => {
            const memberStatus = todayMemberStatuses.find(
              (status) => status.memberId === member.id,
            );
            if (!memberStatus || memberStatus.totalActiveQuestCount <= 0) {
              return sum;
            }
            return (
              sum +
              (memberStatus.completedQuestCount /
                memberStatus.totalActiveQuestCount) *
                100
            );
          }, 0) / members.length,
        )
      : 0;

  return (
    <div className="page-shell">
      <GlobalTopBar
        roomName={room.name}
        onHome={() => onNavigate("home")}
        onAccess={() => onNavigate("access", { roomId })}
      />
      <LocalSegmentTabs
        active=""
        onChange={(id) => {
          if (id === "quest") onNavigate("dashboard", { roomId });
          if (id === "history") onNavigate("history", { roomId });
        }}
      />
      <div className="scroll-area room-content-scroll">
        <div className="member-stat-header">
          <div className="msh-sub">오늘 멤버 평균 달성률</div>
          <div className="msh-value-row">
            <div className="msh-value">{todayAvg}%</div>
            <div className="msh-value-sub">전체 평균</div>
          </div>
        </div>

        <div className="section-label">멤버 {members.length}명</div>

        {members.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            roomId={roomId}
            isMe={member.id === currentMember.id}
            isLeader={member.id === room.leaderMemberId}
            totalQuests={totalQuests}
            cutoffPercent={cutoffPercent}
            memberStatus={
              todayMemberStatuses.find(
                (status) => status.memberId === member.id,
              ) ?? null
            }
          />
        ))}

        <div style={{ height: 4 }} />
      </div>
    </div>
  );
}
