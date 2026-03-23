export function detectInAppBrowser(userAgent = navigator.userAgent) {
  const ua = String(userAgent || "").toLowerCase();

  if (ua.includes("kakaotalk")) {
    return { isInApp: true, provider: "kakao", label: "카카오톡" };
  }

  if (ua.includes("telegram")) {
    return { isInApp: true, provider: "telegram", label: "텔레그램" };
  }

  return { isInApp: false, provider: null, label: null };
}

export function isIOS(userAgent = navigator.userAgent) {
  return /iphone|ipad|ipod/i.test(String(userAgent || ""));
}

export function isAndroid(userAgent = navigator.userAgent) {
  return /android/i.test(String(userAgent || ""));
}

export function getTelegramWebApp() {
  return window.Telegram?.WebApp ?? null;
}

export function canOpenTelegramExternalLink() {
  return typeof getTelegramWebApp()?.openLink === "function";
}

export async function copyText(value) {
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

export async function openInExternalBrowser(targetUrl = window.location.href) {
  const info = detectInAppBrowser();

  if (!info.isInApp) {
    window.location.href = targetUrl;
    return { mode: "browser" };
  }

  if (info.provider === "kakao") {
    window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(targetUrl)}`;
    return { mode: "scheme" };
  }

  if (info.provider === "telegram") {
    const telegramWebApp = getTelegramWebApp();
    if (typeof telegramWebApp?.openLink === "function") {
      telegramWebApp.openLink(
        targetUrl,
        isAndroid() ? { try_browser: "chrome" } : undefined,
      );
      return { mode: "telegram-webapp" };
    }

    if (isAndroid()) {
      await copyText(targetUrl);
      return { mode: "copy" };
    }
  }

  await copyText(targetUrl);
  return { mode: "copy" };
}

export function getInAppBrowserMessage(info = detectInAppBrowser()) {
  if (!info.isInApp) return "";

  if (info.provider === "telegram") {
    return "텔레그램은 일반 인앱브라우저에서 외부 브라우저 강제 전환이 제한될 수 있어요. 링크 복사 후 브라우저 앱에서 여는 걸 권장해요.";
  }

  return `${info.label}에서는 정보가 제대로 저장되지 않을 수 있어요. 브라우저 앱에서 여는 걸 권장해요.`;
}
