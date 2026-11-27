import { requireUserId } from "./auth";
import { ApiError } from "./errors";
import { User } from "./models";

/** Admins are the accounts whose email is listed in ADMIN_EMAILS (comma-separated). */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

export async function requireAdmin(req: Request) {
  const userId = await requireUserId(req);
  const user = await User.findById(userId);
  if (!user) throw new ApiError(401, "Account no longer exists");
  if (!isAdminEmail(user.email)) throw new ApiError(403, "Admins only");
  return user;
}
