import { randomInt } from 'node:crypto';

// No 0/O, 1/I/L to avoid confusion when the code is read aloud or typed.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CANCELLATION_LIMIT_HOURS = 2;

export function generateReservationCode() {
  let code = 'SB-';
  for (let index = 0; index < 6; index++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

export function normalizeReservationCode(value) {
  if (typeof value !== 'string') return null;
  const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const body = compact.startsWith('SB') ? compact.slice(2) : compact;
  return /^[A-Z0-9]{6}$/.test(body) ? `SB-${body}` : null;
}

// Colombian mobile numbers: 10 digits starting with 3, stored as +573XXXXXXXXX.
export function normalizeColombianMobile(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  let digits = String(value).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('57')) digits = digits.slice(2);
  return /^3\d{9}$/.test(digits) ? `+57${digits}` : null;
}

export function normalizeCustomerName(value) {
  if (typeof value !== 'string') return null;
  const name = value.trim().replace(/\s+/g, ' ');
  return name.length >= 2 && name.length <= 80 ? name : null;
}

export function canCancel(startsAt, now = new Date()) {
  return startsAt.getTime() - now.getTime() >= CANCELLATION_LIMIT_HOURS * 3600 * 1000;
}
