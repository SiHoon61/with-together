import { useMemo, useState } from "react";
import { createRoom } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { getAvatarAppearance } from "../lib/avatar";

function getDefaultTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Seoul";
  } catch {
    return "Asia/Seoul";
  }
}

function getDefaultGoalDate() {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().slice(0, 10);
}

function buildInviteUrl(inviteToken) {
  return new URL(`/join/${inviteToken}`, window.location.origin).toString();
}

export default function CreateRoom({ onNavigate }) {
  const { login } = useAuth();
  const timezone = useMemo(() => getDefaultTimezone(), []);

  const [roomName, setRoomName] = useState("");
  const [leaderNickname, setLeaderNickname] = useState("");
  const [finalGoal, setFinalGoal] = useState("");
  const [finalGoalDate, setFinalGoalDate] = useState(getDefaultGoalDate);
  const [visibility, setVisibility] = useState("public");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);

  const inviteUrl = created?.room?.inviteToken
    ? buildInviteUrl(created.room.inviteToken)
    : null;
  const leaderPreview = getAvatarAppearance(leaderNickname, leaderNickname);

  async function handleSubmit() {
    if (!roomName.trim() || !leaderNickname.trim() || !finalGoal.trim()) return;

    try {
      setLoading(true);
      setError(null);

      const data = await createRoom({
        roomName: roomName.trim(),
        leaderNickname: leaderNickname.trim(),
        finalGoal: finalGoal.trim(),
        finalGoalDate,
        visibility,
        timezone,
      });

      login({ session: data.session, room: data.room, member: data.member });
      setCreated(data);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyInvite() {
    if (!inviteUrl) return;
    try {
      await copyText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  async function copyText(value) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }

  if (created) {
    return (
      <div className="onboard-wrap">
        <div className="badge-dark">방 생성 완료</div>
        <div className="onboard-title">
          방이 만들어졌어요.
          <br />
          이제 멤버를 초대해 보세요
        </div>
        <div className="onboard-sub">리더는 바로 방에 입장된 상태예요.</div>

        <div className="preview-card">
          <div className="preview-room-name">{created.room.name}</div>
          <div className="preview-goal">{created.room.finalGoal}</div>
          <div className="create-meta">
            <div className="create-meta-label">목표 마감일</div>
            <div className="create-meta-value">
              {created.room.finalGoalDate}
            </div>
          </div>
          <div className="create-meta">
            <div className="create-meta-label">방 공개 여부</div>
            <div className="create-meta-value">
              {created.room.visibility === "private" ? "비밀방" : "공개방"}
            </div>
          </div>
          <div className="create-meta">
            <div className="create-meta-label">초대 링크</div>
            <div className="create-meta-value break-all">{inviteUrl}</div>
          </div>
        </div>

        <button className="btn-primary" onClick={handleCopyInvite}>
          {copied ? "초대 링크 복사됨" : "초대 링크 복사하기"}
        </button>

        <div
          className="link-text"
          onClick={() => onNavigate("dashboard", { roomId: created.room.id })}
        >
          바로 방으로 이동하기
        </div>
      </div>
    );
  }

  return (
    <div className="onboard-wrap">
      <div className="badge-dark">리더 시작</div>
      <div className="onboard-title">
        같이 갈 방을
        <br />
        먼저 만들어 볼까요?
      </div>
      <div className="onboard-sub">
        방 이름, 리더 별명, 최종 목표만 있으면 바로 시작할 수 있어요.
      </div>

      <div className="input-group">
        <div className="input-lbl">방 이름</div>
        <input
          className="text-input"
          type="text"
          maxLength={40}
          placeholder="예: 100일 운동방"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
        />
      </div>

      <div className="input-group">
        <div className="input-lbl">리더 별명</div>
        <input
          className="text-input"
          type="text"
          maxLength={24}
          placeholder="예: 시훈"
          value={leaderNickname}
          onChange={(e) => setLeaderNickname(e.target.value)}
        />
        <div className="nickname-preview-card">
          <div
            className="nickname-preview-avatar"
            style={{ background: leaderPreview.bg, color: leaderPreview.fg }}
          >
            {leaderPreview.text}
          </div>
          <div className="nickname-preview-text">
            <div className="nickname-preview-title">이렇게 보여져요</div>
            <div className="nickname-preview-name">
              {leaderNickname.trim() || "별명 미리보기"}
            </div>
          </div>
        </div>
      </div>

      <div className="input-group">
        <div className="input-lbl">최종 목표</div>
        <textarea
          className="text-input text-area"
          rows={4}
          maxLength={120}
          placeholder="예: 100일 동안 매일 운동 인증하기"
          value={finalGoal}
          onChange={(e) => setFinalGoal(e.target.value)}
        />
      </div>

      <div className="input-group">
        <div className="input-lbl">최종 목표 날짜</div>
        <input
          className="text-input"
          type="date"
          value={finalGoalDate}
          onChange={(e) => setFinalGoalDate(e.target.value)}
        />
      </div>

      <div className="input-group">
        <div className="input-lbl">방 공개 여부</div>
        <div className="visibility-segment">
          <button
            type="button"
            className={`visibility-segment-btn ${visibility === "public" ? "active" : ""}`}
            onClick={() => setVisibility("public")}
          >
            공개방
          </button>
          <button
            type="button"
            className={`visibility-segment-btn ${visibility === "private" ? "active" : ""}`}
            onClick={() => setVisibility("private")}
          >
            비밀방
          </button>
        </div>
      </div>

      <div className="create-timezone">
        방 기준 시간대: <strong>{timezone}</strong>
      </div>

      {error && <div className="error-msg">{error.message}</div>}

      <button
        className="btn-primary"
        onClick={handleSubmit}
        disabled={
          loading ||
          !roomName.trim() ||
          !leaderNickname.trim() ||
          !finalGoal.trim() ||
          !finalGoalDate
        }
      >
        {loading ? "방 만드는 중..." : "방 만들기"}
      </button>

      <div className="link-text" onClick={() => onNavigate("home")}>
        메인으로 돌아가기
      </div>
    </div>
  );
}
