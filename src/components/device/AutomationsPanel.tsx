"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api, timeAgo } from "@/lib/client/api";
import { OP_LABELS, type Automation, type AutomationOp, type Device } from "@/lib/client/types";
import { Badge, Button, Card, Empty, ErrorText, Field, Input, Modal, Select, Spinner } from "@/components/ui";

export function AutomationsPanel({ device }: { device: Device }) {
  const [list, setList] = useState<Automation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Automation | "new" | null>(null);
  const isOwner = device.role === "owner";
  const numeric = device.datastreams;

  useEffect(() => {
    api<{ automations: Automation[] }>(`/api/devices/${device.id}/automations`)
      .then((r) => setList(r.automations))
      .catch((e) => setError(e.message));
  }, [device.id]);

  async function toggle(a: Automation) {
    try {
      const r = await api<{ automation: Automation }>(`/api/automations/${a.id}`, { method: "PATCH", body: { enabled: !a.enabled } });
      setList((l) => l!.map((x) => (x.id === a.id ? r.automation : x)));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function remove(a: Automation) {
    if (!confirm(`Delete automation "${a.name}"?`)) return;
    try {
      await api(`/api/automations/${a.id}`, { method: "DELETE" });
      setList((l) => l!.filter((x) => x.id !== a.id));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const dsName = (pin: string | null) => device.datastreams.find((d) => d.pin === pin)?.name ?? pin;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted">
          Rules run on the server whenever a value arrives. They fire once when the condition becomes true, then re-arm when it turns false.
        </p>
        {isOwner && (
          <Button onClick={() => setEditing("new")} disabled={numeric.length === 0}>
            + New automation
          </Button>
        )}
      </div>
      <ErrorText error={error} />
      {!list && !error && <Spinner />}
      {list?.length === 0 && (
        <Empty title="No automations">
          {numeric.length === 0 ? "Add a datastream first." : 'Example: "If Temperature > 40 → notify me", or "If Light level < 20 → turn V0 on".'}
        </Empty>
      )}
      {list && list.length > 0 && (
        <div className="flex flex-col gap-2">
          {list.map((a) => (
            <Card key={a.id} className={`flex flex-wrap items-center gap-3 p-4 ${a.enabled ? "" : "opacity-60"}`}>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{a.name}</p>
                <p className="text-sm text-muted">
                  If <b className="text-foreground">{dsName(a.pin)}</b> {OP_LABELS[a.op]} <span className="font-mono">{a.threshold}</span> →{" "}
                  {a.action.type === "notify" ? (
                    <>notify{a.action.message ? ` “${a.action.message}”` : ""}</>
                  ) : (
                    <>
                      set <b className="text-foreground">{dsName(a.action.pin)}</b> to <span className="font-mono">{String(a.action.value)}</span>
                    </>
                  )}
                </p>
                <p className="text-xs text-muted">
                  Last fired {timeAgo(a.lastTriggeredAt)} · cooldown {a.cooldownSec}s
                </p>
              </div>
              {!a.enabled && <Badge>paused</Badge>}
              {isOwner && (
                <div className="flex gap-1">
                  <Button size="sm" variant="secondary" onClick={() => toggle(a)}>
                    {a.enabled ? "Pause" : "Resume"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(a)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" className="text-danger" onClick={() => remove(a)}>
                    Delete
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "New automation" : "Edit automation"}>
        {editing !== null && (
          <AutomationForm
            device={device}
            initial={editing === "new" ? null : editing}
            onSaved={(a) => {
              setList((l) => (l!.some((x) => x.id === a.id) ? l!.map((x) => (x.id === a.id ? a : x)) : [...l!, a]));
              setEditing(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function AutomationForm({ device, initial, onSaved }: { device: Device; initial: Automation | null; onSaved: (a: Automation) => void }) {
  const [actionType, setActionType] = useState<"notify" | "setPin">(initial?.action.type ?? "notify");
  const [targetPin, setTargetPin] = useState(initial?.action.type === "setPin" ? initial.action.pin : device.datastreams[0]?.pin);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const target = device.datastreams.find((d) => d.pin === targetPin);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const rawValue = String(f.get("value") ?? "");
    const body = {
      name: f.get("name"),
      pin: f.get("pin"),
      op: f.get("op") as AutomationOp,
      threshold: Number(f.get("threshold")),
      cooldownSec: Number(f.get("cooldownSec") || 0),
      action:
        actionType === "notify"
          ? { type: "notify", message: f.get("message") ?? "" }
          : { type: "setPin", pin: targetPin, value: rawValue !== "" && !isNaN(Number(rawValue)) ? Number(rawValue) : rawValue },
    };
    setLoading(true);
    setError(null);
    try {
      const r = initial
        ? await api<{ automation: Automation }>(`/api/automations/${initial.id}`, { method: "PATCH", body })
        : await api<{ automation: Automation }>(`/api/devices/${device.id}/automations`, { body });
      onSaved(r.automation);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Name">
        <Input name="name" required maxLength={80} defaultValue={initial?.name} placeholder="Too hot" autoFocus />
      </Field>
      <div className="grid grid-cols-[1fr_80px_1fr] gap-2">
        <Field label="If">
          <Select name="pin" defaultValue={initial?.pin}>
            {device.datastreams.map((d) => (
              <option key={d.pin} value={d.pin}>
                {d.name} ({d.pin})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="is">
          <Select name="op" defaultValue={initial?.op ?? "gt"}>
            {Object.entries(OP_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Value">
          <Input name="threshold" type="number" step="any" required defaultValue={initial?.threshold} />
        </Field>
      </div>
      <Field label="Then">
        <Select value={actionType} onChange={(e) => setActionType(e.target.value as "notify" | "setPin")}>
          <option value="notify">Send a notification</option>
          <option value="setPin">Set a datastream value</option>
        </Select>
      </Field>
      {actionType === "notify" ? (
        <Field label="Message" hint="Optional. Placeholders: {value} {unit} {device} {pin}">
          <Input name="message" maxLength={300} defaultValue={initial?.action.type === "notify" ? initial.action.message : ""} placeholder="Temperature is {value}{unit}" />
        </Field>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Datastream">
            <Select value={targetPin ?? ""} onChange={(e) => setTargetPin(e.target.value)}>
              {device.datastreams.map((d) => (
                <option key={d.pin} value={d.pin}>
                  {d.name} ({d.pin})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Set to" hint={target?.kind === "switch" ? "1 = on, 0 = off" : undefined}>
            <Input
              name="value"
              required
              defaultValue={initial?.action.type === "setPin" ? String(initial.action.value ?? "") : target?.kind === "switch" ? "1" : ""}
            />
          </Field>
        </div>
      )}
      <Field label="Cooldown (seconds)" hint="Minimum time between two firings">
        <Input name="cooldownSec" type="number" min={0} max={86400} defaultValue={initial?.cooldownSec ?? 60} />
      </Field>
      <ErrorText error={error} />
      <Button type="submit" loading={loading}>
        {initial ? "Save" : "Create automation"}
      </Button>
    </form>
  );
}
