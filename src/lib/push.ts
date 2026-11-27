import { PushToken } from "./models";

/**
 * Phone push notifications through the Expo Push Service.
 * Docs: https://docs.expo.dev/push-notifications/sending-notifications/
 *
 * EXPO_ACCESS_TOKEN is only needed if "enhanced push security" is turned on
 * in the Expo dashboard.
 */
const SEND_URL = "https://exp.host/--/api/v2/push/send";
const RECEIPTS_URL = "https://exp.host/--/api/v2/push/getReceipts";
const BATCH = 100; // Expo's per-request limit for sending
const RECEIPT_BATCH = 1000; // Expo's per-request limit for receipts
const TIMEOUT_MS = 10_000;
/** Expo recommends waiting ~15 min before asking for receipts; they are kept for 24 h. */
const RECEIPT_DELAY_MS = 15 * 60_000;
const RECEIPT_CHECK_EVERY_MS = 5 * 60_000;
const RECEIPT_MAX_AGE_MS = 23 * 60 * 60_000;
/** Must match the channel the app creates (robotics-trainer src/services/push.ts). */
export const ANDROID_CHANNEL = "alerts";

type Ticket = { status: "ok"; id: string } | { status: "error"; message: string; details?: { error?: string } };
type Receipt = { status: "ok" } | { status: "error"; message: string; details?: { error?: string } };

/**
 * Tickets waiting for a receipt: ticket id -> push token + when it was sent.
 * Kept in memory only, so receipts for pushes sent just before a restart are not checked.
 */
const pending = new Map<string, { token: string; sentAt: number }>();
let receiptTimer: ReturnType<typeof setInterval> | null = null;

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
      if (t.status === "ok") pending.set(t.id, { token: batch[j], sentAt: Date.now() });
      else if (t.details?.error === "DeviceNotRegistered") dead.push(batch[j]);
      else console.warn("[push]", t.details?.error ?? t.message);
    });
  }
  // App uninstalled / token expired: stop sending to it.
  if (dead.length) await PushToken.deleteMany({ token: { $in: dead } });
  if (pending.size && !receiptTimer) {
    receiptTimer = setInterval(() => void checkReceipts(), RECEIPT_CHECK_EVERY_MS);
    receiptTimer.unref?.();
  }
}

/**
 * A ticket "ok" only means Expo accepted the message. Whether FCM delivered it is in the
 * receipt: DeviceNotRegistered -> drop the token; MismatchSenderId / InvalidCredentials ->
 * the FCM key uploaded with `eas credentials` is wrong or missing.
 */
export async function checkReceipts(now = Date.now()) {
  const due: string[] = [];
  for (const [id, p] of pending) {
    if (now - p.sentAt > RECEIPT_MAX_AGE_MS) pending.delete(id); // Expo no longer has it
    else if (now - p.sentAt >= RECEIPT_DELAY_MS) due.push(id);
  }
  if (!pending.size && receiptTimer) {
    clearInterval(receiptTimer);
    receiptTimer = null;
  }

  const dead: string[] = [];
  for (let i = 0; i < due.length; i += RECEIPT_BATCH) {
    const ids = due.slice(i, i + RECEIPT_BATCH);
    const receipts = await postJson<Record<string, Receipt>>(RECEIPTS_URL, { ids });
    if (!receipts) continue; // try again next round
    for (const id of ids) {
      const r = receipts[id];
      const token = pending.get(id)?.token;
      if (!r) continue; // not ready yet
      pending.delete(id);
      if (r.status === "ok" || !token) continue;
      const code = r.details?.error;
      if (code === "DeviceNotRegistered") dead.push(token);
      else if (code === "MismatchSenderId" || code === "InvalidCredentials")
        console.error(`[push] ${code}: FCM credentials are wrong. Re-upload the FCM V1 key with \`eas credentials\`.`);
      else console.warn("[push] receipt error:", code ?? r.message);
    }
  }
  if (dead.length) await PushToken.deleteMany({ token: { $in: dead } });
}

async function post(messages: unknown[]): Promise<Ticket[] | null> {
  return postJson<Ticket[]>(SEND_URL, messages);
}

async function postJson<T>(url: string, payload: unknown): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        ...(process.env.EXPO_ACCESS_TOKEN ? { authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const json = (await res.json().catch(() => ({}))) as { data?: T; errors?: { message: string }[] };
    if (!res.ok) {
      console.warn("[push] Expo replied", res.status, json.errors?.map((e) => e.message).join("; "));
      return null;
    }
    return json.data ?? null;
  } catch (e) {
    console.warn("[push] request failed:", (e as Error).message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
