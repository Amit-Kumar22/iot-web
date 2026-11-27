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
    <Card className={`flex flex-col gap-3 p-4 ${selected ? "ring-2 ring-accent/50" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{ds.name}</p>
          <p className="font-mono text-xs text-muted">{ds.pin}</p>
        </div>
        {chartable && (
          <button
            onClick={onSelect}
            className={`rounded-md px-2 py-1 text-xs font-medium cursor-pointer ${selected ? "bg-accent/15 text-accent" : "text-muted hover:text-foreground"}`}
          >
            {selected ? "Charted" : "Chart"}
          </button>
        )}
      </div>

      {ds.kind === "switch" && <SwitchControl value={ds.value} disabled={!canControl} onChange={(v) => write(v)} />}
      {ds.kind === "slider" && <SliderControl ds={ds} disabled={!canControl} onCommit={write} />}
      {ds.kind === "value" && (
        <p className="font-mono text-3xl font-semibold tabular-nums">{formatValue(ds.value, ds.unit)}</p>
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
      className={`relative h-12 w-full rounded-xl border text-sm font-semibold transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
        on ? "border-accent bg-accent text-accent-fg" : "border-border bg-background text-muted"
      }`}
    >
      {on ? "ON" : "OFF"}
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
      <p className="font-mono text-3xl font-semibold tabular-nums">{formatValue(local, ds.unit)}</p>
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
