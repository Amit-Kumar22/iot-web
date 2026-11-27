import { ApiError, body, json, route } from "@/lib/api";
import { loadDevice } from "@/lib/access";
import { requireUserId } from "@/lib/auth";
import { deviceJSON, notifyUsers } from "@/lib/core";
import { Device, User } from "@/lib/models";
import { ShareBody } from "@/lib/schemas";

/** Share a device with another registered user (or change their role). Owner only. */
export const POST = route(async (req, ctx: RouteContext<"/api/devices/[id]/shares">) => {
  const userId = await requireUserId(req);
  const { id } = await ctx.params;
  const { device } = await loadDevice(id, userId, "owner");
  const { email, role } = ShareBody.parse(await body(req));
  const target = await User.findOne({ email: email.toLowerCase() });
  if (!target) throw new ApiError(404, "No account with that email. Ask them to sign up first.");
  if (String(target._id) === userId) throw new ApiError(400, "You already own this device");

  const already = device.shares.some((s) => String(s.user) === String(target._id));
  if (already) {
    await Device.updateOne(
      { _id: device._id },
      { $set: { "shares.$[s].role": role } },
      { arrayFilters: [{ "s.user": target._id }] },
    );
  } else {
    await Device.updateOne({ _id: device._id }, { $push: { shares: { user: target._id, role } } });
    await notifyUsers([String(target._id)], id, "Device shared with you", `You now have ${role} access to "${device.name}".`);
  }
  const updated = await Device.findById(device._id).populate("shares.user", "email name");
  return json({ device: deviceJSON(updated!, "owner") });
});
