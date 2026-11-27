import { ApiError, body, json, route } from "@/lib/api";
import { loadDevice } from "@/lib/access";
import { requireUserId } from "@/lib/auth";
import { deviceJSON } from "@/lib/core";
import { Device } from "@/lib/models";
import { DatastreamCreate } from "@/lib/schemas";

export const POST = route(async (req, ctx: RouteContext<"/api/devices/[id]/datastreams">) => {
  const userId = await requireUserId(req);
  const { id } = await ctx.params;
  const { device } = await loadDevice(id, userId, "owner");
  const ds = DatastreamCreate.parse(await body(req));
  // Atomic push so a concurrent value write from the device isn't overwritten.
  const updated = await Device.findOneAndUpdate(
    { _id: device._id, "datastreams.pin": { $ne: ds.pin } },
    { $push: { datastreams: ds } },
    { returnDocument: "after" },
  );
  if (!updated) throw new ApiError(409, `${ds.pin} is already used`);
  return json({ device: deviceJSON(updated, "owner") }, { status: 201 });
});
