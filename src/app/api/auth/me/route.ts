import { isAdminEmail } from "@/lib/admin";
import { ApiError, json, route } from "@/lib/api";
import { requireUserId } from "@/lib/auth";
import { Notification, User } from "@/lib/models";
import { userJSON } from "@/lib/session-response";

export const GET = route(async (req) => {
  const userId = await requireUserId(req);
  const user = await User.findById(userId);
  if (!user) throw new ApiError(401, "Account no longer exists");
  const unread = await Notification.countDocuments({ user: userId, read: false });
  return json({ user: { ...userJSON(user), isAdmin: isAdminEmail(user.email) }, unreadNotifications: unread });
});
