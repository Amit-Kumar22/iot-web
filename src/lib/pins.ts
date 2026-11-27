import type { DatastreamT } from "./models";
import { ApiError } from "./errors";

export const ONLINE_WINDOW_MS = 60_000; // HTTP-only devices count as online for 60s after last contact
const PIN_RE = /^V(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;

export function isPin(pin: unknown): pin is string {
  return typeof pin === "string" && PIN_RE.test(pin);
}

export function normalizePin(pin: string): string {
  const p = pin.trim().toUpperCase();
  if (!isPin(p)) throw new ApiError(400, `Invalid pin "${pin}" (use V0 – V255)`);
  return p;
}

/** Converts an incoming raw value to what we store, based on the datastream kind. */
export function coerceValue(ds: Pick<DatastreamT, "kind" | "min" | "max">, raw: unknown): number | string {
  const str = typeof raw === "string" ? raw.trim() : raw;
  if (ds.kind === "switch") {
    if (str === true || str === 1 || str === "1" || str === "true" || str === "on") return 1;
    if (str === false || str === 0 || str === "0" || str === "false" || str === "off") return 0;
    throw new ApiError(400, "Switch value must be 0 or 1");
  }
  const n = typeof str === "number" ? str : typeof str === "string" && str !== "" ? Number(str) : NaN;
  if (ds.kind === "slider") {
    if (!Number.isFinite(n)) throw new ApiError(400, "Slider value must be a number");
    return Math.min(ds.max ?? 100, Math.max(ds.min ?? 0, n));
  }
  // "value": numbers stay numbers (so they get history), anything else is stored as text
  if (Number.isFinite(n)) return n;
  if (typeof str === "string") return str.slice(0, 256);
  throw new ApiError(400, "Unsupported value");
}

export function isOnline(
  d: { connected?: boolean | null; lastSeen?: Date | null; disconnectedAt?: Date | null },
  now = Date.now(),
): boolean {
  if (d.connected) return true;
  if (!d.lastSeen) return false;
  const seen = new Date(d.lastSeen).getTime();
  // A socket device that just disconnected is offline, unless it has made HTTP contact since.
  if (d.disconnectedAt && seen <= new Date(d.disconnectedAt).getTime()) return false;
  return now - seen < ONLINE_WINDOW_MS;
}
