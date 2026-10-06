const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isTime(value) {
  return typeof value === 'string' && TIME_PATTERN.test(value);
}

export function isDateOnly(value) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

export function timeToMinutes(value) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

export function addDays(dateOnly, days) {
  const date = new Date(`${dateOnly}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function isMonday(dateOnly) {
  return new Date(`${dateOnly}T00:00:00Z`).getUTCDay() === 1;
}

export function todayInZone(timeZone, now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function mondayOf(dateOnly) {
  const weekday = new Date(`${dateOnly}T00:00:00Z`).getUTCDay();
  return addDays(dateOnly, weekday === 0 ? -6 : 1 - weekday);
}

function zoneOffsetMs(date, timeZone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date).map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

// Converts a local business date + time (HH:mm) to an absolute instant.
export function zonedToUtc(dateOnly, time, timeZone) {
  const [year, month, day] = dateOnly.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  const local = Date.UTC(year, month - 1, day, hours, minutes);
  const firstGuess = local - zoneOffsetMs(new Date(local), timeZone);
  return new Date(local - zoneOffsetMs(new Date(firstGuess), timeZone));
}

export function utcToZonedTime(date, timeZone) {
  return new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
}
