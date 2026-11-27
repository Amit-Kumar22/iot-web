import { randomBytes } from "node:crypto";
import { Automation, Device, Notification, Reading, type AutomationOp, type DeviceDoc } from "./models";
import { bus, type PinEvent } from "./bus";
import { ApiError } from "./errors";
import { sendPush } from "./push";
import { coerceValue, isOnline, ONLINE_WINDOW_MS } from "./pins";
import type { Role } from "./access";

export const newDeviceToken = () => randomBytes(16).toString("hex");

const MAX_AUTOMATION_DEPTH = 3;
const TOUCH_THROTTLE_MS = 10_000;

/**
 * The single place a datastream value changes. Used by the HTTP device API,
 * the app API, WebSocket/MQTT devices and automations.
 */
export async function writePin(
  device: DeviceDoc,
  pin: string,
  raw: unknown,
  source: PinEvent["source"],
  depth = 0,
): Promise<number | string> {
  const ds = device.datastreams.find((d) => d.pin === pin);
  if (!ds) throw new ApiError(404, `Datastream ${pin} is not defined on this device`);
  const value = coerceValue(ds, raw);
  const now = new Date();

  const $set: Record<string, unknown> = { "datastreams.$[d].value": value, "datastreams.$[d].updatedAt": now };
  if (source === "device") $set.lastSeen = now;
  await Device.updateOne({ _id: device._id }, { $set }, { arrayFilters: [{ "d.pin": pin }] });
  ds.value = value;
  ds.updatedAt = now;

  if (typeof value === "number") await Reading.create({ device: device._id, pin, value, ts: now });

  if (source === "device") maybeEmitOnline(device, now);
  bus.emit("pin", { deviceId: String(device._id), pin, value, source, at: now.toISOString() });

  if (typeof value === "number" && depth < MAX_AUTOMATION_DEPTH) {
    await runAutomations(device, pin, value, depth).catch((e) => console.error("[automation]", e));
  }
  return value;
}

/** Marks an HTTP device as seen (throttled), emitting a status event if it just came online. */
export async function touchDevice(device: DeviceDoc): Promise<void> {
  const now = new Date();
  const last = device.lastSeen ? device.lastSeen.getTime() : 0;
  if (now.getTime() - last < TOUCH_THROTTLE_MS) return;
  maybeEmitOnline(device, now);
  device.lastSeen = now;
  await Device.updateOne({ _id: device._id }, { $set: { lastSeen: now } });
}

function maybeEmitOnline(device: DeviceDoc, now: Date) {
  const wasOnline = isOnline(device, now.getTime());
  if (!wasOnline) {
    bus.emit("status", {
      deviceId: String(device._id),
      online: true,
      connected: !!device.connected,
      lastSeen: now.toISOString(),
    });
  }
}

/* ------------------------------------------------------------ automations */

export function compare(v: number, op: AutomationOp, t: number): boolean {
  switch (op) {
    case "gt": return v > t;
    case "gte": return v >= t;
    case "lt": return v < t;
    case "lte": return v <= t;
    case "eq": return v === t;
    case "neq": return v !== t;
  }
}

async function runAutomations(device: DeviceDoc, pin: string, value: number, depth: number) {
  const autos = await Automation.find({ device: device._id, pin, enabled: true });
  const now = new Date();
  for (const a of autos) {
    const met = compare(value, a.op as AutomationOp, a.threshold);
    if (!met) {
      if (a.conditionMet) await Automation.updateOne({ _id: a._id }, { $set: { conditionMet: false } });
      continue;
    }
    // Atomically claim the false→true edge so concurrent writes fire only once.
    const claimed = await Automation.updateOne({ _id: a._id, conditionMet: false }, { $set: { conditionMet: true } });
    if (claimed.modifiedCount === 0) continue;
    const cooling = a.lastTriggeredAt && now.getTime() - a.lastTriggeredAt.getTime() < a.cooldownSec * 1000;
    if (cooling) continue;
    await Automation.updateOne({ _id: a._id }, { $set: { lastTriggeredAt: now } });

    if (a.action.type === "notify") {
      const ds = device.datastreams.find((d) => d.pin === pin);
      const fill = (s: string) =>
        s
          .replaceAll("{value}", String(value))
          .replaceAll("{unit}", ds?.unit ?? "")
          .replaceAll("{device}", device.name)
          .replaceAll("{pin}", pin);
      const message = fill(a.action.message || `${ds?.name ?? pin} is {value}{unit}`);
      await notifyDeviceUsers(device, `${device.name}: ${a.name}`, message);
    } else if (a.action.type === "setPin" && a.action.pin) {
      const fresh = await Device.findById(device._id);
      if (fresh) await writePin(fresh, a.action.pin, a.action.value, "automation", depth + 1);
    }
  }
}

export async function notifyDeviceUsers(device: DeviceDoc, title: string, message: string) {
  const userIds = [String(device.owner), ...device.shares.map((s) => String(s.user))];
  await notifyUsers(userIds, String(device._id), title, message);
}

export async function notifyUsers(userIds: string[], deviceId: string | null, title: string, message: string) {
  const createdAt = new Date();
  await Notification.insertMany(userIds.map((user) => ({ user, device: deviceId, title, message, createdAt })));
  bus.emit("notify", { userIds, notification: { title, message, deviceId, createdAt: createdAt.toISOString() } });
  // Phone push is best-effort: it must never break the automation/schedule that triggered it.
  sendPush(userIds, title, message, { deviceId }).catch((e) => console.error("[push]", e));
}

/* ---------------------------------------------------------- serialization */

type PopulatedShare = { user: { _id: unknown; email: string; name: string } | unknown; role: string };

export function deviceJSON(device: DeviceDoc, role: Role) {
  const isOwner = role === "owner";
  return {
    id: String(device._id),
    name: device.name,
    description: device.description,
    role,
    online: isOnline(device),
    connected: !!device.connected,
    lastSeen: device.lastSeen?.toISOString() ?? null,
    onlineWindowMs: ONLINE_WINDOW_MS,
    datastreams: device.datastreams.map((d) => ({
      pin: d.pin,
      name: d.name,
      kind: d.kind,
      min: d.min,
      max: d.max,
      step: d.step,
      unit: d.unit,
      value: d.value ?? null,
      updatedAt: d.updatedAt?.toISOString() ?? null,
    })),
    ...(isOwner
      ? {
          token: device.token,
          shares: (device.shares as unknown as PopulatedShare[]).map((s) => {
            const u = s.user as { _id?: unknown; email?: string; name?: string };
            return { userId: String(u?._id ?? s.user), email: u?.email ?? null, name: u?.name ?? null, role: s.role };
          }),
        }
      : {}),
    createdAt: (device as unknown as { createdAt?: Date }).createdAt?.toISOString() ?? null,
  };
}
