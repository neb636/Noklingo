import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "primary" | "secondary" | "ghost" | "danger";
  full?: boolean;
};

export function Button({
  tone = "primary",
  full,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`button button-${tone} ${full ? "button-full" : ""} ${className}`}
      {...props}
    />
  );
}

export function ProgressBar({
  value,
  label,
}: {
  value: number;
  label?: string;
}) {
  return (
    <div
      className="progress-track"
      aria-label={label}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span
        className="progress-fill"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function StatCard({
  icon,
  value,
  label,
  accent = "sun",
}: {
  icon: ReactNode;
  value: string | number;
  label: string;
  accent?: "sun" | "coral" | "teal";
}) {
  return (
    <div className={`stat-card stat-${accent}`}>
      <span className="stat-icon">{icon}</span>
      <span className="stat-copy">
        <strong>{value}</strong>
        <small>{label}</small>
      </span>
    </div>
  );
}
