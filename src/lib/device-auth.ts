import { Device, type DeviceDoc } from "./models";
import { ApiError } from "./errors";

const TOKEN_RE = /^[a-f0-9]{32}$/;

/** Device token from `?token=` or the `X-Device-Token` header. */
export async function deviceFromRequest(req: Request): Promise<{ device: DeviceDoc; url: URL }> {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? req.headers.get("x-device-token");
  return { device: await deviceByToken(token), url };
}

export async function deviceByToken(token: string | null | undefined): Promise<DeviceDoc> {
  if (!token || !TOKEN_RE.test(token)) throw new ApiError(401, "Invalid auth token");
  const device = await Device.findOne({ token });
  if (!device) throw new ApiError(401, "Invalid auth token");
  return device;
}

/** Pin params from a query string, e.g. `?token=..&V1=20&v2=on` → [["V1","20"],["V2","on"]] */
export function pinParams(url: URL): [string, string][] {
  const out: [string, string][] = [];
  for (const [k, v] of url.searchParams) {
    if (/^v\d{1,3}$/i.test(k)) out.push([k.toUpperCase(), v]);
  }
  return out;
}
