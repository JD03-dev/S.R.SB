import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, isDateOnly, isMonday, mondayOf, todayInZone, utcToZonedTime, zonedToUtc } from '../src/utils/time.js';

test('convierte horas locales de Bogotá a UTC y de vuelta', () => {
  const instant = zonedToUtc('2026-10-05', '08:00', 'America/Bogota');
  assert.equal(instant.toISOString(), '2026-10-05T13:00:00.000Z');
  assert.equal(utcToZonedTime(instant, 'America/Bogota'), '08:00');
});

test('respeta cambios de horario en zonas con DST', () => {
  assert.equal(zonedToUtc('2026-07-01', '09:00', 'Europe/Madrid').toISOString(), '2026-07-01T07:00:00.000Z');
  assert.equal(zonedToUtc('2026-01-15', '09:00', 'Europe/Madrid').toISOString(), '2026-01-15T08:00:00.000Z');
});

test('calcula fechas de la semana', () => {
  assert.equal(addDays('2026-12-28', 6), '2027-01-03');
  assert.ok(isMonday('2026-10-05'));
  assert.ok(!isMonday('2026-10-04'));
  assert.equal(mondayOf('2026-10-04'), '2026-09-28');
  assert.equal(mondayOf('2026-10-07'), '2026-10-05');
  assert.ok(isDateOnly('2026-02-28'));
  assert.ok(!isDateOnly('2026-02-30'));
  assert.equal(todayInZone('America/Bogota', new Date('2026-10-05T03:00:00Z')), '2026-10-04');
});
