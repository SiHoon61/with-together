import { useEffect, useMemo, useState } from "react";
import GlobalTopBar from "../components/GlobalTopBar";
import { useAuth } from "../context/AuthContext";
import { encodeAccessBundle } from "../lib/accessTransfer";

function copyText(value) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(value);
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
  return Promise.resolve();
}

export default function AccessTransfer({ roomId, onNavigate }) {
  const {
    accessibleRoomIds,
    exportAccessBundle,
    getRoomAccess,
    markRoomVisited,
  } = useAuth();
  const [copied, setCopied] = useState(false);

  const roomAccess = getRoomAccess(roomId);

  const transferUrl = useMemo(() => {
    const bundle = exportAccessBundle();
    const encoded = encodeAccessBundle(bundle);
    return `${window.location.origin}/access-import#bundle=${encoded}`;
  }, [exportAccessBundle]);

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

  useEffect(() => {
    if (roomId && roomAccess) {
      markRoomVisited(roomId);
    }
  }, [roomId, roomAccess, markRoomVisited]);

  async function handleCopy() {
    try {
      await copyText(transferUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div className="page-shell">
      <GlobalTopBar
        roomName="접근 이전"
        leftMode="back"
        active="access"
        onLeft={() => {
          if (window.history.length > 1) {
            window.history.back();
            return;
          }
          onNavigate("dashboard", { roomId });
        }}
        onHome={() => onNavigate("home")}
        onAccess={() => onNavigate("access", { roomId })}
      />
      <div className="recovery-wrap room-content-scroll">
        <div className="recovery-title">다른 기기에서 이어하기</div>
        <div className="recovery-desc">
          아래 링크를 다른 브라우저나 기기에서 열면
          <br />
          지금 상태 그대로 이어서 사용할 수 있어요.
        </div>

        <button className="btn-primary" onClick={handleCopy}>
          {copied ? "링크 복사됨!" : "링크 복사하기"}
        </button>

        <div className="warning-box">
          <div className="warning-icon">⚠</div>
          <div className="warning-text">
            현재 {accessibleRoomIds.length}개 방 접근 정보가 함께 들어 있어요.
            링크는 비밀번호처럼 취급해 주세요.
          </div>
        </div>
      </div>
    </div>
  );
}
