import { ApiError, json, route } from "@/lib/api";
import { loadDevice } from "@/lib/access";
import { requireUserId } from "@/lib/auth";
import { Reading } from "@/lib/models";
import { normalizePin } from "@/lib/pins";

const RANGES: Record<string, number> = {
  "1h": 3600e3,
  "6h": 6 * 3600e3,
  "24h": 24 * 3600e3,
  "7d": 7 * 86400e3,
  "30d": 30 * 86400e3,
};
const BUCKETS = 120;

/** Sensor history, averaged into ~120 buckets: GET ?pin=V1&range=24h */
export const GET = route(async (req, ctx: RouteContext<"/api/devices/[id]/history">) => {
  const userId = await requireUserId(req);
  const { id } = await ctx.params;
  const { device } = await loadDevice(id, userId, "viewer");
  const url = new URL(req.url);
  const pin = normalizePin(url.searchParams.get("pin") ?? "");
  const range = url.searchParams.get("range") ?? "24h";
  const span = RANGES[range];
  if (!span) throw new ApiError(400, `range must be one of ${Object.keys(RANGES).join(", ")}`);

  const now = Date.now();
  const from = new Date(now - span);
  const bucketMs = Math.max(1000, Math.floor(span / BUCKETS));
  const rows = await Reading.aggregate<{ _id: number; avg: number; min: number; max: number }>([
    { $match: { device: device._id, pin, ts: { $gte: from } } },
    {
      $group: {
        _id: { $subtract: [{ $toLong: "$ts" }, { $mod: [{ $toLong: "$ts" }, bucketMs] }] },
        avg: { $avg: "$value" },
        min: { $min: "$value" },
        max: { $max: "$value" },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  return json({
    pin,
    range,
    from: from.toISOString(),
    to: new Date(now).toISOString(),
    points: rows.map((r) => ({ t: r._id, avg: r.avg, min: r.min, max: r.max })),
  });
});
