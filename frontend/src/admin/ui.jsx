import { AlertCircle, LoaderCircle } from 'lucide-react';
import { STATUS_LABELS, STATUS_STYLES } from './format.js';

export function Card({ className = '', children }) {
  return <section className={`rounded-[28px] bg-surface p-5 sm:p-6 ${className}`}>{children}</section>;
}

export function CardHeader({ title, subtitle, action }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-neutral-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${STATUS_STYLES[status]}`}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  );
}

export function Loading({ label = 'Cargando…' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-neutral-500" role="status">
      <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> {label}
    </div>
  );
}

export function Notice({ tone = 'error', children }) {
  const styles = tone === 'error' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800';
  return (
    <div className={`flex items-start gap-2 rounded-2xl px-4 py-3 text-sm ${styles}`} role={tone === 'error' ? 'alert' : 'status'}>
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

export const buttonStyles = {
  primary: 'inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50',
  secondary: 'inline-flex items-center justify-center gap-2 rounded-full bg-surface px-5 py-2.5 text-sm font-medium text-ink ring-1 ring-neutral-200 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50',
  soft: 'inline-flex items-center justify-center gap-2 rounded-full bg-neutral-100 px-4 py-2 text-sm font-medium text-ink transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50',
  icon: 'inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-ink transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40 sm:size-10',
};

export const inputStyles = 'w-full rounded-2xl border border-neutral-200 bg-surface px-4 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-neutral-50';
