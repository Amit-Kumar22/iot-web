"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, timeAgo } from "@/lib/client/api";
import { applyRealtime } from "@/lib/client/apply-realtime";
import { useRealtime } from "@/lib/client/realtime";
import type { Device } from "@/lib/client/types";
import { useLiveOnline } from "@/lib/client/use-online";
import { Badge, Button, Empty, ErrorText, Spinner, StatusDot } from "@/components/ui";
import { Widget } from "@/components/device/Widget";
import { HistoryChart } from "@/components/device/HistoryChart";
import { DatastreamsPanel } from "@/components/device/DatastreamsPanel";
import { AutomationsPanel } from "@/components/device/AutomationsPanel";
import { SharingPanel } from "@/components/device/SharingPanel";
import { SetupPanel } from "@/components/device/SetupPanel";
import { ChevronLeft, Cpu } from "lucide-react";

const TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "datastreams", label: "Datastreams" },
  { id: "automations", label: "Automations" },
  { id: "sharing", label: "Sharing", ownerOnly: true },
  { id: "setup", label: "Setup" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export default function DevicePage() {
  const { id } = useParams<{ id: string }>();
  const [device, setDevice] = useState<Device | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Tab lives in ?tab= so links like /devices/x?tab=setup work. Tabs only render after the
  // device loads (spinner first), so reading `location` here can't cause a hydration mismatch.
  const [tab, setTabState] = useState<Tab>(() => {
    const t = typeof window === "undefined" ? null : new URLSearchParams(location.search).get("tab");
    return TABS.some((x) => x.id === t) ? (t as Tab) : "dashboard";
  });
  const [chartPin, setChartPin] = useState<string | null>(null);
  const setTab = (t: Tab) => {
    setTabState(t);
    const url = new URL(location.href);
    url.searchParams.set("tab", t);
    history.replaceState(null, "", url);
  };

  const load = useCallback(() => {
    api<{ device: Device }>(`/api/devices/${id}`)
      .then((r) => setDevice(r.device))
      .catch((e) => setError(e.message));
  }, [id]);
  useEffect(load, [load]);

  useRealtime(device ? [device.id] : [], (m) => {
    if (m.type === "reconnected") return load();
    setDevice((d) => d && applyRealtime(d, m));
  });

  if (error) return <ErrorText error={error} />;
  if (!device)
    return (
      <div className="flex justify-center py-16 text-muted">
        <Spinner />
      </div>
    );

  const tabs = TABS.filter((t) => !("ownerOnly" in t) || device.role === "owner");
  const chartable = device.datastreams.filter((d) => d.kind !== "switch");
  const charted = device.datastreams.find((d) => d.pin === chartPin) ?? chartable[0];

  return (
    <div className="flex flex-col gap-6">
      <Header device={device} />

      <div className="-mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition cursor-pointer ${
              tab === t.id ? "border-accent text-accent-text" : "border-transparent text-muted hover:border-border hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "dashboard" &&
        (device.datastreams.length === 0 ? (
          <Empty title="Nothing to show yet">
            Add datastreams (virtual pins) to get switches, sliders and value displays here.
            {device.role === "owner" && (
              <div className="mt-4">
                <Button onClick={() => setTab("datastreams")}>Add datastreams</Button>
              </div>
            )}
          </Empty>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {device.datastreams.map((ds) => (
                <Widget
                  key={ds.pin}
                  deviceId={device.id}
                  ds={ds}
                  canControl={device.role !== "viewer"}
                  selected={charted?.pin === ds.pin}
                  onSelect={() => setChartPin(ds.pin)}
                />
              ))}
            </div>
            {charted && <HistoryChart deviceId={device.id} ds={charted} liveTick={charted.updatedAt} />}
          </div>
        ))}
      {tab === "datastreams" && <DatastreamsPanel device={device} onChange={setDevice} />}
      {tab === "automations" && <AutomationsPanel device={device} />}
      {tab === "sharing" && <SharingPanel device={device} onChange={setDevice} />}
      {tab === "setup" && <SetupPanel device={device} onChange={setDevice} />}
    </div>
  );
}

function Header({ device }: { device: Device }) {
  const online = useLiveOnline(device);
  return (
    <div className="flex flex-col gap-4">
      <Link href="/dashboard" className="inline-flex w-fit items-center gap-1 text-sm font-medium text-muted hover:text-accent-text">
        <ChevronLeft className="size-4" aria-hidden /> All devices
      </Link>
      <div className="flex items-start gap-4">
        <span
          className={`grid size-12 shrink-0 place-items-center rounded-2xl sm:size-14 ${
            online ? "bg-accent text-white shadow-md shadow-accent/30" : "bg-card text-muted ring-1 ring-border"
          }`}
        >
          <Cpu className="size-6" aria-hidden />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="truncate text-2xl font-bold tracking-tight text-ink sm:text-3xl">{device.name}</h1>
            <StatusDot online={online} />
            {device.role !== "owner" && <Badge>shared · {device.role}</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted">
        {device.description && <>{device.description} · </>}
        {online ? (device.connected ? "Connected live" : "Polling over HTTP") : `Last seen ${timeAgo(device.lastSeen)}`}
          </p>
        </div>
      </div>
    </div>
  );
}
