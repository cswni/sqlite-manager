"use client";

import { clsx } from "clsx";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export function Button({
  variant = "ghost",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "ghost" | "primary" | "danger" | "accent";
}) {
  return (
    <button
      className={clsx(
        "inline-flex h-7 items-center gap-1.5 rounded-sm px-2.5 text-[12px] font-medium transition-colors duration-150 disabled:opacity-40",
        variant === "ghost" &&
          "border border-border bg-bg text-ink hover:bg-surface-2",
        variant === "primary" &&
          "border border-primary bg-primary text-primary-fg hover:brightness-110",
        variant === "accent" &&
          "border border-accent bg-accent text-accent-fg hover:brightness-110",
        variant === "danger" &&
          "border border-danger bg-bg text-danger hover:bg-surface-2",
        className,
      )}
      {...props}
    />
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        "h-7 w-full rounded-sm border border-border bg-bg px-2 text-[12px] text-ink placeholder:text-muted",
        props.className,
      )}
      {...props}
    />
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-9 shrink-0 items-center gap-1.5 border-b border-border bg-surface px-2">
      {children}
    </div>
  );
}

export function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={clsx("flex min-h-0 min-w-0 flex-col", className)}>{children}</div>;
}

export function StatusBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-6 shrink-0 items-center gap-3 border-t border-border bg-surface px-2 text-[11px] text-muted">
      {children}
    </div>
  );
}
