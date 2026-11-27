import { bus } from "@/lib/bus";
import { writePin } from "@/lib/core";
import { Device, type DeviceDoc } from "@/lib/models";
import { isPin } from "@/lib/pins";

/** One live hardware connection (WebSocket or MQTT). */
export type DeviceConn = {
  kind: "ws" | "mqtt";
  send(pin: string, value: unknown): void;
  close(): void;
};

const conns = new Map<string, Set<DeviceConn>>();

export async function deviceConnected(device: DeviceDoc, conn: DeviceConn, { sync = true } = {}) {
  const id = String(device._id);
  let set = conns.get(id);
  if (!set) conns.set(id, (set = new Set()));
  set.add(conn);
  if (set.size === 1) {
    const now = new Date();
    await Device.updateOne({ _id: device._id }, { $set: { connected: true, lastSeen: now } });
    bus.emit("status", { deviceId: id, online: true, connected: true, lastSeen: now.toISOString() });
  }
  if (sync) syncDevice(device, conn);
}

/** Sends the device every value it should currently have (after boot/reconnect). */
export function syncDevice(device: DeviceDoc, conn: DeviceConn) {
  for (const ds of device.datastreams) {
    if (ds.value !== null && ds.value !== undefined) conn.send(ds.pin, ds.value);
  }
}

export async function deviceDisconnected(deviceId: string, conn: DeviceConn) {
  const set = conns.get(deviceId);
  if (!set?.delete(conn)) return;
  if (set.size > 0) return;
  conns.delete(deviceId);
  const now = new Date();
  const d = await Device.findByIdAndUpdate(
    deviceId,
    { $set: { connected: false, disconnectedAt: now } },
    { returnDocument: "after" },
  );
  bus.emit("status", { deviceId, online: false, connected: false, lastSeen: d?.lastSeen?.toISOString() ?? null });
}

/** A value reported by connected hardware. */
export async function deviceReported(deviceId: string, pin: string, value: unknown) {
  if (!isPin(pin)) throw new Error(`Invalid pin ${pin}`);
  const device = await Device.findById(deviceId); // fresh: datastreams may have changed
  if (!device) throw new Error("Device deleted");
  await writePin(device, pin, value, "device");
}

let started = false;
export function startHub() {
  if (started) return;
  started = true;
  // App / automation writes → push down to the hardware.
  bus.on("pin", (e) => {
    if (e.source === "device") return;
    conns.get(e.deviceId)?.forEach((c) => c.send(e.pin, e.value));
  });
  // Token regenerated or device deleted → kick connections using the old token.
  bus.on("device:revoke", ({ deviceId }) => {
    const set = conns.get(deviceId);
    if (!set) return;
    conns.delete(deviceId);
    set.forEach((c) => c.close());
    Device.updateOne({ _id: deviceId }, { $set: { connected: false, disconnectedAt: new Date() } }).catch(() => {});
  });
}

/** After a restart no socket is open, so clear stale `connected` flags. */
export async function resetConnectionFlags() {
  await Device.updateMany({ connected: true }, { $set: { connected: false, disconnectedAt: new Date() } });
}
