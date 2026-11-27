import { PushToken } from "./models";

/**
 * Phone push notifications through the Expo Push Service.
 * Docs: https://docs.expo.dev/push-notifications/sending-notifications/
 *
 * EXPO_ACCESS_TOKEN is only needed if "enhanced push security" is turned on
 * in the Expo dashboard.
 */
const SEND_URL = "https://exp.host/--/api/v2/push/send";
const BATCH = 100; // Expo's per-request limit
const TIMEOUT_MS = 10_000;
/** Must match the channel the app creates (robotics-trainer src/services/push.ts). */
export const ANDROID_CHANNEL = "alerts";

type Ticket = { status: "ok"; id: string } | { status: "error"; message: string; details?: { error?: string } };

export async function sendPush(userIds: string[], title: string, body: string, data: Record<string, unknown> = {}) {
  if (process.env.PUSH_ENABLED === "false" || userIds.length === 0) return;
  const tokens = (await PushToken.find({ user: { $in: userIds } }, { token: 1 })).map((t) => t.token);
  if (tokens.length === 0) return;

  const dead: string[] = [];
  for (let i = 0; i < tokens.length; i += BATCH) {
    const batch = tokens.slice(i, i + BATCH);
    const messages = batch.map((to) => ({
      to,
      title: title.slice(0, 120),
      body: body.slice(0, 500),
      data,
      channelId: ANDROID_CHANNEL,
      priority: "high",
      sound: "default",
    }));
    const tickets = await post(messages);
    tickets?.forEach((t, j) => {
      if (t.status === "error" && t.details?.error === "DeviceNotRegistered") dead.push(batch[j]);
      else if (t.status === "error") console.warn("[push]", t.details?.error ?? t.message);
    });
  }
  // App uninstalled / token expired: stop sending to it.
  if (dead.length) await PushToken.deleteMany({ token: { $in: dead } });
}

async function post(messages: unknown[]): Promise<Ticket[] | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(SEND_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        ...(process.env.EXPO_ACCESS_TOKEN ? { authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}),
      },
      body: JSON.stringify(messages),
      signal: controller.signal,
    });
    const json = (await res.json().catch(() => ({}))) as { data?: Ticket[]; errors?: { message: string }[] };
    if (!res.ok) {
      console.warn("[push] Expo replied", res.status, json.errors?.map((e) => e.message).join("; "));
      return null;
    }
    return json.data ?? null;
  } catch (e) {
    console.warn("[push] send failed:", (e as Error).message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
