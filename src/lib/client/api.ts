"use client";

/**
 * Backend base URL, e.g. "http://69.62.75.151:5010".
 * Empty = same server that serves this website.
 */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

export function wsUrl(path: string): string {
  const base = API_URL || `${location.protocol}//${location.host}`;
  return base.replace(/^http/, "ws") + path;
}

/* ---------------------------------------------------- session token */

const TOKEN_KEY = "iot_token";
export const getToken = () => (typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY));
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** fetch wrapper for the JSON API. Sends `Authorization: Bearer`, redirects to /login on 401. */
export async function api<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (opts.body) headers["content-type"] = "application/json";
  if (token) headers.authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method: opts.method ?? (opts.body ? "POST" : "GET"),
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new HttpError(0, `Cannot reach the server${API_URL ? ` at ${API_URL}` : ""}`);
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && !path.startsWith("/api/auth/login") && !path.startsWith("/api/auth/signup")) {
    clearToken();
    // Plain module (no router here); a full reload also clears all in-memory state after logout.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `/login?next=${encodeURIComponent(location.pathname)}`;
  }
  if (!res.ok) throw new HttpError(res.status, (data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data as T;
}

export function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
