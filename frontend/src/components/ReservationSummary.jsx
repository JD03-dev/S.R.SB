import { CalendarDays, Clock3, User } from 'lucide-react';
import { formatDate, formatTime } from '../admin/format.js';

const STATUS = {
  CONFIRMED: { label: 'Confirmada', style: 'bg-brand-soft text-brand-strong' },
  CANCELLED: { label: 'Cancelada', style: 'bg-red-50 text-red-700' },
  COMPLETED: { label: 'Atendida', style: 'bg-neutral-100 text-neutral-600' },
};

export function ReservationSummary({ reservation }) {
  const status = STATUS[reservation.status];
  return (
    <div className="rounded-3xl bg-neutral-50 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          {reservation.code ? (
            <>
              <p className="text-xs text-neutral-500">Código de reserva</p>
              <p className="mt-1 font-mono text-2xl font-semibold tracking-wider">{reservation.code}</p>
            </>
          ) : (
            <p className="text-base font-semibold first-letter:uppercase">{formatDate(reservation.date, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          )}
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${status.style}`}>{status.label}</span>
      </div>
      <dl className="mt-5 space-y-3 text-sm">
        <div className="flex items-center gap-3">
          <dt><User className="size-4 text-neutral-400" aria-label="Nombre" /></dt>
          <dd>{reservation.name}</dd>
        </div>
        <div className="flex items-center gap-3">
          <dt><CalendarDays className="size-4 text-neutral-400" aria-label="Fecha" /></dt>
          <dd className="first-letter:uppercase">{formatDate(reservation.date, { weekday: 'long', day: 'numeric', month: 'long' })}</dd>
        </div>
        <div className="flex items-center gap-3">
          <dt><Clock3 className="size-4 text-neutral-400" aria-label="Hora" /></dt>
          <dd>{formatTime(reservation.start)} – {formatTime(reservation.end)}</dd>
        </div>
      </dl>
    </div>
  );
}
