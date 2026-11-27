"use client";

import { useEffect, useRef } from "react";
import { getToken, wsUrl } from "./api";
import type { AppNotification, PinValue } from "./types";

export type RealtimeMsg =
  | { type: "pin"; deviceId: string; pin: string; value: PinValue; source: string; at: string }
  | { type: "status"; deviceId: string; online: boolean; connected: boolean; lastSeen: string | null }
  | ({ type: "notification" } & AppNotification)
  | { type: "reconnected" };

type Listener = (m: RealtimeMsg) => void;

/** One shared WebSocket per tab (/ws/app), authenticated with the session token. */
class Realtime {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private subs = new Map<string, number>(); // deviceId → refcount
  private ready = false;
  private retry = 0;
  private everConnected = false;
  private timer: ReturnType<typeof setTimeout> | null = null;

  private connect() {
    if (this.ws || typeof window === "undefined") return;
    const token = getToken();
    if (!token) return;
    const ws = new WebSocket(wsUrl("/ws/app"));
    this.ws = ws;
    ws.onopen = () => ws.send(JSON.stringify({ type: "auth", token }));
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.type === "ready") {
        if (this.ready) return;
        this.ready = true;
        this.retry = 0;
        this.sendSubs();
        if (this.everConnected) this.emit({ type: "reconnected" });
        this.everConnected = true;
        return;
      }
      if (msg.type === "pin" || msg.type === "status" || msg.type === "notification") this.emit(msg);
    };
    ws.onclose = () => {
      this.ws = null;
      this.ready = false;
      if (this.listeners.size === 0) return;
      const delay = Math.min(30_000, 1000 * 2 ** this.retry++);
      this.timer = setTimeout(() => this.connect(), delay);
    };
  }

  private emit(m: RealtimeMsg) {
    this.listeners.forEach((l) => l(m));
  }

  private sendSubs() {
    if (this.ready && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "subscribe", deviceIds: [...this.subs.keys()] }));
    }
  }

  listen(l: Listener, deviceIds: string[]) {
    this.listeners.add(l);
    let changed = false;
    for (const id of deviceIds) {
      const n = this.subs.get(id) ?? 0;
      this.subs.set(id, n + 1);
      if (n === 0) changed = true;
    }
    this.connect();
    if (changed) this.sendSubs();

    return () => {
      this.listeners.delete(l);
      for (const id of deviceIds) {
        const n = (this.subs.get(id) ?? 1) - 1;
        if (n <= 0) this.subs.delete(id);
        else this.subs.set(id, n);
      }
      if (this.listeners.size === 0) {
        if (this.timer) clearTimeout(this.timer);
        this.ws?.close();
        this.ws = null;
      } else this.sendSubs();
    };
  }
}

let instance: Realtime | null = null;
const rt = () => (instance ??= new Realtime());

/** Live updates for the given devices (and the user's notifications). */
export function useRealtime(deviceIds: string[], onMessage: Listener) {
  const handler = useRef(onMessage);
  useEffect(() => {
    handler.current = onMessage;
  });
  const key = [...deviceIds].sort().join(",");
  useEffect(() => {
    const ids = key ? key.split(",") : [];
    return rt().listen((m) => handler.current(m), ids);
  }, [key]);
}
