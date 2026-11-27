"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, timeAgo } from "@/lib/client/api";
import { useRealtime } from "@/lib/client/realtime";
import type { AppNotification } from "@/lib/client/types";
import { Card, Empty, ErrorText, Spinner } from "@/components/ui";

export default function NotificationsPage() {
  const [list, setList] = useState<AppNotification[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ notifications: AppNotification[] }>("/api/notifications")
      .then((r) => {
        setList(r.notifications);
        return api("/api/notifications/read", { method: "POST" });
      })
      .catch((e) => setError(e.message));
  }, []);

  useRealtime([], (m) => {
    if (m.type === "notification") setList((l) => [{ ...m, read: false }, ...(l ?? [])]);
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="text-sm text-muted">Alerts from your automations and sharing activity (kept for 30 days).</p>
      </div>
      <ErrorText error={error} />
      {!list && !error && <Spinner />}
      {list?.length === 0 && <Empty title="No notifications yet">Create an automation with a “Send a notification” action.</Empty>}
      {list && list.length > 0 && (
        <Card>
          {list.map((n, i) => (
            <Link
              key={n.id ?? `${n.createdAt}-${i}`}
              href={n.deviceId ? `/devices/${n.deviceId}` : "#"}
              className="flex items-start gap-3 border-b border-border px-4 py-3 last:border-0 hover:bg-background"
            >
              <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-accent"}`} />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{n.title}</p>
                <p className="text-sm text-muted">{n.message}</p>
              </div>
              <time className="shrink-0 text-xs text-muted" dateTime={n.createdAt}>
                {timeAgo(n.createdAt)}
              </time>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
