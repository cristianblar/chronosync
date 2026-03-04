type Json = Record<string, unknown> | Array<unknown> | string | number | boolean | null;

/**
 * API base URL resolution:
 * - NEXT_PUBLIC_API_URL set (e.g. "http://localhost:8000"): direct browser→backend calls
 * - NEXT_PUBLIC_API_URL empty/unset: relative URL "/api" → proxied by Next.js rewrites
 *   (Next.js server makes the actual backend request, avoids CORS & Docker hostname issues)
 */
const EXPLICIT_API_URL = process.env.NEXT_PUBLIC_API_URL;
const BASE_URL = EXPLICIT_API_URL ? `${EXPLICIT_API_URL}/api/v1` : "/api/v1";

let refreshPromise: Promise<void> | null = null;

function getAccessToken() {
  return typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
}

function getRefreshToken() {
  return typeof window !== "undefined" ? localStorage.getItem("refresh_token") : null;
}

function setTokens(accessToken: string, refreshToken: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("access_token", accessToken);
  localStorage.setItem("refresh_token", refreshToken);
  // Keep cookies in sync so middleware always sees fresh tokens
  document.cookie = `access_token=${accessToken}; path=/; max-age=${15 * 60}; samesite=lax`;
  document.cookie = `refresh_token=${refreshToken}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=lax`;
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  document.cookie = "access_token=; path=/; max-age=0";
  document.cookie = "refresh_token=; path=/; max-age=0";
}

async function refreshTokens() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token available");
  const response = await fetch(`${BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!response.ok) throw new Error("Refresh failed");
  const data = (await response.json()) as { access_token: string; refresh_token: string };
  setTokens(data.access_token, data.refresh_token);
}

async function ensureRefresh() {
  if (!refreshPromise) {
    refreshPromise = refreshTokens().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function apiFetch<TResponse = Json>(
  path: string,
  options: RequestInit = {},
  auth = true,
): Promise<TResponse> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (auth) {
    const token = getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const request = async () =>
    fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
    });

  let response = await request();
  if (response.status === 401 && auth) {
    try {
      await ensureRefresh();
      const newToken = getAccessToken();
      if (newToken) headers.set("Authorization", `Bearer ${newToken}`);
      response = await request();
    } catch {
      clearTokens();
      if (typeof window !== "undefined") {
        window.location.href = "/login?expired=1";
      }
      throw new Error("Session expired");
    }
  }

  if (!response.ok) {
    let message = "Unexpected error";
    try {
      const body = (await response.json()) as { detail?: string | { msg?: string }[] };
      if (typeof body.detail === "string") message = body.detail;
      else if (Array.isArray(body.detail)) message = body.detail.map((d) => d.msg).join(", ");
    } catch {
      message = response.statusText;
    }
    throw new Error(message);
  }

  if (response.status === 204) return undefined as TResponse;
  return (await response.json()) as TResponse;
}
