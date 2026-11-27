import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  ChartLine,
  Check,
  Cpu,
  Lightbulb,
  Radio,
  ShieldCheck,
  Smartphone,
  Thermometer,
  Users,
  Workflow,
  Zap,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Year } from "@/components/ui";

const FEATURES = [
  { icon: Cpu, title: "Any hardware", body: "ESP32, ESP8266, Arduino with Wi-Fi, Raspberry Pi: anything that speaks MQTT, WebSocket or HTTP." },
  { icon: Zap, title: "Real-time control", body: "Switches and sliders reach the device instantly. Sensor values appear the moment they are sent." },
  { icon: ChartLine, title: "History & charts", body: "Every numeric reading is stored and charted, from the last hour to the last 30 days." },
  { icon: Workflow, title: "Automations", body: "“If temperature > 40 → notify me” or “→ turn the fan on”, running on the server 24/7." },
  { icon: Users, title: "Secure sharing", body: "Give family or teammates view-only or operator access to any device, by email." },
  { icon: Smartphone, title: "Mobile ready", body: "The same REST and WebSocket API powers this website and your Android or iOS app." },
];

const STEPS = [
  { title: "Create a device", body: "Pick a template (light, weather station, robot) or start blank. You get a private auth token." },
  { title: "Flash your board", body: "Paste the token into our ready-made ESP32 sketch, set your Wi-Fi and upload." },
  { title: "Control & monitor", body: "Your dashboard comes alive with switches, sliders, live readings and history charts." },
];

const STATS = [
  { value: "3", label: "Protocols: MQTT, WebSocket, HTTP" },
  { value: "256", label: "Virtual pins per device" },
  { value: "30 days", label: "Sensor history kept" },
  { value: "24/7", label: "Server-side automations" },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-card">
      {/* ------------------------------------------------------------ nav */}
      <header className="sticky top-0 z-30 border-b border-border/70 bg-card/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:gap-8 sm:px-6">
          <Logo height={26} className="[&_img]:!h-[20px] sm:[&_img]:!h-[26px]" />
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted md:flex" aria-label="Sections">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#how" className="hover:text-foreground">How it works</a>
            <a href="#developers" className="hover:text-foreground">Developers</a>
          </nav>
          <div className="ml-auto flex items-center gap-1 whitespace-nowrap sm:gap-2">
            <Link href="/login" className="rounded-lg px-2.5 py-2 text-sm font-semibold text-ink hover:bg-background sm:px-4">
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-accent/30 transition hover:bg-accent-hover sm:px-4"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ------------------------------------------------------------ hero */}
        <section className="relative overflow-hidden">
          <div className="brand-glow pointer-events-none absolute inset-0" />
          <div className="grid-pattern pointer-events-none absolute inset-0 opacity-60" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 pb-20 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-[1.1fr_1fr] lg:pb-28">
            <div className="flex flex-col items-start gap-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-text">
                <span className="size-1.5 rounded-full bg-accent" />
                IoT platform for makers, schools & industry
              </span>
              <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-6xl">
                Control every device from <span className="text-accent">one dashboard.</span>
              </h1>
              <p className="max-w-xl text-lg leading-relaxed text-muted">
                Connect your ESP32 in minutes and get a live dashboard with switches, sliders, sensor charts, automations and secure sharing.
              </p>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-accent/30 transition hover:bg-accent-hover"
                >
                  Create free account <ArrowRight className="size-4" aria-hidden />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-6 py-3.5 text-sm font-semibold text-ink shadow-card transition hover:border-charcoal/30"
                >
                  Log in to dashboard
                </Link>
              </div>
              <ul className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-sm text-muted">
                {["Free to start", "No cloud lock-in", "Open REST API"].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <Check className="size-4 text-accent" aria-hidden /> {t}
                  </li>
                ))}
              </ul>
            </div>

            <DashboardPreview />
          </div>
        </section>

        {/* ------------------------------------------------------------ stats */}
        <section className="border-y border-border bg-background">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px px-4 sm:px-6 lg:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="px-2 py-8 text-center sm:py-10">
                <p className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{s.value}</p>
                <p className="mt-1 text-sm text-muted">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------------ features */}
        <section id="features" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6 sm:py-28">
          <SectionHeading
            eyebrow="Features"
            title="Everything you need to run connected devices"
            body="From a single smart bulb to a classroom full of robots, HiProTech gives you the tools to build, monitor and automate."
          />
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-border bg-card p-6 shadow-card transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lift"
              >
                <span className="grid size-11 place-items-center rounded-xl bg-accent-soft text-accent transition group-hover:bg-accent group-hover:text-white">
                  <f.icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-ink">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------------ how it works */}
        <section id="how" className="scroll-mt-20 border-y border-border bg-background">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
            <SectionHeading eyebrow="How it works" title="Up and running in three steps" />
            <ol className="mt-14 grid gap-6 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.title} className="relative rounded-2xl border border-border bg-card p-7 shadow-card">
                  <span className="grid size-10 place-items-center rounded-full bg-ink text-sm font-bold text-white ring-4 ring-accent-soft">
                    {i + 1}
                  </span>
                  <h3 className="mt-5 text-lg font-semibold text-ink">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ------------------------------------------------------------ developers */}
        <section id="developers" className="mx-auto grid max-w-7xl scroll-mt-20 items-center gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-2">
          <div>
            <SectionHeading
              align="left"
              eyebrow="For developers"
              title="One token. Three ways to connect."
              body="Use MQTT for instant two-way control, WebSocket for live apps, or plain HTTP for the simplest sketches. Every protocol shares the same live state."
            />
            <ul className="mt-8 flex flex-col gap-4">
              {[
                { icon: Radio, t: "MQTT broker built in", d: "Publish up/V1, subscribe down/#. Values restore after a reboot." },
                { icon: ShieldCheck, t: "Private per-device tokens", d: "Regenerate a token to instantly disconnect old hardware." },
                { icon: BellRing, t: "Live notifications", d: "Automation alerts are pushed to the website and your phone." },
              ].map((x) => (
                <li key={x.t} className="flex gap-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                    <x.icon className="size-5" aria-hidden />
                  </span>
                  <span>
                    <span className="block font-semibold text-ink">{x.t}</span>
                    <span className="block text-sm text-muted">{x.d}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="overflow-hidden rounded-2xl border border-ink/10 bg-ink shadow-lift">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
              <span className="size-3 rounded-full bg-[#ff5f57]" />
              <span className="size-3 rounded-full bg-[#febc2e]" />
              <span className="size-3 rounded-full bg-[#28c840]" />
              <span className="ml-3 text-xs text-white/50">esp32_http.ino</span>
            </div>
            <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-relaxed text-white/80">
              <code>
                <span className="text-white/40">{"// Send a temperature reading every 5 s\n"}</span>
                <span className="text-accent">{"float"}</span>
                {" t = dht.readTemperature();\n"}
                <span className="text-accent">{"String"}</span>
                {" url = SERVER + "}
                <span className="text-[#9fe2a3]">{'"/api/external/update"'}</span>
                {"\n      + "}
                <span className="text-[#9fe2a3]">{'"?token="'}</span>
                {" + TOKEN + "}
                <span className="text-[#9fe2a3]">{'"&V1="'}</span>
                {" + t;\n"}
                {"http.begin(url);\n"}
                {"http.GET();   "}
                <span className="text-white/40">{"// shows up live on your dashboard"}</span>
              </code>
            </pre>
          </div>
        </section>

        {/* ------------------------------------------------------------ CTA */}
        <section className="px-4 pb-20 sm:px-6 sm:pb-28">
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-gradient-to-br from-accent to-accent-hover px-6 py-14 text-center shadow-lift sm:px-12 sm:py-20">
            <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -bottom-24 -left-16 size-72 rounded-full bg-white/10" />
            <h2 className="relative text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Ready to connect your first device?</h2>
            <p className="relative mx-auto mt-4 max-w-xl text-base text-white/90">
              Create a free account and have your ESP32 reporting to a live dashboard in under ten minutes.
            </p>
            <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-accent-text shadow-lg transition hover:bg-accent-soft"
              >
                Get started free <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl border border-white/40 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                I already have an account
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ------------------------------------------------------------ footer */}
      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 py-10 sm:flex-row sm:px-6">
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <Logo height={22} />
            <p className="text-xs text-muted">Robotics, IoT & automation solutions.</p>
          </div>
          <nav className="flex flex-wrap justify-center gap-6 text-sm text-muted" aria-label="Footer">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#how" className="hover:text-foreground">How it works</a>
            <Link href="/login" className="hover:text-foreground">Log in</Link>
            <Link href="/signup" className="hover:text-foreground">Sign up</Link>
          </nav>
          <p className="text-xs text-muted">
            © <Year /> HiProTech. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  body,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  body?: string;
  align?: "center" | "left";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-xl"}>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent-text">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{title}</h2>
      {body && <p className="mt-4 text-base leading-relaxed text-muted">{body}</p>}
    </div>
  );
}

/** Static mock of the dashboard for the hero (pure markup, no data). */
function DashboardPreview() {
  const bars = [38, 44, 41, 52, 49, 60, 57, 66, 62, 71, 68, 75];
  return (
    <div className="relative mx-auto w-full max-w-lg lg:max-w-none" aria-hidden>
      <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-accent/25 via-accent/5 to-transparent blur-2xl" />
      <div className="relative rounded-3xl border border-border bg-card p-5 shadow-lift sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted">Living room</p>
            <p className="text-lg font-bold text-ink">Smart Home ESP32</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
            <span className="size-1.5 rounded-full bg-success" /> Online
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-background p-4">
            <div className="flex items-center justify-between text-muted">
              <span className="text-xs font-medium">Light</span>
              <Lightbulb className="size-4 text-accent" />
            </div>
            <div className="mt-3 flex h-10 items-center justify-center rounded-xl bg-accent text-sm font-bold text-white shadow-sm shadow-accent/40">
              ON
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4">
            <div className="flex items-center justify-between text-muted">
              <span className="text-xs font-medium">Temperature</span>
              <Thermometer className="size-4 text-accent" />
            </div>
            <p className="mt-3 font-mono text-2xl font-bold tabular-nums text-ink">
              26.4<span className="text-base text-muted"> °C</span>
            </p>
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-border bg-background p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Temperature · last 12 h</span>
            <span className="text-xs font-semibold text-success">▲ 2.1 °C</span>
          </div>
          <div className="mt-4 flex h-24 items-end gap-1.5">
            {bars.map((h, i) => (
              <div
                key={i}
                className={`flex-1 rounded-t-md ${i === bars.length - 1 ? "bg-accent" : "bg-accent/25"}`}
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-accent/30 bg-accent-soft p-3">
          <span className="grid size-8 place-items-center rounded-lg bg-accent text-white">
            <BellRing className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-ink">Automation fired</p>
            <p className="truncate text-xs text-muted">Temperature above 30 °C → fan turned on</p>
          </div>
        </div>
      </div>
    </div>
  );
}
