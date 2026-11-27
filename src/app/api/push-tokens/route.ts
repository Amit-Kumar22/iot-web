import { body, json, route } from "@/lib/api";
import { requireUserId } from "@/lib/auth";
import { PushToken } from "@/lib/models";
import { PushTokenBody } from "@/lib/schemas";

/**
 * The mobile app registers its Expo push token after login.
 * A phone belongs to whoever signed in on it last, so the token moves to this user.
 */
export const POST = route(async (req) => {
  const userId = await requireUserId(req);
  const { token, platform } = PushTokenBody.parse(await body(req));
  await PushToken.updateOne({ token }, { $set: { user: userId, platform } }, { upsert: true });
  return json({ ok: true });
});

/** Called on logout so the phone stops getting this user's alerts. */
export const DELETE = route(async (req) => {
  const userId = await requireUserId(req);
  const { token } = PushTokenBody.pick({ token: true }).parse(await body(req));
  await PushToken.deleteOne({ token, user: userId });
  return json({ ok: true });
});
