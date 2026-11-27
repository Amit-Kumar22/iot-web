"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { api, clearToken, getToken } from "@/lib/client/api";
import { useRealtime } from "@/lib/client/realtime";
import type { AppNotification, User } from "@/lib/client/types";

export function AppShell({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [unread, setUnread] = useState(0);
  const [toasts, setToasts] = useState<(AppNotification & { key: number })[]>([]);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) {
      router.replace(`/login?next=${encodeURIComponent(location.pathname)}`);
      return;
    }
    api<{ user: User; unreadNotifications: number }>("/api/auth/me")
      .then((r) => {
        setUser(r.user);
        setUnread(r.unreadNotifications);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  // Opening the notifications page marks them read.
  const [prevPath, setPrevPath] = useState(pathname);
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    if (pathname === "/notifications") setUnread(0);
  }

  useRealtime([], (m) => {
    if (m.type !== "notification") return;
    if (pathname !== "/notifications") setUnread((n) => n + 1);
    const key = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { ...m, key }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.key !== key)), 6000);
  });

  function logout() {
    clearToken();
    router.replace("/login");
  }

  const nav = (href: string, label: string) => (
    <Link
      href={href}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
        pathname.startsWith(href) ? "bg-border/70" : "text-muted hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-card/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <span className="grid size-7 place-items-center rounded-lg bg-accent text-xs font-bold text-accent-fg">IoT</span>
            <span className="hidden sm:inline">IoT Platform</span>
          </Link>
          <nav className="flex gap-1">
            {nav("/dashboard", "Devices")}
            {user?.isAdmin && nav("/admin/app-config", "App config")}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/notifications"
              className="relative rounded-md p-2 text-muted hover:text-foreground"
              aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
            >
              <BellIcon />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
            <span className="hidden text-sm text-muted md:inline">{user?.email}</span>
            <button onClick={logout} className="rounded-md px-2 py-1.5 text-sm text-muted hover:text-foreground cursor-pointer">
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{user ? children : null}</main>

      <div className="fixed bottom-4 right-4 z-30 flex w-80 flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <Link
            key={t.key}
            href={t.deviceId ? `/devices/${t.deviceId}` : "/notifications"}
            className="rounded-xl border border-border bg-card p-3 shadow-lg"
          >
            <p className="text-sm font-semibold">{t.title}</p>
            <p className="text-sm text-muted">{t.message}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
