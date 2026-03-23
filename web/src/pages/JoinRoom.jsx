import { useState } from "react";
import { useInviteSummary, useJoinRoom } from "../hooks/useInvite";
import { useAuth } from "../context/AuthContext";
import { getAvatarAppearance } from "../lib/avatar";

const DEV_INVITE_TOKEN = import.meta.env.VITE_DEV_INVITE_TOKEN ?? "demo_token";

export default function JoinRoom({
  inviteToken: routeInviteToken,
  onNavigate,
}) {
  const inviteToken = routeInviteToken ?? DEV_INVITE_TOKEN;
  const {
    data,
    loading: summaryLoading,
    error: summaryError,
  } = useInviteSummary(inviteToken);
  const { join, loading: joinLoading, error: joinError } = useJoinRoom();
  const { login } = useAuth();

  const [nickname, setNickname] = useState("");
  const nicknamePreview = getAvatarAppearance(nickname, nickname);

  function handleJoin() {
    if (!nickname.trim()) return;
    join(inviteToken, nickname.trim(), (data) => {
      login({ session: data.session, room: data.room, member: data.member });
      onNavigate("dashboard", { roomId: data.room.id });
    });
  }

  return (
    <div className="onboard-wrap">
      <div className="badge-dark">초대받았어요</div>
      <div className="onboard-title">
        방에 합류하기 전에
        <br />
        잠깐 확인해 주세요
      </div>
      <div className="onboard-sub">
        회원가입 없이 별명만으로 바로 참여할 수 있어요.
      </div>

      {summaryLoading && (
        <div
          className="preview-card"
          style={{
            minHeight: 80,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div className="spinner spinner-sm" />
        </div>
      )}
      {summaryError && (
        <div className="preview-card">
          <div className="preview-room-name" style={{ color: "#F88" }}>
            초대 링크를 찾을 수 없어요
          </div>
        </div>
      )}
      {data && (
        <div className="preview-card">
          <div className="preview-room-name">{data.room.name}</div>
          <div className="preview-goal">{data.room.finalGoal}</div>
          <div className="preview-meta">
            목표 마감일 · {data.room.finalGoalDate}
          </div>
          <div className="preview-quest-list">
            {data.recurringQuests
              .filter((quest) => quest.isActive)
              .map((quest) => (
                <div key={quest.id} className="preview-quest-item">
                  <div className="preview-quest-dot" />
                  {quest.title}
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="input-group">
        <div className="input-lbl">방에서 사용할 별명</div>
        <input
          className="text-input"
          type="text"
          placeholder="예: 민지, 운동왕준호..."
          maxLength={10}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
        />
        <div className="nickname-preview-card">
          <div
            className="nickname-preview-avatar"
            style={{
              background: nicknamePreview.bg,
              color: nicknamePreview.fg,
            }}
          >
            {nicknamePreview.text}
          </div>
          <div className="nickname-preview-text">
            <div className="nickname-preview-title">이렇게 보여져요</div>
            <div className="nickname-preview-name">
              {nickname.trim() || "별명 미리보기"}
            </div>
          </div>
        </div>
      </div>
      {joinError && (
        <div className="error-msg">
          {joinError.code === "nickname_taken"
            ? "이미 사용 중인 별명이에요. 다른 별명을 입력해 주세요."
            : joinError.message}
        </div>
      )}
      <button
        className="btn-primary"
        onClick={handleJoin}
        disabled={joinLoading || !nickname.trim()}
      >
        {joinLoading ? "참여 중..." : "이 방에 참여하기"}
      </button>
    </div>
  );
}
