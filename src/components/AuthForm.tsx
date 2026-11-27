"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { api, getToken, setToken } from "@/lib/client/api";
import { ChartLine, ShieldCheck, Zap } from "lucide-react";
import { Logo } from "./Logo";
import { Button, ErrorText, Field, Input, Year } from "./ui";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isSignup = mode === "signup";

  // Already logged in → straight to the dashboard.
  useEffect(() => {
    if (getToken()) router.replace("/dashboard");
  }, [router]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setLoading(true);
    setError(null);
    try {
      const { token } = await api<{ token: string }>(`/api/auth/${mode}`, {
        body: { email: f.get("email"), password: f.get("password"), ...(isSignup ? { name: f.get("name") } : {}) },
      });
      setToken(token);
      const next = new URLSearchParams(location.search).get("next");
      router.replace(next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <div className="grid flex-1 lg:grid-cols-[1.05fr_1fr]">
      <BrandPanel />

      <div className="relative flex flex-col bg-card">
        <div className="flex items-center justify-between px-6 py-5 sm:px-10">
          <Logo height={24} className="lg:invisible" />
          <Link href="/" className="text-sm font-medium text-muted hover:text-foreground">
            ← Back to home
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 pb-16 pt-4 sm:px-10">
          <div className="w-full max-w-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent-text">
              {isSignup ? "Get started" : "Welcome back"}
            </p>
            <h1 className="mb-2 text-3xl font-bold tracking-tight text-ink">
              {isSignup ? "Create your account" : "Log in to your account"}
            </h1>
            <p className="mb-8 text-sm text-muted">
              {isSignup
                ? "Set up your first device in minutes. No credit card needed."
                : "Monitor and control your devices from anywhere."}
            </p>

            <form onSubmit={submit} className="flex flex-col gap-4">
              {isSignup && (
                <Field label="Full name">
                  <Input name="name" required autoComplete="name" placeholder="Your name" className="h-11" />
                </Field>
              )}
              <Field label="Email address">
                <Input name="email" type="email" required autoComplete="email" placeholder="you@example.com" className="h-11" />
              </Field>
              <Field label="Password" hint={isSignup ? "At least 8 characters" : undefined}>
                <Input
                  name="password"
                  type="password"
                  required
                  minLength={isSignup ? 8 : undefined}
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  placeholder="••••••••"
                  className="h-11"
                />
              </Field>
              <ErrorText error={error} />
              <Button type="submit" loading={loading} className="mt-2 h-11">
                {isSignup ? "Create account" : "Log in"}
              </Button>
            </form>

            <p className="mt-8 text-center text-sm text-muted">
              {isSignup ? "Already have an account? " : "New to HiProTech? "}
              <Link href={isSignup ? "/login" : "/signup"} className="font-semibold text-accent-text hover:underline">
                {isSignup ? "Log in" : "Create an account"}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const POINTS = [
  { icon: Zap, title: "Instant control", body: "Switches and sliders reach your ESP32 in milliseconds." },
  { icon: ChartLine, title: "Live sensor data", body: "Every reading is stored and charted for up to 30 days." },
  { icon: ShieldCheck, title: "Private by design", body: "Per-device tokens and role-based sharing keep you in control." },
];

function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col">
      <div className="pointer-events-none absolute -right-32 -top-32 size-[420px] rounded-full bg-accent/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-24 size-[360px] rounded-full bg-accent/15 blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      <div className="relative">
        <span className="inline-flex rounded-xl bg-white px-4 py-2.5 shadow-lift">
          <Logo height={26} />
        </span>
      </div>

      <div className="relative mt-auto max-w-md">
        <h2 className="text-4xl font-bold leading-tight tracking-tight">
          Your devices. <span className="text-accent">One dashboard.</span>
        </h2>
        <p className="mt-4 text-base text-white/70">
          Connect ESP32, ESP8266 and Arduino boards over MQTT, WebSocket or HTTP and manage them all in one place.
        </p>
        <ul className="mt-10 flex flex-col gap-6">
          {POINTS.map((p) => (
            <li key={p.title} className="flex gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent ring-1 ring-accent/30">
                <p.icon className="size-5" aria-hidden />
              </span>
              <span>
                <span className="block font-semibold">{p.title}</span>
                <span className="block text-sm text-white/60">{p.body}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative mt-12 text-xs text-white/40">© <Year /> HiProTech</p>
    </aside>
  );
}
