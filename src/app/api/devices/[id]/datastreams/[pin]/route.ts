import { ApiError, body, json, route } from "@/lib/api";
import { loadDevice } from "@/lib/access";
import { requireUserId } from "@/lib/auth";
import { deviceJSON } from "@/lib/core";
import { Automation, Device, Reading } from "@/lib/models";
import { normalizePin } from "@/lib/pins";
import { DatastreamUpdate } from "@/lib/schemas";

type Ctx = RouteContext<"/api/devices/[id]/datastreams/[pin]">;

export const PATCH = route(async (req, ctx: Ctx) => {
  const userId = await requireUserId(req);
  const { id, pin: rawPin } = await ctx.params;
  const pin = normalizePin(rawPin);
  const { device } = await loadDevice(id, userId, "owner");
  const ds = device.datastreams.find((d) => d.pin === pin);
  if (!ds) throw new ApiError(404, `Datastream ${pin} not found`);
  const input = DatastreamUpdate.parse(await body(req));
  const min = input.min ?? ds.min ?? 0;
  const max = input.max ?? ds.max ?? 100;
  if (max <= min) throw new ApiError(400, "max must be greater than min");

  // Only touch the edited fields so a concurrent value write isn't lost.
  const $set = Object.fromEntries(
    Object.entries(input)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [`datastreams.$[d].${k}`, v]),
  );
  const updated = await Device.findByIdAndUpdate(device._id, { $set }, { arrayFilters: [{ "d.pin": pin }], returnDocument: "after" });
  return json({ device: deviceJSON(updated!, "owner") });
});

export const DELETE = route(async (req, ctx: Ctx) => {
  const userId = await requireUserId(req);
  const { id, pin: rawPin } = await ctx.params;
  const pin = normalizePin(rawPin);
  const { device } = await loadDevice(id, userId, "owner");
  const updated = await Device.findByIdAndUpdate(device._id, { $pull: { datastreams: { pin } } }, { returnDocument: "after" });
  await Promise.all([
    Reading.deleteMany({ device: device._id, pin }),
    Automation.deleteMany({ device: device._id, $or: [{ pin }, { "action.pin": pin }] }),
  ]);
  return json({ device: deviceJSON(updated!, "owner") });
});
