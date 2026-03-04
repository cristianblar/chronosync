declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
          prompt: () => void;
        };
        oauth2: {
          initTokenClient: (config: Record<string, unknown>) => {
            requestAccessToken: (config?: Record<string, unknown>) => void;
          };
        };
      };
    };
    __chronosync_google_loaded__?: boolean;
  }
}

export async function loadGoogleScript() {
  if (typeof window === "undefined") return;
  if (window.__chronosync_google_loaded__) return;
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[data-google-gsi="true"]');
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleGsi = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("No se pudo cargar Google Identity Services."));
    document.head.appendChild(script);
  });
  window.__chronosync_google_loaded__ = true;
}
