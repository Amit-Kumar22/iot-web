import { json, route } from "@/lib/api";
import { requireUserId } from "@/lib/auth";
import { Notification } from "@/lib/models";

export const GET = route(async (req) => {
  const userId = await requireUserId(req);
  const list = await Notification.find({ user: userId }).sort({ createdAt: -1 }).limit(100);
  return json({
    notifications: list.map((n) => ({
      id: String(n._id),
      deviceId: n.device ? String(n.device) : null,
      title: n.title,
      message: n.message,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
    })),
  });
});
