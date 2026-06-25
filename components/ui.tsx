// Small shared UI primitives so the new screens stay consistent without a
// component library. Brand colors come from tailwind.config.ts (nova-*).
import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-nova-deep">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-600">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border bg-white p-6 ${className}`}>
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed bg-white px-6 py-12 text-center">
      <p className="font-semibold text-nova-deep">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">{hint}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </p>
  );
}

const BADGE_TONES: Record<string, string> = {
  green: "bg-green-100 text-green-800",
  amber: "bg-amber-100 text-amber-800",
  gray: "bg-gray-100 text-gray-700",
  violet: "bg-nova-sky text-nova-deep",
};

export function Badge({
  children,
  tone = "gray",
}: {
  children: ReactNode;
  tone?: keyof typeof BADGE_TONES | string;
}) {
  const cls = BADGE_TONES[tone] ?? BADGE_TONES.gray;
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {children}
    </span>
  );
}

const BTN_BASE =
  "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-60";

export function ButtonLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  const styles =
    variant === "primary"
      ? "bg-nova-deep text-white hover:bg-nova-violet"
      : "border border-nova-deep text-nova-deep hover:bg-nova-deep hover:text-white";
  return (
    <Link href={href} className={`${BTN_BASE} ${styles}`}>
      {children}
    </Link>
  );
}

export const buttonClass = (variant: "primary" | "secondary" = "primary") =>
  `${BTN_BASE} ${
    variant === "primary"
      ? "bg-nova-deep text-white hover:bg-nova-violet"
      : "border border-nova-deep text-nova-deep hover:bg-nova-deep hover:text-white"
  }`;

export const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-nova-violet focus:outline-none";

export const labelClass = "mb-1 block text-sm font-medium text-nova-deep";
