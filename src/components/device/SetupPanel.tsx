"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { API_URL, api } from "@/lib/client/api";
import type { Device } from "@/lib/client/types";
import { Button, Card, CopyField, ErrorText, Field, Input } from "@/components/ui";

const MQTT_PORT = process.env.NEXT_PUBLIC_MQTT_PORT || "1883";
type Proto = "mqtt" | "http" | "ws";

export function SetupPanel({ device, onChange }: { device: Device; onChange: (d: Device) => void }) {
  // Only rendered client-side (after the device loads), so `location` is available.
  const [base] = useState(() => API_URL || (typeof window === "undefined" ? "" : location.origin));
  const [proto, setProto] = useState<Proto>("mqtt");
  const [error, setError] = useState<string | null>(null);
  const token = device.token ?? "";
  const host = base ? new URL(base).hostname : "SERVER_IP";
  const httpPort = base ? new URL(base).port || (base.startsWith("https") ? "443" : "80") : "5010";
  const firstPin = device.datastreams[0]?.pin ?? "V0";

  async function regenerate() {
    if (!confirm("Generate a new token? Devices using the old token are disconnected and must be re-flashed.")) return;
    try {
      const r = await api<{ token: string }>(`/api/devices/${device.id}/token`, { method: "POST" });
      onChange({ ...device, token: r.token, connected: false, online: false });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const snippets: Record<Proto, { title: string; body: string }> = {
    mqtt: {
      title: "MQTT (recommended: instant, two-way)",
      body: `Host:      ${host}
Port:      ${MQTT_PORT}
Username:  device          (anything)
Password:  ${token}

Send a value     publish   up/${firstPin}        payload: 23.5
Receive values   subscribe down/#
                 messages arrive on  dev/${device.id}/down/V0  payload: 1
                 (the pin is the part after the last "/")

After subscribing, the server sends every current value once,
so the device restores its state after a reboot.`,
    },
    http: {
      title: "HTTP (simplest: poll every few seconds)",
      body: `# Send values (device → server)
curl "${base}/api/external/update?token=${token}&${firstPin}=23.5"

# Read one value (server → device), returns plain text e.g. 1
curl "${base}/api/external/get?token=${token}&${firstPin}"

# Read all values as JSON
curl "${base}/api/external/get?token=${token}"

A device that polls counts as online for 60s after its last request.`,
    },
    ws: {
      title: "WebSocket (instant, two-way)",
      body: `URL:  ${base.replace(/^http/, "ws")}/ws/device?token=${token}

Send     {"pin":"${firstPin}","value":23.5}     or  {"V1":23.5,"V2":1}
Receive  {"pin":"V0","value":1}

On connect the server sends every current value once.`,
    },
  };

  return (
    <div className="flex flex-col gap-6">
      {device.role === "owner" && (
        <Card className="flex flex-col gap-3 p-4">
          <div>
            <h3 className="font-semibold">Auth token</h3>
            <p className="text-sm text-muted">Put this in your device firmware. Anyone with this token can act as the device, so keep it private.</p>
          </div>
          <CopyField value={token} />
          <div>
            <Button variant="secondary" size="sm" onClick={regenerate}>
              Generate new token
            </Button>
          </div>
          <ErrorText error={error} />
        </Card>
      )}

      <Card className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">Connect your hardware</h3>
          <div className="flex rounded-lg border border-border p-0.5">
            {(["mqtt", "http", "ws"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setProto(p)}
                className={`rounded-md px-3 py-1 text-xs font-medium uppercase cursor-pointer ${p === proto ? "bg-accent text-accent-fg" : "text-muted hover:text-foreground"}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <p className="mb-2 text-sm text-muted">{snippets[proto].title}</p>
        <pre className="overflow-x-auto rounded-lg bg-background p-4 font-mono text-xs leading-relaxed">{snippets[proto].body}</pre>
        <p className="mt-3 text-xs text-muted">
          Ready-to-flash ESP32 sketches are in the <code className="font-mono">firmware/</code> folder of this project. Set{" "}
          <code className="font-mono">SERVER_HOST = &quot;{host}&quot;</code>, <code className="font-mono">HTTP_PORT = {httpPort}</code>, your Wi-Fi and the token above.
        </p>
      </Card>

      {device.role === "owner" && <DangerZone device={device} onChange={onChange} />}
    </div>
  );
}

function DangerZone({ device, onChange }: { device: Device; onChange: (d: Device) => void }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function rename(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setSaving(true);
    try {
      const r = await api<{ device: Device }>(`/api/devices/${device.id}`, {
        method: "PATCH",
        body: { name: f.get("name"), description: f.get("description") },
      });
      onChange(r.device);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete "${device.name}" with all its history and automations? This cannot be undone.`)) return;
    try {
      await api(`/api/devices/${device.id}`, { method: "DELETE" });
      router.replace("/dashboard");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <Card className="flex flex-col gap-4 p-4">
      <h3 className="font-semibold">Device settings</h3>
      <form onSubmit={rename} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label="Name">
          <Input name="name" required maxLength={80} defaultValue={device.name} />
        </Field>
        <Field label="Description">
          <Input name="description" maxLength={300} defaultValue={device.description} />
        </Field>
        <Button type="submit" variant="secondary" loading={saving}>
          Save
        </Button>
      </form>
      <ErrorText error={error} />
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-sm text-muted">Deleting removes the device, its history, automations and shares.</p>
        <Button variant="danger" onClick={remove}>
          Delete device
        </Button>
      </div>
    </Card>
  );
}
