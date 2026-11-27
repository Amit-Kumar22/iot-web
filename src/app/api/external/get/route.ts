import { ApiError, json, route } from "@/lib/api";
import { touchDevice } from "@/lib/core";
import { deviceFromRequest } from "@/lib/device-auth";
import { normalizePin } from "@/lib/pins";

/**
 * Server → device (HTTP polling).
 *   GET /api/external/get?token=XXX&V1        → plain text value, e.g. "1"
 *   GET /api/external/get?token=XXX&V1&V2     → {"V1":1,"V2":40}
 *   GET /api/external/get?token=XXX           → all pins as JSON
 */
export const GET = route(async (req) => {
  const { device, url } = await deviceFromRequest(req);
  await touchDevice(device);

  const requested = [...url.searchParams.keys()].filter((k) => /^v\d{1,3}$/i.test(k)).map(normalizePin);
  const pins = requested.length ? requested : device.datastreams.map((d) => d.pin);
  const values: Record<string, unknown> = {};
  for (const pin of pins) {
    const ds = device.datastreams.find((d) => d.pin === pin);
    if (!ds) throw new ApiError(404, `Datastream ${pin} is not defined on this device`);
    values[pin] = ds.value ?? null;
  }
  if (requested.length === 1) {
    const v = values[requested[0]];
    return new Response(v === null || v === undefined ? "" : String(v), {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  return json(values);
});
