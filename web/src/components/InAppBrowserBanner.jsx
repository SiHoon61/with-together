import { Copy, ExternalLink, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  canOpenTelegramExternalLink,
  copyText,
  detectInAppBrowser,
  getInAppBrowserMessage,
  isIOS,
  openInExternalBrowser,
} from "../lib/inAppBrowser";

export default function InAppBrowserBanner() {
  const info = useMemo(() => detectInAppBrowser(), []);
  const canDirectOpen =
    info.provider === "kakao" ||
    (info.provider === "telegram" && canOpenTelegramExternalLink());
  const [dismissed, setDismissed] = useState(false);
  const [status, setStatus] = useState("idle");

  if (!info.isInApp || dismissed) {
    return null;
  }

  async function handleOpenExternal() {
    try {
      const result = await openInExternalBrowser(window.location.href);
      if (result.mode === "copy") {
        setStatus("copied");
      }
    } catch {
      setStatus("error");
    }
  }

  async function handleCopy() {
    try {
      await copyText(window.location.href);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  }

  const hint = isIOS()
    ? "iPhone에서는 자동 전환이 제한될 수 있어요. 링크를 복사해 브라우저에서 열어 보세요."
    : "브라우저 앱에서 열면 방 접근 정보가 더 안정적으로 유지돼요.";

  return (
    <div className="inapp-banner">
      <div className="inapp-banner-main">
        <div className="inapp-banner-copy">
          <div className="inapp-banner-title">브라우저 앱에서 열기 권장</div>
          <div className="inapp-banner-desc">
            {getInAppBrowserMessage(info)}
          </div>
          <div className="inapp-banner-hint">
            {status === "copied"
              ? "링크를 복사했어요. Safari나 Chrome에 붙여넣어 열어 주세요."
              : status === "error"
                ? "열기 시도에 실패했어요. 링크 복사 버튼을 사용해 주세요."
                : hint}
          </div>
        </div>

        <button
          className="inapp-banner-close"
          type="button"
          aria-label="안내 닫기"
          onClick={() => setDismissed(true)}
        >
          <X size={16} strokeWidth={2.2} />
        </button>
      </div>

      <div className="inapp-banner-actions">
        <button
          className="inapp-banner-btn primary"
          type="button"
          onClick={handleOpenExternal}
        >
          <ExternalLink size={15} strokeWidth={2.1} />
          {canDirectOpen ? "브라우저에서 열기" : "링크 복사 후 열기"}
        </button>
        <button className="inapp-banner-btn" type="button" onClick={handleCopy}>
          <Copy size={15} strokeWidth={2.1} />
          링크 복사
        </button>
      </div>
    </div>
  );
}
