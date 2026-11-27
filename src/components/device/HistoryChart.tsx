"use client";

import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "@/lib/client/api";
import { formatValue } from "@/lib/client/apply-realtime";
import type { Datastream } from "@/lib/client/types";
import { Card, Spinner } from "@/components/ui";

const RANGES = ["1h", "6h", "24h", "7d", "30d"] as const;
type Point = { t: number; avg: number; min: number; max: number };

export function HistoryChart({ deviceId, ds, liveTick }: { deviceId: string; ds: Datastream; liveTick: string | null }) {
  const [range, setRange] = useState<(typeof RANGES)[number]>("1h");
  const [points, setPoints] = useState<Point[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refetch when range/pin changes, and (throttled) when a new value arrives.
  const bucket = liveTick ? Math.floor(new Date(liveTick).getTime() / 10_000) : 0;
  useEffect(() => {
    let cancelled = false;
    api<{ points: Point[] }>(`/api/devices/${deviceId}/history?pin=${ds.pin}&range=${range}`)
      .then((r) => !cancelled && (setPoints(r.points), setError(null)))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [deviceId, ds.pin, range, bucket]);

  const short = range === "1h" || range === "6h" || range === "24h";
  const fmtTime = (t: number) =>
    new Date(t).toLocaleString(undefined, short ? { hour: "2-digit", minute: "2-digit" } : { month: "short", day: "numeric" });

  return (
    <Card className="p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">{ds.name} history</h3>
          <p className="text-xs text-muted">Average per interval{ds.unit ? ` · ${ds.unit}` : ""}</p>
        </div>
        <div className="flex rounded-lg border border-border p-0.5" role="tablist">
          {RANGES.map((r) => (
            <button
              key={r}
              role="tab"
              aria-selected={r === range}
              onClick={() => setRange(r)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium cursor-pointer ${r === range ? "bg-accent text-accent-fg" : "text-muted hover:text-foreground"}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="h-64">
        {error ? (
          <p className="text-sm text-danger">{error}</p>
        ) : !points ? (
          <div className="grid h-full place-items-center text-muted">
            <Spinner />
          </div>
        ) : points.length === 0 ? (
          <div className="grid h-full place-items-center text-sm text-muted">No readings in this range yet</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="t"
                type="number"
                scale="time"
                domain={["dataMin", "dataMax"]}
                tickFormatter={fmtTime}
                stroke="var(--muted)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                minTickGap={40}
              />
              <YAxis stroke="var(--muted)" fontSize={11} tickLine={false} axisLine={false} width={44} domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                labelFormatter={(t) => new Date(Number(t)).toLocaleString()}
                formatter={(v) => [formatValue(Number(v), ds.unit), "avg"]}
              />
              <Area type="monotone" dataKey="avg" stroke="var(--accent)" strokeWidth={2} fill="url(#fill)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
