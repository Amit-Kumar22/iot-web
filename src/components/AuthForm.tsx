"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { api, getToken, setToken } from "@/lib/client/api";
import { Button, Card, ErrorText, Field, Input } from "./ui";

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
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2 font-semibold">
          <span className="grid size-8 place-items-center rounded-lg bg-accent text-xs font-bold text-accent-fg">IoT</span>
          IoT Platform
        </Link>
        <Card className="p-6">
          <h1 className="mb-1 text-xl font-semibold">{isSignup ? "Create your account" : "Welcome back"}</h1>
          <p className="mb-6 text-sm text-muted">
            {isSignup ? "Connect and control your devices from anywhere." : "Log in to your devices."}
          </p>
          <form onSubmit={submit} className="flex flex-col gap-4">
            {isSignup && (
              <Field label="Name">
                <Input name="name" required autoComplete="name" />
              </Field>
            )}
            <Field label="Email">
              <Input name="email" type="email" required autoComplete="email" />
            </Field>
            <Field label="Password" hint={isSignup ? "At least 8 characters" : undefined}>
              <Input
                name="password"
                type="password"
                required
                minLength={isSignup ? 8 : undefined}
                autoComplete={isSignup ? "new-password" : "current-password"}
              />
            </Field>
            <ErrorText error={error} />
            <Button type="submit" loading={loading}>
              {isSignup ? "Create account" : "Log in"}
            </Button>
          </form>
        </Card>
        <p className="mt-4 text-center text-sm text-muted">
          {isSignup ? "Already have an account? " : "New here? "}
          <Link href={isSignup ? "/login" : "/signup"} className="font-medium text-accent hover:underline">
            {isSignup ? "Log in" : "Create an account"}
          </Link>
        </p>
      </div>
    </div>
  );
}
