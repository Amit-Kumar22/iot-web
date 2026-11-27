import { json, route } from "@/lib/api";
import { loadDevice } from "@/lib/access";
import { requireUserId } from "@/lib/auth";
import { bus } from "@/lib/bus";
import { newDeviceToken } from "@/lib/core";
import { Device } from "@/lib/models";

/** Issues a new auth token and disconnects anything still using the old one. */
export const POST = route(async (req, ctx: RouteContext<"/api/devices/[id]/token">) => {
  const userId = await requireUserId(req);
  const { id } = await ctx.params;
  const { device } = await loadDevice(id, userId, "owner");
  const token = newDeviceToken();
  await Device.updateOne({ _id: device._id }, { $set: { token } });
  bus.emit("device:revoke", { deviceId: id });
  return json({ token });
});
