import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSlots } from '../src/services/slotGenerator.js';

const configuration = {
  openingTime: '08:00',
  closingTime: '20:00',
  durationMinutes: 45,
  breaks: [{ start: '12:00', end: '13:00' }],
};

test('el horario del negocio respeta almuerzo, duración y cierre', () => {
  const slots = generateSlots(configuration);
  assert.equal(slots.length, 14);
  assert.deepEqual(slots[0], { start: '08:00', end: '08:45' });
  assert.deepEqual(slots[4], { start: '11:00', end: '11:45' });
  assert.deepEqual(slots[5], { start: '13:00', end: '13:45' });
  assert.deepEqual(slots.at(-1), { start: '19:00', end: '19:45' });
  assert.ok(slots.every((slot) => slot.end <= '12:00' || slot.start >= '13:00'));
});

test('admite días sin descansos y omite un intervalo incompleto al cierre', () => {
  assert.deepEqual(generateSlots({ openingTime: '09:00', closingTime: '10:40', durationMinutes: 60 }), [
    { start: '09:00', end: '10:00' },
  ]);
});

test('ordena varios descansos y reinicia los espacios después de cada uno', () => {
  const slots = generateSlots({
    openingTime: '08:00', closingTime: '12:00', durationMinutes: 60,
    breaks: [{ start: '10:30', end: '11:00' }, { start: '09:00', end: '09:30' }],
  });
  assert.deepEqual(slots, [
    { start: '08:00', end: '09:00' },
    { start: '09:30', end: '10:30' },
    { start: '11:00', end: '12:00' },
  ]);
});

test('rechaza configuraciones inválidas y descansos superpuestos', () => {
  for (const changes of [
    { durationMinutes: 0 }, { durationMinutes: -45 }, { durationMinutes: 1.5 },
    { openingTime: '25:00' }, { closingTime: '07:00' },
    { breaks: [{ start: '07:00', end: '09:00' }] },
    { breaks: [{ start: '12:00', end: '13:00' }, { start: '12:30', end: '14:00' }] },
  ]) {
    assert.throws(() => generateSlots({ ...configuration, ...changes }));
  }
});
