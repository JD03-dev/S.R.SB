import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canCancel, generateReservationCode, normalizeColombianMobile, normalizeCustomerName, normalizeReservationCode,
} from '../src/utils/reservationRules.js';

test('genera códigos cortos sin caracteres confusos', () => {
  const codes = new Set(Array.from({ length: 500 }, generateReservationCode));
  assert.ok(codes.size > 495);
  for (const code of codes) assert.match(code, /^SB-[A-HJKMNP-Z2-9]{6}$/);
});

test('normaliza el código escrito por el cliente', () => {
  assert.equal(normalizeReservationCode('sb-8a42kq'), 'SB-8A42KQ');
  assert.equal(normalizeReservationCode(' 8A42KQ '), 'SB-8A42KQ');
  assert.equal(normalizeReservationCode('SB 8A4 2KQ'), 'SB-8A42KQ');
  assert.equal(normalizeReservationCode('SB-123'), null);
  assert.equal(normalizeReservationCode(undefined), null);
});

test('acepta solo celulares colombianos', () => {
  assert.equal(normalizeColombianMobile('300 123 4567'), '+573001234567');
  assert.equal(normalizeColombianMobile('+57 300-123-4567'), '+573001234567');
  assert.equal(normalizeColombianMobile('573001234567'), '+573001234567');
  assert.equal(normalizeColombianMobile('6012345678'), null);
  assert.equal(normalizeColombianMobile('30012345'), null);
  assert.equal(normalizeColombianMobile(null), null);
});

test('valida el nombre', () => {
  assert.equal(normalizeCustomerName('  Juan   Pérez '), 'Juan Pérez');
  assert.equal(normalizeCustomerName('J'), null);
  assert.equal(normalizeCustomerName('x'.repeat(81)), null);
});

test('permite cancelar hasta 2 horas antes', () => {
  const now = new Date('2026-10-05T12:00:00Z');
  assert.ok(canCancel(new Date('2026-10-05T14:00:00Z'), now));
  assert.ok(!canCancel(new Date('2026-10-05T13:59:00Z'), now));
});
