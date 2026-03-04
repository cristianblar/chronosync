declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: { init: (config: unknown) => Promise<void> }) => void>;
    __chronosync_onesignal_loaded__?: boolean;
  }
}

function loadOneSignalScript() {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[data-onesignal="true"]');
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
    script.async = true;
    script.defer = true;
    script.dataset.onesignal = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("No se pudo cargar OneSignal SDK."));
    document.head.appendChild(script);
  });
}

export async function initOneSignal() {
  if (typeof window === "undefined") return;
  if (window.__chronosync_onesignal_loaded__) return;
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  if (!appId) return;
  await loadOneSignalScript();
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async (OneSignal) => {
    await OneSignal.init({
      appId,
      allowLocalhostAsSecureOrigin: true,
      notifyButton: { enable: false },
    });
  });
  window.__chronosync_onesignal_loaded__ = true;
}
