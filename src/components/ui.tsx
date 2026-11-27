"use client";

import { useEffect, useRef, useSyncExternalStore, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

type Variant = "primary" | "secondary" | "danger" | "ghost";
const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg shadow-sm shadow-accent/30 hover:bg-accent-hover",
  secondary: "bg-card border border-border text-foreground shadow-card hover:border-charcoal/30 hover:bg-surface",
  danger: "bg-card border border-danger/30 text-danger hover:bg-danger hover:border-danger hover:text-white",
  ghost: "text-foreground hover:bg-background",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  loading,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md"; loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={cx(
        "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
        size === "sm" ? "h-8 px-3 text-sm" : "h-10 px-4 text-sm",
        VARIANTS[variant],
        className,
      )}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cx("inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent", className)}
      aria-hidden
    />
  );
}

const fieldCls =
  "h-10 w-full rounded-lg border border-border bg-card px-3 text-sm shadow-[inset_0_1px_1px_rgb(16_24_40/0.03)] outline-none transition placeholder:text-muted/70 focus:border-accent focus:ring-4 focus:ring-accent/15 disabled:bg-surface";

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={cx(fieldCls, className)} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...rest} className={cx(fieldCls, "pr-8", className)}>
      {children}
    </select>
  );
}

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx("flex flex-col gap-1.5 text-sm", className)}>
      <span className="font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("rounded-2xl border border-border bg-card shadow-card", className)}>{children}</div>;
}

export function StatusDot({ online, label = true }: { online: boolean; label?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <span className={cx("relative flex size-2")}>
        {online && <span className="absolute inline-flex size-full animate-ping rounded-full bg-success/60" />}
        <span className={cx("relative inline-flex size-2 rounded-full", online ? "bg-success" : "bg-muted/40")} />
      </span>
      {label && <span className={online ? "text-success" : "text-muted"}>{online ? "Online" : "Offline"}</span>}
    </span>
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent-text">{children}</span>;
}

export function ErrorText({ error }: { error: string | null | undefined }) {
  if (!error) return null;
  return <p className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p>;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-charcoal/20 bg-card px-6 py-14 text-center">
      <span className="mb-2 grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" />
        </svg>
      </span>
      <p className="font-semibold text-ink">{title}</p>
      {children && <div className="max-w-md text-sm text-muted">{children}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto max-h-[90dvh] w-[min(94vw,500px)] overflow-y-auto rounded-2xl border border-border bg-card p-0 text-foreground shadow-lift backdrop:bg-ink/40 backdrop:backdrop-blur-sm"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-5 py-4">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        <button
          onClick={onClose}
          className="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-background hover:text-foreground cursor-pointer"
          aria-label="Close"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="p-5">{open && children}</div>
    </dialog>
  );
}

export function CopyField({ value, mono = true }: { value: string; mono?: boolean }) {
  return (
    <div className="flex gap-2">
      <input readOnly value={value} className={cx(fieldCls, mono && "font-mono text-xs")} onFocus={(e) => e.target.select()} />
      <Button variant="secondary" type="button" onClick={() => navigator.clipboard.writeText(value)}>
        Copy
      </Button>
    </div>
  );
}

const noSubscribe = () => () => {};
/**
 * Current year. Read only in the browser: with Cache Components, `new Date()` during the
 * prerender is an error, so the server snapshot is a fixed fallback.
 */
export function Year() {
  const year = useSyncExternalStore(noSubscribe, () => new Date().getFullYear(), () => null);
  return <>{year ?? ""}</>;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
