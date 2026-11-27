import type { HydratedDocument } from "mongoose";
import { writePin, notifyDeviceUsers } from "./core";
import { Device, Schedule, type ScheduleT } from "./models";

export function scheduleJSON(s: HydratedDocument<ScheduleT>) {
  return {
    id: String(s._id),
    deviceId: String(s.device),
    name: s.name,
    pin: s.pin,
    value: s.value,
    time: s.time,
    days: s.days,
    timezone: s.timezone,
    enabled: s.enabled,
    lastRunAt: s.lastRunAt?.toISOString() ?? null,
    lastError: s.lastError,
    nextRunAt: s.enabled ? nextRun(s.time, s.days, s.timezone)?.toISOString() ?? null : null,
  };
}

/* ------------------------------------------------------------- time zones */

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(tz: string) {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
    });
    fmtCache.set(tz, f);
  }
  return f;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Wall-clock parts of `date` in `tz`. */
export function localParts(date: Date, tz: string) {
  const p = Object.fromEntries(fmt(tz).formatToParts(date).map((x) => [x.type, x.value]));
  return {
    y: Number(p.year),
    mo: Number(p.month),
    d: Number(p.day),
    h: Number(p.hour),
    mi: Number(p.minute),
    day: WEEKDAYS.indexOf(p.weekday),
    hhmm: `${p.hour}:${p.minute}`,
    key: `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`,
  };
}

/** The instant when the wall clock in `tz` shows the given local date and time. */
function zonedToUtc(y: number, mo: number, d: number, h: number, mi: number, tz: string): Date {
  const wanted = Date.UTC(y, mo - 1, d, h, mi);
  let t = wanted;
  for (let i = 0; i < 2; i++) {
    const p = localParts(new Date(t), tz);
    t += wanted - Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi); // correct by the zone offset (twice for DST edges)
  }
  return new Date(t);
}

/** Next time the schedule fires, or null if it has no days. */
export function nextRun(time: string, days: number[], tz: string, from = new Date()): Date | null {
  const [h, mi] = time.split(":").map(Number);
  const today = localParts(from, tz);
  for (let i = 0; i <= 7; i++) {
    const date = new Date(Date.UTC(today.y, today.mo - 1, today.d + i));
    if (!days.includes(date.getUTCDay())) continue;
    const at = zonedToUtc(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), h, mi, tz);
    if (at.getTime() > from.getTime()) return at;
  }
  return null;
}

/* -------------------------------------------------------------- scheduler */

const TICK_MS = 20_000; // < 60s, so every minute is checked at least twice

/** Runs every schedule whose local time is now. Safe to run in parallel: each minute is claimed atomically. */
export async function runDueSchedules(now = new Date()) {
  const list = await Schedule.find({ enabled: true });
  for (const s of list) {
    const lp = localParts(now, s.timezone);
    if (lp.hhmm !== s.time || !s.days.includes(lp.day)) continue;
    const claimed = await Schedule.updateOne(
      { _id: s._id, lastRunKey: { $ne: lp.key } },
      { $set: { lastRunKey: lp.key, lastRunAt: now } },
    );
    if (claimed.modifiedCount === 0) continue;

    const device = await Device.findById(s.device);
    if (!device) {
      await Schedule.deleteOne({ _id: s._id });
      continue;
    }
    try {
      await writePin(device, s.pin, s.value, "schedule");
      if (s.lastError) await Schedule.updateOne({ _id: s._id }, { $set: { lastError: null } });
    } catch (e) {
      const msg = (e as Error).message;
      await Schedule.updateOne({ _id: s._id }, { $set: { lastError: msg } });
      await notifyDeviceUsers(device, `${device.name}: schedule “${s.name}” failed`, msg).catch(() => {});
    }
  }
}

const g = globalThis as unknown as { __iotScheduler?: NodeJS.Timeout };

export function startScheduler() {
  if (g.__iotScheduler) return;
  const tick = () => runDueSchedules().catch((e) => console.error("[scheduler]", e));
  g.__iotScheduler = setInterval(tick, TICK_MS);
  tick();
}
