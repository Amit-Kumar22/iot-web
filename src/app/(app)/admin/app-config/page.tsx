"use client";

import { useEffect, useState } from "react";
import { api, timeAgo } from "@/lib/client/api";
import type { AppConfigResponse, ApplianceConfig } from "@/lib/client/types";
import { APPLIANCE_ICON_NAMES } from "@/lib/appliance-icons";
import { ApplianceIcon } from "@/components/ApplianceIcon";
import { Button, Card, ErrorText, Field, Input, Modal, Spinner } from "@/components/ui";

type Row = ApplianceConfig & { key: number; idTouched: boolean };
let nextKey = 1;
const toRow = (a: ApplianceConfig): Row => ({ ...a, key: nextKey++, idTouched: true });
const slug = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);

export default function AppConfigPage() {
  const [config, setConfig] = useState<AppConfigResponse | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [saved, setSaved] = useState("[]");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState<number | null>(null);

  useEffect(() => {
    api<AppConfigResponse>("/api/app-config")
      .then((c) => {
        setConfig(c);
        setRows(c.appliances.map(toRow));
        setSaved(JSON.stringify(c.appliances));
      })
      .catch((e) => setError(e.message));
  }, []);

  const clean = rows.map(({ id, name, icon, paths, altNames }) => ({ id, name, icon, paths, altNames }));
  const dirty = JSON.stringify(clean) !== saved;

  const update = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const move = (i: number, d: -1 | 1) =>
    setRows((rs) => {
      const j = i + d;
      if (j < 0 || j >= rs.length) return rs;
      const copy = [...rs];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  function add() {
    setRows((rs) => [
      ...rs,
      { key: nextKey++, idTouched: false, id: "", name: "", icon: "plug", paths: { on: "", off: "" }, altNames: [] },
    ]);
  }

  async function save() {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const c = await api<AppConfigResponse>("/api/admin/app-config", {
        method: "PUT",
        body: {
          appliances: clean.map((a) => ({ id: a.id, name: a.name, icon: a.icon, on: a.paths.on, off: a.paths.off, altNames: a.altNames })),
        },
      });
      setConfig(c);
      setRows(c.appliances.map(toRow));
      setSaved(JSON.stringify(c.appliances));
      setNotice(`Saved as version ${c.version}. Apps pick it up the next time they open with internet.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!config && !error)
    return (
      <div className="flex justify-center py-16 text-muted">
        <Spinner />
      </div>
    );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">App config · Home Automation</h1>
          <p className="max-w-2xl text-sm text-muted">
            The buttons shown in the mobile app&apos;s Home Automation screen (ESP32 control box over its Wi-Fi hotspot). Changes reach every
            app without a new APK: the app downloads this list when it opens with internet and keeps it for offline use.
          </p>
          {config && (
            <p className="mt-1 text-xs text-muted">
              {config.version === 0 ? "Using the app's built-in defaults (never saved)" : `Version ${config.version} · saved ${timeAgo(config.updatedAt)}`}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={add} disabled={rows.length >= 50}>
            + Add appliance
          </Button>
          <Button onClick={save} loading={saving} disabled={!dirty}>
            Save &amp; publish
          </Button>
        </div>
      </div>

      <ErrorText error={error} />
      {notice && <p className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">{notice}</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-3">
          {rows.length === 0 && <p className="text-sm text-muted">No appliances. The app will show an empty panel.</p>}
          {rows.map((r, i) => (
            <Card key={r.key} className="flex flex-col gap-3 p-4">
              <div className="flex items-end gap-3">
                <button
                  type="button"
                  onClick={() => setPicking(r.key)}
                  className="grid size-10 shrink-0 place-items-center rounded-lg border border-border bg-background hover:border-accent cursor-pointer"
                  aria-label={`Icon: ${r.icon}. Change icon`}
                  title="Change icon"
                >
                  <ApplianceIcon name={r.icon} />
                </button>
                <Field label="Name" className="flex-1">
                  <Input
                    value={r.name}
                    maxLength={40}
                    placeholder="Socket"
                    onChange={(e) => update(r.key, { name: e.target.value, ...(r.idTouched ? {} : { id: slug(e.target.value) }) })}
                  />
                </Field>
                <Field label="ID" className="w-36">
                  <Input
                    value={r.id}
                    maxLength={32}
                    className="font-mono"
                    placeholder="socket"
                    onChange={(e) => update(r.key, { id: e.target.value.toLowerCase(), idTouched: true })}
                  />
                </Field>
                <div className="flex shrink-0 gap-1">
                  <Button size="sm" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">
                    ↑
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="Move down">
                    ↓
                  </Button>
                  <Button size="sm" variant="ghost" className="text-danger" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>
                    Remove
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="ON path">
                  <Input
                    value={r.paths.on}
                    className="font-mono"
                    placeholder={`/${r.id || "socket"}/on`}
                    onChange={(e) => update(r.key, { paths: { ...r.paths, on: e.target.value } })}
                  />
                </Field>
                <Field label="OFF path">
                  <Input
                    value={r.paths.off}
                    className="font-mono"
                    placeholder={`/${r.id || "socket"}/off`}
                    onChange={(e) => update(r.key, { paths: { ...r.paths, off: e.target.value } })}
                  />
                </Field>
                <Field label="Other route names" hint="Optional, comma-separated. Tried on HTTP 404.">
                  <Input
                    value={r.altNames.join(", ")}
                    className="font-mono"
                    placeholder="socket1, plug"
                    onChange={(e) =>
                      update(r.key, {
                        altNames: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </Field>
              </div>
              <p className="text-xs text-muted">
                ID is also the key read from the box&apos;s optional <code className="font-mono">/status</code> JSON, e.g.{" "}
                <code className="font-mono">{`{"${r.id || "socket"}":1}`}</code>.
              </p>
            </Card>
          ))}
        </div>

        <div className="lg:sticky lg:top-20 lg:self-start">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">App preview</p>
          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-card p-3">
            {rows.map((r, i) => (
              <div
                key={r.key}
                className={`flex min-h-28 flex-col justify-between rounded-xl border p-3 ${i === 0 ? "border-[#F28735] bg-[#F28735] text-white" : "border-border bg-background"}`}
              >
                <ApplianceIcon name={r.icon} size={24} />
                <div>
                  <p className="truncate text-sm font-semibold">{r.name || "Untitled"}</p>
                  <p className="text-xs font-bold opacity-80">{i === 0 ? "ON" : "OFF"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal open={picking !== null} onClose={() => setPicking(null)} title="Choose an icon">
        <div className="grid grid-cols-6 gap-2">
          {APPLIANCE_ICON_NAMES.map((name) => {
            const current = rows.find((r) => r.key === picking)?.icon === name;
            return (
              <button
                key={name}
                type="button"
                title={name}
                aria-label={name}
                onClick={() => {
                  if (picking !== null) update(picking, { icon: name });
                  setPicking(null);
                }}
                className={`grid aspect-square place-items-center rounded-lg border cursor-pointer hover:border-accent ${current ? "border-accent bg-accent/10" : "border-border"}`}
              >
                <ApplianceIcon name={name} size={22} />
              </button>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}
