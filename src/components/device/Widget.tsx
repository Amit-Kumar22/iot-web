"use client";

import { useState } from "react";
import { api, timeAgo } from "@/lib/client/api";
import { formatValue } from "@/lib/client/apply-realtime";
import type { Datastream } from "@/lib/client/types";
import { Card } from "@/components/ui";

/** Fixed widget per datastream kind: switch → toggle, slider → range, value → readout. */
export function Widget({
  deviceId,
  ds,
  canControl,
  selected,
  onSelect,
}: {
  deviceId: string;
  ds: Datastream;
  canControl: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const [error, setError] = useState<string | null>(null);

  async function write(value: number) {
    setError(null);
    try {
      await api(`/api/devices/${deviceId}/write`, { body: { pin: ds.pin, value } });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const chartable = ds.kind !== "switch";

  return (
    <Card className={`flex flex-col gap-4 p-5 transition ${selected ? "border-accent/60 ring-4 ring-accent/10" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{ds.name}</p>
          <p className="mt-0.5 inline-block rounded bg-background px-1.5 font-mono text-[11px] text-muted">{ds.pin}</p>
        </div>
        {chartable && (
          <button
            onClick={onSelect}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
              selected ? "bg-accent-soft text-accent-text" : "text-muted hover:bg-background hover:text-foreground"
            }`}
          >
            {selected ? "Charted" : "Chart"}
          </button>
        )}
      </div>

      {ds.kind === "switch" && <SwitchControl value={ds.value} disabled={!canControl} onChange={(v) => write(v)} />}
      {ds.kind === "slider" && <SliderControl ds={ds} disabled={!canControl} onCommit={write} />}
      {ds.kind === "value" && (
        <p className="font-mono text-4xl font-bold tracking-tight tabular-nums text-ink">{formatValue(ds.value, ds.unit)}</p>
      )}

      <p className="text-xs text-muted">{error ? <span className="text-danger">{error}</span> : `Updated ${timeAgo(ds.updatedAt)}`}</p>
    </Card>
  );
}

function SwitchControl({ value, disabled, onChange }: { value: unknown; disabled: boolean; onChange: (v: number) => void }) {
  const on = value === 1;
  return (
    <button
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(on ? 0 : 1)}
      className={`relative flex h-14 w-full items-center rounded-2xl border p-1.5 text-sm font-bold transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
        on ? "border-accent bg-accent text-white shadow-md shadow-accent/30" : "border-border bg-background text-muted"
      }`}
    >
      <span
        className={`absolute top-1.5 grid h-[calc(100%-12px)] w-[calc(50%-6px)] place-items-center rounded-xl bg-white text-xs shadow-sm transition-all ${
          on ? "left-[calc(50%+0px)] text-accent-text" : "left-1.5 text-muted"
        }`}
      >
        {on ? "ON" : "OFF"}
      </span>
      <span className={`w-1/2 text-center text-xs ${on ? "" : "invisible"}`}>Turn off</span>
      <span className={`w-1/2 text-center text-xs ${on ? "invisible" : ""}`}>Turn on</span>
    </button>
  );
}

function SliderControl({ ds, disabled, onCommit }: { ds: Datastream; disabled: boolean; onCommit: (v: number) => void }) {
  const current = typeof ds.value === "number" ? ds.value : ds.min;
  const [local, setLocal] = useState(current);
  const [dragging, setDragging] = useState(false);
  const [synced, setSynced] = useState(current);
  // Follow live updates unless the user is mid-drag.
  if (current !== synced && !dragging) {
    setSynced(current);
    setLocal(current);
  }

  const commit = () => {
    setDragging(false);
    if (local !== current) onCommit(local);
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="font-mono text-4xl font-bold tracking-tight tabular-nums text-ink">{formatValue(local, ds.unit)}</p>
      <input
        type="range"
        min={ds.min}
        max={ds.max}
        step={ds.step}
        value={local}
        disabled={disabled}
        onChange={(e) => {
          setDragging(true);
          setLocal(Number(e.target.value));
        }}
        onPointerUp={commit}
        onKeyUp={commit}
        className="w-full"
        aria-label={ds.name}
      />
      <div className="flex justify-between font-mono text-xs text-muted">
        <span>{ds.min}</span>
        <span>{ds.max}</span>
      </div>
    </div>
  );
}
