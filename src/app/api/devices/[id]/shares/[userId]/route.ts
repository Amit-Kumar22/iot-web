import { ApiError, json, route } from "@/lib/api";
import { loadDevice } from "@/lib/access";
import { requireUserId } from "@/lib/auth";
import { Device } from "@/lib/models";

/** Remove a share. The owner can remove anyone; a shared user can remove themselves ("leave"). */
export const DELETE = route(async (req, ctx: RouteContext<"/api/devices/[id]/shares/[userId]">) => {
  const userId = await requireUserId(req);
  const { id, userId: target } = await ctx.params;
  const { device, role } = await loadDevice(id, userId, "viewer");
  if (role !== "owner" && target !== userId) throw new ApiError(403, "Only the owner can remove other users");
  await Device.updateOne({ _id: device._id }, { $pull: { shares: { user: target } } });
  return json({ ok: true });
});
