function toMinutes(value) {
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new Error('Los horarios deben tener formato HH:mm.');
  }
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function toTime(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

// Genera intervalos locales. La persistencia deberá convertirlos usando la zona del negocio.
export function generateSlots({ openingTime, closingTime, durationMinutes, breaks = [] }) {
  const start = toMinutes(openingTime);
  const end = toMinutes(closingTime);
  if (start >= end) throw new Error('La apertura debe ser anterior al cierre.');
  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    throw new Error('La duración debe ser un entero positivo.');
  }
  if (!Array.isArray(breaks)) throw new Error('Los descansos deben ser una lista.');

  const blocked = breaks.map((period) => {
    const from = toMinutes(period.start);
    const to = toMinutes(period.end);
    if (from >= to || from < start || to > end) {
      throw new Error('Los descansos deben estar dentro del horario de atención.');
    }
    return { start: from, end: to };
  }).sort((a, b) => a.start - b.start);

  for (let index = 1; index < blocked.length; index++) {
    if (blocked[index].start < blocked[index - 1].end) {
      throw new Error('Los descansos no pueden superponerse.');
    }
  }

  const slots = [];
  let cursor = start;
  for (const period of [...blocked, { start: end, end }]) {
    while (cursor + durationMinutes <= period.start) {
      slots.push({ start: toTime(cursor), end: toTime(cursor + durationMinutes) });
      cursor += durationMinutes;
    }
    cursor = period.end;
  }
  return slots;
}
