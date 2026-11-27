"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { api, clearToken, getToken } from "@/lib/client/api";
import { useRealtime } from "@/lib/client/realtime";
import type { AppNotification, User } from "@/lib/client/types";
import { Bell, BellRing, LayoutGrid, LogOut, Menu, Settings2, X } from "lucide-react";
import { Logo } from "./Logo";
import { Year } from "./ui";

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

  const [menuOpen, setMenuOpen] = useState(false);
  // Close the mobile menu whenever the route changes.
  const [menuPath, setMenuPath] = useState(pathname);
  if (pathname !== menuPath) {
    setMenuPath(pathname);
    setMenuOpen(false);
  }

  const links = [
    { href: "/dashboard", label: "Devices", icon: LayoutGrid, match: (p: string) => p === "/dashboard" || p.startsWith("/devices") },
    { href: "/notifications", label: "Notifications", icon: Bell, match: (p: string) => p.startsWith("/notifications") },
    ...(user?.isAdmin
      ? [{ href: "/admin/app-config", label: "App config", icon: Settings2, match: (p: string) => p.startsWith("/admin") }]
      : []),
  ];
  const initials = (user?.name || user?.email || "?")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur-md">
        <div className="h-0.5 bg-gradient-to-r from-accent via-accent-hover to-accent" />
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
          <Logo href="/dashboard" height={26} />

          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {links
              .filter((l) => l.href !== "/notifications")
              .map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`relative inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    l.match(pathname) ? "bg-accent-soft text-accent-text" : "text-muted hover:bg-background hover:text-foreground"
                  }`}
                >
                  <l.icon className="size-4" aria-hidden />
                  {l.label}
                </Link>
              ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
            <Link
              href="/notifications"
              className="relative grid size-10 place-items-center rounded-xl text-muted transition hover:bg-background hover:text-foreground"
              aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
            >
              <Bell className="size-5" aria-hidden />
              {unread > 0 && (
                <span className="absolute right-1 top-1 grid min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[10px] font-bold leading-[18px] text-white ring-2 ring-card">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>

            <div className="hidden items-center gap-3 border-l border-border pl-3 md:flex">
              <span className="grid size-9 place-items-center rounded-full bg-charcoal text-xs font-semibold text-white" aria-hidden>
                {initials}
              </span>
              <div className="hidden leading-tight lg:block">
                <p className="max-w-40 truncate text-sm font-semibold text-ink">{user?.name}</p>
                <p className="max-w-40 truncate text-xs text-muted">{user?.isAdmin ? "Administrator" : user?.email}</p>
              </div>
              <button
                onClick={logout}
                className="grid size-9 place-items-center rounded-lg text-muted transition hover:bg-background hover:text-danger cursor-pointer"
                aria-label="Log out"
                title="Log out"
              >
                <LogOut className="size-4" aria-hidden />
              </button>
            </div>

            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="grid size-10 place-items-center rounded-xl text-ink transition hover:bg-background md:hidden cursor-pointer"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-border bg-card px-4 pb-4 pt-2 md:hidden">
            <div className="mb-2 flex items-center gap-3 rounded-xl bg-background p-3">
              <span className="grid size-10 place-items-center rounded-full bg-charcoal text-sm font-semibold text-white" aria-hidden>
                {initials}
              </span>
              <div className="min-w-0 leading-tight">
                <p className="truncate text-sm font-semibold text-ink">{user?.name}</p>
                <p className="truncate text-xs text-muted">{user?.email}</p>
              </div>
            </div>
            <nav className="flex flex-col" aria-label="Mobile">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium ${
                    l.match(pathname) ? "bg-accent-soft text-accent-text" : "text-ink hover:bg-background"
                  }`}
                >
                  <l.icon className="size-5" aria-hidden />
                  {l.label}
                  {l.href === "/notifications" && unread > 0 && (
                    <span className="ml-auto rounded-full bg-accent px-2 text-xs font-bold leading-5 text-white">{unread}</span>
                  )}
                </Link>
              ))}
              <button
                onClick={logout}
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium text-danger hover:bg-danger/5 cursor-pointer"
              >
                <LogOut className="size-5" aria-hidden />
                Log out
              </button>
            </nav>
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{user ? children : null}</main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-muted sm:flex-row sm:px-6">
          <p>© <Year /> HiProTech. All rights reserved.</p>
          <p>IoT Platform · ESP32 · ESP8266 · Arduino</p>
        </div>
      </footer>

      <div
        className="fixed inset-x-4 bottom-4 z-40 flex flex-col gap-2 sm:inset-x-auto sm:right-6 sm:w-96"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <Link
            key={t.key}
            href={t.deviceId ? `/devices/${t.deviceId}` : "/notifications"}
            className="flex gap-3 rounded-2xl border border-border border-l-4 border-l-accent bg-card p-4 shadow-lift"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
              <BellRing className="size-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink">{t.title}</span>
              <span className="block text-sm text-muted">{t.message}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
