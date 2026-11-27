import { route } from "@/lib/api";
import { deviceFromRequest } from "@/lib/device-auth";
import { isOnline } from "@/lib/pins";

/** GET /api/external/isHardwareConnected?token=XXX → "true" | "false" */
export const GET = route(async (req) => {
  const { device } = await deviceFromRequest(req);
  return new Response(String(isOnline(device)), { headers: { "content-type": "text/plain" } });
});
