"use client";

import { useEffect, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

type Variant = "primary" | "secondary" | "danger" | "ghost";
const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg hover:opacity-90",
  secondary: "bg-card border border-border hover:bg-background",
  danger: "bg-card border border-border text-danger hover:bg-danger hover:text-white",
  ghost: "hover:bg-border/60",
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
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
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
  "h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/25";

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
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("rounded-xl border border-border bg-card", className)}>{children}</div>;
}

export function StatusDot({ online, label = true }: { online: boolean; label?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <span className={cx("size-2 rounded-full", online ? "bg-accent shadow-[0_0_0_3px] shadow-accent/20" : "bg-muted/50")} />
      {label && <span className={online ? "text-accent" : "text-muted"}>{online ? "Online" : "Offline"}</span>}
    </span>
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded-md border border-border px-1.5 py-0.5 text-xs font-medium text-muted">{children}</span>;
}

export function ErrorText({ error }: { error: string | null | undefined }) {
  if (!error) return null;
  return <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-12 text-center">
      <p className="font-medium">{title}</p>
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
      className="m-auto w-[min(92vw,480px)] rounded-xl border border-border bg-card p-0 text-foreground backdrop:bg-black/40"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h2 className="font-semibold">{title}</h2>
        <button onClick={onClose} className="rounded p-1 text-muted hover:text-foreground cursor-pointer" aria-label="Close">
          ✕
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
