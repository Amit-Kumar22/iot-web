"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api, timeAgo } from "@/lib/client/api";
import { applyRealtime, formatValue } from "@/lib/client/apply-realtime";
import { useRealtime } from "@/lib/client/realtime";
import type { Datastream, Device } from "@/lib/client/types";
import { useLiveOnline } from "@/lib/client/use-online";
import { Badge, Button, Card, Empty, ErrorText, Field, Input, Modal, Select, Spinner, StatusDot } from "@/components/ui";

type Preset = { label: string; datastreams: Partial<Datastream>[] };
const PRESETS: Record<string, Preset> = {
  blank: { label: "Blank (add datastreams later)", datastreams: [] },
  light: { label: "Smart light / relay", datastreams: [{ pin: "V0", name: "Light", kind: "switch" }] },
  weather: {
    label: "Weather station",
    datastreams: [
      { pin: "V1", name: "Temperature", kind: "value", unit: "°C", min: -20, max: 60 },
      { pin: "V2", name: "Humidity", kind: "value", unit: "%", min: 0, max: 100 },
    ],
  },
  robot: {
    label: "Robot / motor",
    datastreams: [
      { pin: "V0", name: "Power", kind: "switch" },
      { pin: "V1", name: "Speed", kind: "slider", min: 0, max: 255 },
      { pin: "V2", name: "Battery", kind: "value", unit: "%" },
    ],
  },
};

export default function DashboardPage() {
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    api<{ devices: Device[] }>("/api/devices")
      .then((r) => setDevices(r.devices))
      .catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  useRealtime(devices?.map((d) => d.id) ?? [], (m) => {
    if (m.type === "reconnected") return load();
    setDevices((list) => list && list.map((d) => applyRealtime(d, m)));
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Devices</h1>
          <p className="text-sm text-muted">Live status and values of everything you own or that was shared with you.</p>
        </div>
        <Button onClick={() => setAdding(true)}>+ New device</Button>
      </div>

      <ErrorText error={error} />
      {!devices && !error && (
        <div className="flex justify-center py-16 text-muted">
          <Spinner />
        </div>
      )}
      {devices?.length === 0 && (
        <Empty title="No devices yet">
          Create a device to get an auth token, then flash the sample ESP32 code. Values will show up here live.
          <div className="mt-4">
            <Button onClick={() => setAdding(true)}>Create your first device</Button>
          </div>
        </Empty>
      )}
      {devices && devices.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {devices.map((d) => (
            <DeviceCard key={d.id} device={d} />
          ))}
        </div>
      )}

      <Modal open={adding} onClose={() => setAdding(false)} title="New device">
        <NewDeviceForm />
      </Modal>
    </div>
  );
}

function DeviceCard({ device: d }: { device: Device }) {
  const online = useLiveOnline(d);
  return (
    <Link href={`/devices/${d.id}`} className="group">
      <Card className="flex h-full flex-col gap-4 p-4 transition group-hover:border-accent/60">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate font-semibold">{d.name}</h2>
            <p className="text-xs text-muted">{online ? "Online" : `Last seen ${timeAgo(d.lastSeen)}`}</p>
          </div>
          <div className="flex items-center gap-2">
            {d.role !== "owner" && <Badge>{d.role}</Badge>}
            <StatusDot online={online} label={false} />
          </div>
        </div>
        {d.datastreams.length === 0 ? (
          <p className="text-sm text-muted">No datastreams yet</p>
        ) : (
          <dl className="grid grid-cols-2 gap-2">
            {d.datastreams.slice(0, 4).map((ds) => (
              <div key={ds.pin} className="rounded-lg bg-background px-3 py-2">
                <dt className="truncate text-xs text-muted">{ds.name}</dt>
                <dd className="font-mono text-sm font-medium tabular-nums">
                  {ds.kind === "switch" ? (ds.value === 1 ? "ON" : ds.value === 0 ? "OFF" : "—") : formatValue(ds.value, ds.unit)}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </Card>
    </Link>
  );
}

function NewDeviceForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const { device } = await api<{ device: Device }>("/api/devices", {
        body: {
          name: f.get("name"),
          description: f.get("description") || "",
          datastreams: PRESETS[String(f.get("preset"))].datastreams,
        },
      });
      router.push(`/devices/${device.id}?tab=setup`);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Name">
        <Input name="name" required maxLength={80} placeholder="Living room ESP32" autoFocus />
      </Field>
      <Field label="Description" hint="Optional">
        <Input name="description" maxLength={300} />
      </Field>
      <Field label="Start from" hint="Adds ready-made datastreams. You can change them any time.">
        <Select name="preset" defaultValue="blank">
          {Object.entries(PRESETS).map(([k, p]) => (
            <option key={k} value={k}>
              {p.label}
            </option>
          ))}
        </Select>
      </Field>
      <ErrorText error={error} />
      <Button type="submit" loading={loading}>
        Create device
      </Button>
    </form>
  );
}
