"use client";

import { useState, type FormEvent } from "react";
import { api } from "@/lib/client/api";
import type { Device, Share } from "@/lib/client/types";
import { Button, Card, Empty, ErrorText, Field, Input, Select } from "@/components/ui";

export function SharingPanel({ device, onChange }: { device: Device; onChange: (d: Device) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const shares = device.shares ?? [];

  async function share(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setLoading(true);
    setError(null);
    try {
      const r = await api<{ device: Device }>(`/api/devices/${device.id}/shares`, { body: { email: f.get("email"), role: f.get("role") } });
      onChange(r.device);
      form.reset();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function setRole(s: Share, role: string) {
    try {
      const r = await api<{ device: Device }>(`/api/devices/${device.id}/shares`, { body: { email: s.email, role } });
      onChange(r.device);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function remove(s: Share) {
    try {
      await api(`/api/devices/${device.id}/shares/${s.userId}`, { method: "DELETE" });
      onChange({ ...device, shares: shares.filter((x) => x.userId !== s.userId) });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <form onSubmit={share} className="flex flex-wrap items-end gap-3">
          <Field label="Share with (email)" className="min-w-56 flex-1">
            <Input name="email" type="email" required placeholder="friend@example.com" />
          </Field>
          <Field label="Access">
            <Select name="role" defaultValue="viewer">
              <option value="viewer">Viewer: can see</option>
              <option value="operator">Operator: can control</option>
            </Select>
          </Field>
          <Button type="submit" loading={loading}>
            Share
          </Button>
        </form>
        <p className="mt-3 text-xs text-muted">They need an account first. Only you can edit datastreams, automations, the token, or delete the device.</p>
      </Card>
      <ErrorText error={error} />
      {shares.length === 0 ? (
        <Empty title="Not shared with anyone" />
      ) : (
        <Card>
          {shares.map((s) => (
            <div key={s.userId} className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{s.name ?? "Unknown user"}</p>
                <p className="text-sm text-muted">{s.email}</p>
              </div>
              <Select value={s.role} onChange={(e) => setRole(s, e.target.value)} className="w-36">
                <option value="viewer">Viewer</option>
                <option value="operator">Operator</option>
              </Select>
              <Button size="sm" variant="danger" onClick={() => remove(s)}>
                Remove
              </Button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
