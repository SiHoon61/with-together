import { Settings2 } from "lucide-react";

export default function RoomHeader({
  room,
  todayDate,
  onShare,
  onCopyLink,
  shareState,
  isLeader,
  onOpenSettings,
}) {
  if (!room) return null;
  const today = new Date(todayDate);
  const goalDate = new Date(room.finalGoalDate);
  const daysLeft = Math.ceil((goalDate - today) / 86400000);

  let roomTag = "D-Day";
  if (daysLeft > 0) roomTag = `D-${daysLeft}`;
  if (daysLeft < 0) roomTag = `D+${Math.abs(daysLeft)}`;

  return (
    <div className="room-header">
      <div className="room-header-actions">
        {/* <button
          className="room-share-icon-btn"
          onClick={onShare}
          type="button"
          aria-label="초대 링크 공유"
          title="초대 링크 공유"
        >
          <svg viewBox="0 0 20 20" fill="none">
            <path
              d="M13 6.5a2.5 2.5 0 1 0-2.24-3.6L6.8 5.16a2.5 2.5 0 1 0 0 4.67l3.96 2.26a2.5 2.5 0 1 0 .74-1.3L7.54 8.52a2.51 2.51 0 0 0 0-1.05l3.96-2.27A2.5 2.5 0 0 0 13 6.5Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button> */}
        {/* <button className="room-share-text-btn" onClick={onShare} type="button">
          공유하기
        </button> */}
        <button
          className="room-share-text-btn secondary"
          onClick={onCopyLink}
          type="button"
        >
          {shareState === "copied" ? "복사됨!" : "링크 복사"}
        </button>
      </div>

      <div className="room-tag">{roomTag}</div>
      <div className="room-name">{room.name}</div>
      <div className="room-goal">{room.finalGoal}</div>
      <div className="room-goal-date">목표 마감일 · {room.finalGoalDate}</div>

      {isLeader && (
        <button
          className="room-settings-btn"
          type="button"
          onClick={onOpenSettings}
          aria-label="방 설정 열기"
          title="방 설정"
        >
          <Settings2 size={16} />
        </button>
      )}
    </div>
  );
}
