"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api, timeAgo } from "@/lib/client/api";
import { WEEKDAY_SHORT, type Datastream, type Device, type Schedule } from "@/lib/client/types";
import { Badge, Button, Card, Empty, ErrorText, Field, Input, Modal, Select, Spinner } from "@/components/ui";

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [1, 2, 3, 4, 5];

export function daysLabel(days: number[]): string {
  const set = [...days].sort().join(",");
  if (set === ALL_DAYS.join(",")) return "Every day";
  if (set === WEEKDAYS.join(",")) return "Mon – Fri";
  if (set === "0,6") return "Weekends";
  // Monday-first reads more naturally
  return [1, 2, 3, 4, 5, 6, 0].filter((d) => days.includes(d)).map((d) => WEEKDAY_SHORT[d]).join(", ");
}

function to12h(time: string): string {
  const [h, m] = time.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

export function valueLabel(ds: Datastream | undefined, value: unknown): string {
  if (ds?.kind === "switch") return Number(value) === 1 ? "ON" : "OFF";
  return `${value}${ds?.unit ? ` ${ds.unit}` : ""}`;
}

function inFuture(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86_400_000);
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (d.toDateString() === today.toDateString()) return `today ${time}`;
  if (d.toDateString() === tomorrow.toDateString()) return `tomorrow ${time}`;
  return `${d.toLocaleDateString([], { weekday: "short" })} ${time}`;
}

export function SchedulesPanel({ device }: { device: Device }) {
  const [list, setList] = useState<Schedule[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Schedule | "new" | null>(null);
  const canEdit = device.role !== "viewer";
  const controllable = device.datastreams.filter((d) => d.kind !== "value");

  useEffect(() => {
    api<{ schedules: Schedule[] }>(`/api/devices/${device.id}/schedules`)
      .then((r) => setList(r.schedules))
      .catch((e) => setError(e.message));
  }, [device.id]);

  const upsert = (s: Schedule) =>
    setList((l) => {
      const next = l!.some((x) => x.id === s.id) ? l!.map((x) => (x.id === s.id ? s : x)) : [...l!, s];
      return next.sort((a, b) => a.time.localeCompare(b.time));
    });

  async function toggle(s: Schedule) {
    try {
      const r = await api<{ schedule: Schedule }>(`/api/schedules/${s.id}`, { method: "PATCH", body: { enabled: !s.enabled } });
      upsert(r.schedule);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function remove(s: Schedule) {
    if (!confirm(`Delete schedule "${s.name}"?`)) return;
    try {
      await api(`/api/schedules/${s.id}`, { method: "DELETE" });
      setList((l) => l!.filter((x) => x.id !== s.id));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const dsFor = (pin: string) => device.datastreams.find((d) => d.pin === pin);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <p className="text-sm text-muted">
          Switch a pin at a set time, e.g. turn the light on every evening. Runs on the server, so the website and phone can be closed.
        </p>
        {canEdit && (
          <Button onClick={() => setEditing("new")} disabled={controllable.length === 0}>
            + New schedule
          </Button>
        )}
      </div>
      <ErrorText error={error} />
      {!list && !error && <Spinner />}
      {list?.length === 0 && (
        <Empty title="No schedules">
          {controllable.length === 0
            ? "Add a switch or slider datastream first."
            : 'Example: "Every day at 7:00 PM → Light ON", "Mon – Fri at 6:00 AM → Pump ON".'}
        </Empty>
      )}
      {list && list.length > 0 && (
        <div className="flex flex-col gap-2">
          {list.map((s) => {
            const ds = dsFor(s.pin);
            return (
              <Card key={s.id} className={`flex flex-wrap items-center gap-4 p-4 ${s.enabled ? "" : "opacity-60"}`}>
                <div className="w-24 shrink-0">
                  <p className="font-mono text-xl font-semibold tabular-nums">{to12h(s.time)}</p>
                  <p className="text-xs text-muted">{daysLabel(s.days)}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{s.name}</p>
                  <p className="text-sm text-muted">
                    Set <b className="text-foreground">{ds?.name ?? s.pin}</b> to{" "}
                    <span className="font-mono text-foreground">{valueLabel(ds, s.value)}</span>
                  </p>
                  <p className="text-xs text-muted">
                    {s.enabled ? `Next: ${inFuture(s.nextRunAt)}` : "Paused"} · last ran {timeAgo(s.lastRunAt)}
                    {s.timezone !== Intl.DateTimeFormat().resolvedOptions().timeZone && ` · ${s.timezone}`}
                  </p>
                  {s.lastError && <p className="text-xs text-danger">Last run failed: {s.lastError}</p>}
                </div>
                {!s.enabled && <Badge>paused</Badge>}
                {canEdit && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="secondary" onClick={() => toggle(s)}>
                      {s.enabled ? "Pause" : "Resume"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(s)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" className="text-danger" onClick={() => remove(s)}>
                      Delete
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "New schedule" : "Edit schedule"}>
        {editing !== null && (
          <ScheduleForm
            device={device}
            pins={controllable}
            initial={editing === "new" ? null : editing}
            onSaved={(s) => {
              upsert(s);
              setEditing(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function ScheduleForm({
  device,
  pins,
  initial,
  onSaved,
}: {
  device: Device;
  pins: Datastream[];
  initial: Schedule | null;
  onSaved: (s: Schedule) => void;
}) {
  const [pin, setPin] = useState(initial?.pin ?? pins[0]?.pin);
  const [days, setDays] = useState<number[]>(initial?.days ?? ALL_DAYS);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const ds = pins.find((d) => d.pin === pin);

  const toggleDay = (d: number) => setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (days.length === 0) return setError("Pick at least one day");
    const f = new FormData(e.currentTarget);
    const body = {
      name: f.get("name"),
      pin,
      value: Number(f.get("value")),
      time: f.get("time"),
      days,
      // Keep the zone it was made in, so editing from another place doesn't shift it.
      timezone: initial?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    setLoading(true);
    setError(null);
    try {
      const r = initial
        ? await api<{ schedule: Schedule }>(`/api/schedules/${initial.id}`, { method: "PATCH", body })
        : await api<{ schedule: Schedule }>(`/api/devices/${device.id}/schedules`, { body });
      onSaved(r.schedule);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Name">
        <Input name="name" required maxLength={80} defaultValue={initial?.name} placeholder="Evening light" autoFocus />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Datastream">
          <Select value={pin ?? ""} onChange={(e) => setPin(e.target.value)}>
            {pins.map((d) => (
              <option key={d.pin} value={d.pin}>
                {d.name} ({d.pin})
              </option>
            ))}
          </Select>
        </Field>
        {ds?.kind === "switch" ? (
          <Field label="Set to">
            <Select key={`sw-${pin}`} name="value" defaultValue={initial?.pin === pin ? String(Number(initial.value)) : "1"}>
              <option value="1">ON</option>
              <option value="0">OFF</option>
            </Select>
          </Field>
        ) : (
          <Field label="Set to" hint={ds ? `${ds.min} – ${ds.max}${ds.unit ? ` ${ds.unit}` : ""}` : undefined}>
            <Input
              key={`sl-${pin}`}
              name="value"
              type="number"
              required
              min={ds?.min}
              max={ds?.max}
              step={ds?.step ?? "any"}
              defaultValue={initial?.pin === pin ? String(initial.value ?? "") : ""}
            />
          </Field>
        )}
      </div>
      <Field label="Time">
        <Input name="time" type="time" required defaultValue={initial?.time ?? "19:00"} />
      </Field>
      <Field label="Days">
        <div className="flex flex-wrap gap-1.5">
          {[1, 2, 3, 4, 5, 6, 0].map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={days.includes(d)}
              onClick={() => toggleDay(d)}
              className={`h-9 w-12 rounded-lg border text-sm font-semibold transition cursor-pointer ${
                days.includes(d) ? "border-accent bg-accent text-accent-fg" : "border-border bg-card text-muted hover:text-foreground"
              }`}
            >
              {WEEKDAY_SHORT[d]}
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-3 text-xs">
          <button type="button" className="text-accent-text hover:underline cursor-pointer" onClick={() => setDays(ALL_DAYS)}>
            Every day
          </button>
          <button type="button" className="text-accent-text hover:underline cursor-pointer" onClick={() => setDays(WEEKDAYS)}>
            Mon – Fri
          </button>
          <button type="button" className="text-accent-text hover:underline cursor-pointer" onClick={() => setDays([0, 6])}>
            Weekends
          </button>
        </div>
      </Field>
      <ErrorText error={error} />
      <Button type="submit" loading={loading}>
        {initial ? "Save" : "Create schedule"}
      </Button>
    </form>
  );
}
