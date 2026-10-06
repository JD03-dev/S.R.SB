export const STATUS_LABELS = {
  DRAFT: 'Borrador',
  PUBLISHED: 'Publicado',
  DISABLED: 'Deshabilitado',
};

export const STATUS_STYLES = {
  DRAFT: 'bg-amber-50 text-amber-700',
  PUBLISHED: 'bg-brand-soft text-brand-strong',
  DISABLED: 'bg-neutral-100 text-neutral-500',
};

const asDate = (dateOnly) => new Date(`${dateOnly}T12:00:00Z`);

export function formatDate(dateOnly, options) {
  return new Intl.DateTimeFormat('es-CO', { timeZone: 'UTC', ...options }).format(asDate(dateOnly));
}

export function formatWeek(weekStart, weekEnd) {
  return `${formatDate(weekStart, { day: 'numeric', month: 'short' })} – ${formatDate(weekEnd, { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

export function todayDateOnly() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function addDays(dateOnly, days) {
  const date = asDate(dateOnly);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function mondayOf(dateOnly) {
  const weekday = asDate(dateOnly).getUTCDay();
  return addDays(dateOnly, weekday === 0 ? -6 : 1 - weekday);
}

export function formatTime(time) {
  const [hours, minutes] = time.split(':').map(Number);
  const suffix = hours >= 12 ? 'p. m.' : 'a. m.';
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

export function publicScheduleUrl(publicCode) {
  const base = (import.meta.env.VITE_PUBLIC_URL || window.location.origin).replace(/\/$/, '');
  return `${base}/reservar/${publicCode}`;
}

export function currentSchedule(schedules) {
  const thisMonday = mondayOf(todayDateOnly());
  return schedules.find((schedule) => schedule.weekStart === thisMonday)
    || [...schedules].reverse().find((schedule) => schedule.weekStart > thisMonday)
    || schedules[0]
    || null;
}
