"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api, timeAgo } from "@/lib/client/api";
import { applyRealtime, formatValue } from "@/lib/client/apply-realtime";
import { useRealtime } from "@/lib/client/realtime";
import type { Datastream, Device } from "@/lib/client/types";
import { useLiveOnline } from "@/lib/client/use-online";
import { Badge, Button, Card, Empty, ErrorText, Field, Input, Modal, PageHeader, Select, Spinner, StatusDot } from "@/components/ui";
import { Activity, Cpu, Plus, WifiOff } from "lucide-react";

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
      <PageHeader
        title="Devices"
        subtitle="Live status and values of everything you own or that was shared with you."
        action={
          <Button onClick={() => setAdding(true)} className="w-full sm:w-auto">
            <Plus className="size-4" aria-hidden /> New device
          </Button>
        }
      />
      {devices && devices.length > 0 && <Summary devices={devices} />}

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
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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

function Summary({ devices }: { devices: Device[] }) {
  const online = devices.filter((d) => d.online).length;
  const items = [
    { label: "Total devices", value: devices.length, icon: Cpu, tone: "bg-accent-soft text-accent" },
    { label: "Online", value: online, icon: Activity, tone: "bg-success/10 text-success" },
    { label: "Offline", value: devices.length - online, icon: WifiOff, tone: "bg-background text-muted" },
  ];
  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-4">
      {items.map((i) => (
        <Card key={i.label} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
          <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${i.tone}`}>
            <i.icon className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-2xl font-bold tabular-nums text-ink">{i.value}</p>
            <p className="text-xs text-muted">{i.label}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}

function DeviceCard({ device: d }: { device: Device }) {
  const online = useLiveOnline(d);
  return (
    <Link href={`/devices/${d.id}`} className="group rounded-2xl">
      <Card className="flex h-full flex-col gap-4 p-5 transition group-hover:-translate-y-0.5 group-hover:border-accent/50 group-hover:shadow-lift">
        <div className="flex items-start gap-3">
          <span
            className={`grid size-11 shrink-0 place-items-center rounded-xl transition ${
              online ? "bg-accent text-white shadow-sm shadow-accent/40" : "bg-background text-muted"
            }`}
          >
            <Cpu className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-semibold text-ink">{d.name}</h2>
            <p className="truncate text-xs text-muted">{online ? "Online now" : `Last seen ${timeAgo(d.lastSeen)}`}</p>
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
              <div key={ds.pin} className="rounded-xl border border-border bg-surface px-3 py-2.5">
                <dt className="truncate text-xs text-muted">{ds.name}</dt>
                <dd
                  className={`font-mono text-sm font-semibold tabular-nums ${
                    ds.kind === "switch" && ds.value === 1 ? "text-accent-text" : "text-ink"
                  }`}
                >
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
