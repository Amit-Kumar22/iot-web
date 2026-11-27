import { body, json, route } from "@/lib/api";
import { loadDevice } from "@/lib/access";
import { requireUserId } from "@/lib/auth";
import { bus } from "@/lib/bus";
import { deviceJSON } from "@/lib/core";
import { Automation, Device, Notification, Reading } from "@/lib/models";
import { DeviceUpdate } from "@/lib/schemas";

type Ctx = RouteContext<"/api/devices/[id]">;

export const GET = route(async (req, ctx: Ctx) => {
  const userId = await requireUserId(req);
  const { id } = await ctx.params;
  const { device, role } = await loadDevice(id, userId, "viewer");
  if (role === "owner") await device.populate("shares.user", "email name");
  return json({ device: deviceJSON(device, role) });
});

export const PATCH = route(async (req, ctx: Ctx) => {
  const userId = await requireUserId(req);
  const { id } = await ctx.params;
  const { device } = await loadDevice(id, userId, "owner");
  const input = DeviceUpdate.parse(await body(req));
  const updated = await Device.findByIdAndUpdate(device._id, { $set: input }, { returnDocument: "after" }).populate(
    "shares.user",
    "email name",
  );
  return json({ device: deviceJSON(updated!, "owner") });
});

export const DELETE = route(async (req, ctx: Ctx) => {
  const userId = await requireUserId(req);
  const { id } = await ctx.params;
  const { device } = await loadDevice(id, userId, "owner");
  await Promise.all([
    Device.deleteOne({ _id: device._id }),
    Reading.deleteMany({ device: device._id }),
    Automation.deleteMany({ device: device._id }),
    Notification.deleteMany({ device: device._id }),
  ]);
  bus.emit("device:revoke", { deviceId: id });
  return json({ ok: true });
});
