"use client";

import { useEffect, useState } from "react";
import type { Device } from "./types";

/**
 * HTTP-only devices have no socket to tell us they went away, so re-check
 * the "seen within the online window" rule on a timer.
 */
export function useLiveOnline(d: Pick<Device, "online" | "connected" | "lastSeen" | "onlineWindowMs">) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);
  if (d.connected) return true;
  if (!d.online || !d.lastSeen) return false;
  // A fresh lastSeen can be slightly ahead of `now` (set up to 5s ago) — that still counts as online.
  return now - new Date(d.lastSeen).getTime() < d.onlineWindowMs;
}
