import { ApiError, body, json, route } from "@/lib/api";
import { accessibleDevicesFilter, roleFor } from "@/lib/access";
import { requireUserId } from "@/lib/auth";
import { deviceJSON, newDeviceToken } from "@/lib/core";
import { Device } from "@/lib/models";
import { DeviceCreate } from "@/lib/schemas";

export const GET = route(async (req) => {
  const userId = await requireUserId(req);
  const devices = await Device.find(accessibleDevicesFilter(userId)).sort({ createdAt: -1 });
  return json({ devices: devices.map((d) => deviceJSON(d, roleFor(d, userId)!)) });
});

export const POST = route(async (req) => {
  const userId = await requireUserId(req);
  const input = DeviceCreate.parse(await body(req));
  const pins = new Set(input.datastreams.map((d) => d.pin));
  if (pins.size !== input.datastreams.length) throw new ApiError(400, "Each datastream needs a unique pin");
  const device = await Device.create({ ...input, owner: userId, token: newDeviceToken() });
  return json({ device: deviceJSON(device, "owner") }, { status: 201 });
});
