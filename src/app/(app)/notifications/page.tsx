"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, timeAgo } from "@/lib/client/api";
import { useRealtime } from "@/lib/client/realtime";
import type { AppNotification } from "@/lib/client/types";
import { Card, Empty, ErrorText, PageHeader, Spinner } from "@/components/ui";
import { BellRing } from "lucide-react";

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
      <PageHeader title="Notifications" subtitle="Alerts from your automations and sharing activity (kept for 30 days)." />
      <ErrorText error={error} />
      {!list && !error && (
        <div className="flex justify-center py-16 text-muted">
          <Spinner />
        </div>
      )}
      {list?.length === 0 && <Empty title="No notifications yet">Create an automation with a “Send a notification” action.</Empty>}
      {list && list.length > 0 && (
        <Card className="overflow-hidden">
          {list.map((n, i) => (
            <Link
              key={n.id ?? `${n.createdAt}-${i}`}
              href={n.deviceId ? `/devices/${n.deviceId}` : "#"}
              className={`flex items-start gap-4 border-b border-border px-4 py-4 transition last:border-0 hover:bg-surface sm:px-5 ${
                n.read ? "" : "bg-accent-soft/40"
              }`}
            >
              <span
                className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                  n.read ? "bg-background text-muted" : "bg-accent text-white shadow-sm shadow-accent/30"
                }`}
              >
                <BellRing className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">{n.title}</p>
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
