"use client";

import { useState, type FormEvent } from "react";
import { api } from "@/lib/client/api";
import type { Datastream, DatastreamKind, Device } from "@/lib/client/types";
import { Badge, Button, Card, Empty, ErrorText, Field, Input, Modal, Select } from "@/components/ui";

const KIND_HELP: Record<DatastreamKind, string> = {
  switch: "On/off control (0 or 1), e.g. a relay or LED",
  slider: "Number you set from the app within min–max, e.g. motor speed",
  value: "Reading sent by the device, e.g. temperature. Numbers get history charts.",
};

export function DatastreamsPanel({ device, onChange }: { device: Device; onChange: (d: Device) => void }) {
  const [editing, setEditing] = useState<Datastream | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isOwner = device.role === "owner";

  async function remove(ds: Datastream) {
    if (!confirm(`Delete ${ds.pin} "${ds.name}"? Its history and automations using it are deleted too.`)) return;
    try {
      const r = await api<{ device: Device }>(`/api/devices/${device.id}/datastreams/${ds.pin}`, { method: "DELETE" });
      onChange(r.device);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <p className="text-sm text-muted">
          Datastreams are the device&apos;s virtual pins (<code className="font-mono">V0</code>–<code className="font-mono">V255</code>). Each one
          gets a fixed widget on the dashboard.
        </p>
        {isOwner && <Button onClick={() => setEditing("new")}>+ Add datastream</Button>}
      </div>
      <ErrorText error={error} />
      {device.datastreams.length === 0 ? (
        <Empty title="No datastreams yet">Add one for every value the device sends or receives.</Empty>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-sm">
            <thead className="border-b border-border text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">Pin</th>
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 font-medium">Range</th>
                <th className="px-4 py-2.5 font-medium">Unit</th>
                {isOwner && <th className="px-4 py-2.5" />}
              </tr>
            </thead>
            <tbody>
              {device.datastreams.map((ds) => (
                <tr key={ds.pin} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 font-mono">{ds.pin}</td>
                  <td className="px-4 py-2.5">{ds.name}</td>
                  <td className="px-4 py-2.5">
                    <Badge>{ds.kind}</Badge>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-muted">{ds.kind === "switch" ? "0 – 1" : `${ds.min} – ${ds.max}`}</td>
                  <td className="px-4 py-2.5 text-muted">{ds.unit || "—"}</td>
                  {isOwner && (
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(ds)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" className="text-danger" onClick={() => remove(ds)}>
                        Delete
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Add datastream" : "Edit datastream"}>
        {editing !== null && (
          <DatastreamForm
            device={device}
            initial={editing === "new" ? null : editing}
            onSaved={(d) => {
              onChange(d);
              setEditing(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function nextFreePin(device: Device) {
  for (let i = 0; i <= 255; i++) if (!device.datastreams.some((d) => d.pin === `V${i}`)) return `V${i}`;
  return "V0";
}

function DatastreamForm({ device, initial, onSaved }: { device: Device; initial: Datastream | null; onSaved: (d: Device) => void }) {
  const [kind, setKind] = useState<DatastreamKind>(initial?.kind ?? "value");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const num = (k: string, d: number) => (f.get(k) === null || f.get(k) === "" ? d : Number(f.get(k)));
    const body = {
      name: f.get("name"),
      kind,
      min: kind === "switch" ? 0 : num("min", 0),
      max: kind === "switch" ? 1 : num("max", 100),
      step: kind === "slider" ? num("step", 1) : 1,
      unit: kind === "switch" ? "" : String(f.get("unit") ?? ""),
    };
    setLoading(true);
    setError(null);
    try {
      const r = initial
        ? await api<{ device: Device }>(`/api/devices/${device.id}/datastreams/${initial.pin}`, { method: "PATCH", body })
        : await api<{ device: Device }>(`/api/devices/${device.id}/datastreams`, { body: { ...body, pin: f.get("pin") } });
      onSaved(r.device);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid grid-cols-[110px_1fr] gap-3">
        <Field label="Pin">
          <Input name="pin" defaultValue={initial?.pin ?? nextFreePin(device)} disabled={!!initial} required pattern="[Vv]\d{1,3}" className="font-mono" />
        </Field>
        <Field label="Name">
          <Input name="name" defaultValue={initial?.name} required maxLength={60} placeholder="Temperature" autoFocus />
        </Field>
      </div>
      <Field label="Type" hint={KIND_HELP[kind]}>
        <Select value={kind} onChange={(e) => setKind(e.target.value as DatastreamKind)}>
          <option value="value">Value (sensor reading)</option>
          <option value="switch">Switch (on/off)</option>
          <option value="slider">Slider (number control)</option>
        </Select>
      </Field>
      {kind !== "switch" && (
        <div className="grid grid-cols-3 gap-3">
          <Field label="Min">
            <Input name="min" type="number" step="any" defaultValue={initial?.min ?? 0} />
          </Field>
          <Field label="Max">
            <Input name="max" type="number" step="any" defaultValue={initial?.max ?? 100} />
          </Field>
          {kind === "slider" ? (
            <Field label="Step">
              <Input name="step" type="number" step="any" min="0.0001" defaultValue={initial?.step ?? 1} />
            </Field>
          ) : (
            <Field label="Unit">
              <Input name="unit" maxLength={12} defaultValue={initial?.unit} placeholder="°C" />
            </Field>
          )}
        </div>
      )}
      {kind === "slider" && (
        <Field label="Unit" hint="Optional">
          <Input name="unit" maxLength={12} defaultValue={initial?.unit} />
        </Field>
      )}
      <ErrorText error={error} />
      <Button type="submit" loading={loading}>
        {initial ? "Save" : "Add datastream"}
      </Button>
    </form>
  );
}
