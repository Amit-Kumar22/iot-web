import Link from "next/link";

const FEATURES = [
  ["Any hardware", "ESP32, ESP8266, Arduino with Wi-Fi, Raspberry Pi: anything that speaks MQTT, WebSocket or HTTP."],
  ["Live control", "Switches and sliders reach the device instantly; sensor values show up the moment they're sent."],
  ["History charts", "Every numeric reading is stored, with 1 hour to 30 day charts."],
  ["Automations", "“If temperature > 40 → notify me” or “→ turn the fan on”, run on the server 24/7."],
  ["Sharing", "Give family or teammates view-only or control access to a device."],
  ["Open API", "The same REST + WebSocket API powers this site and can power your mobile app."],
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5">
        <span className="flex items-center gap-2 font-semibold">
          <span className="grid size-8 place-items-center rounded-lg bg-accent text-xs font-bold text-accent-fg">IoT</span>
          IoT Platform
        </span>
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/login" className="rounded-lg px-3 py-2 font-medium text-muted hover:text-foreground">
            Log in
          </Link>
          <Link href="/signup" className="rounded-lg bg-accent px-4 py-2 font-medium text-accent-fg hover:opacity-90">
            Get started
          </Link>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-16 px-4 py-16">
        <section className="flex max-w-2xl flex-col gap-5">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Control your devices from anywhere.</h1>
          <p className="text-lg text-muted">
            Create a device, flash the token onto your ESP32, and get a live dashboard with switches, sliders, sensor charts, alerts and sharing.
          </p>
          <div className="flex gap-3">
            <Link href="/signup" className="rounded-lg bg-accent px-5 py-3 text-sm font-medium text-accent-fg hover:opacity-90">
              Create free account
            </Link>
            <Link href="/login" className="rounded-lg border border-border bg-card px-5 py-3 text-sm font-medium hover:bg-background">
              Log in
            </Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([title, body]) => (
            <div key={title} className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-1 font-semibold">{title}</h2>
              <p className="text-sm text-muted">{body}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
