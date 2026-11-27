import type { RealtimeMsg } from "./realtime";
import type { Device } from "./types";

/** Applies a live pin/status message to a device object (returns the same object if unrelated). */
export function applyRealtime(d: Device, m: RealtimeMsg): Device {
  if (m.type === "pin" && m.deviceId === d.id) {
    return {
      ...d,
      ...(m.source === "device" ? { online: true, lastSeen: m.at } : {}),
      datastreams: d.datastreams.map((ds) => (ds.pin === m.pin ? { ...ds, value: m.value, updatedAt: m.at } : ds)),
    };
  }
  if (m.type === "status" && m.deviceId === d.id) {
    return { ...d, online: m.online, connected: m.connected, lastSeen: m.lastSeen ?? d.lastSeen };
  }
  return d;
}

export function formatValue(v: unknown, unit = ""): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number") return `${Number.isInteger(v) ? v : v.toFixed(2).replace(/\.?0+$/, "")}${unit ? ` ${unit}` : ""}`;
  return String(v);
}
