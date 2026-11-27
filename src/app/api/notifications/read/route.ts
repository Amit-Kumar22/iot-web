import { json, route } from "@/lib/api";
import { requireUserId } from "@/lib/auth";
import { Notification } from "@/lib/models";

/** Marks all of the user's notifications as read. */
export const POST = route(async (req) => {
  const userId = await requireUserId(req);
  await Notification.updateMany({ user: userId, read: false }, { $set: { read: true } });
  return json({ ok: true });
});
