import { ApiError, body, json, route } from "@/lib/api";
import { writePin } from "@/lib/core";
import { deviceFromRequest, pinParams } from "@/lib/device-auth";
import { normalizePin } from "@/lib/pins";

/**
 * Device → server (HTTP).
 *   GET  /api/external/update?token=XXX&V1=23.5&V2=1
 *   POST /api/external/update?token=XXX   body: {"V1": 23.5, "V2": 1}
 */
async function apply(device: Awaited<ReturnType<typeof deviceFromRequest>>["device"], pairs: [string, unknown][]) {
  if (pairs.length === 0) throw new ApiError(400, "Pass at least one pin, e.g. &V1=10");
  const written: Record<string, unknown> = {};
  for (const [pin, value] of pairs) written[pin] = await writePin(device, normalizePin(pin), value, "device");
  return json({ ok: true, written });
}

export const GET = route(async (req) => {
  const { device, url } = await deviceFromRequest(req);
  return apply(device, pinParams(url));
});

export const POST = route(async (req) => {
  const { device, url } = await deviceFromRequest(req);
  const data = await body(req);
  const fromBody =
    data && typeof data === "object" && !Array.isArray(data) ? (Object.entries(data) as [string, unknown][]) : [];
  return apply(device, [...pinParams(url), ...fromBody]);
});
