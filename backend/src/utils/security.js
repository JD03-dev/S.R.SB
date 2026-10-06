import { createHash, randomBytes, randomInt, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from './AppError.js';

const scrypt = promisify(scryptCallback);
const BCRYPT_ROUNDS = 12;
// bcrypt only uses the first 72 bytes of a password.
const MAX_PASSWORD_BYTES = 72;
const JWT_OPTIONS = { algorithm: 'HS256', issuer: 'srsb' };
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const USERNAME_PATTERN = /^[a-z0-9._]{3,30}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const sha256 = (value) => createHash('sha256').update(String(value)).digest('hex');

export function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

// Accounts created before bcrypt used scrypt; they are still accepted and rehashed on login.
async function verifyLegacyScrypt(password, stored) {
  const [, salt, hash] = stored.split('$');
  if (!salt || !hash) return false;
  const key = await scrypt(password, Buffer.from(salt, 'base64'), 64);
  const expected = Buffer.from(hash, 'base64');
  return expected.length === key.length && timingSafeEqual(key, expected);
}

export async function verifyPassword(password, stored) {
  if (typeof password !== 'string' || typeof stored !== 'string') return false;
  if (stored.startsWith('scrypt$')) return verifyLegacyScrypt(password, stored);
  return bcrypt.compare(password, stored);
}

export const needsRehash = (stored) => !String(stored).startsWith('$2');

// Used when the account does not exist so the response time does not reveal it.
export const DUMMY_PASSWORD_HASH = await hashPassword(randomBytes(16).toString('hex'));

export function generateRecoveryCode() {
  const chars = Array.from({ length: 12 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
  return `${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8)}`;
}

export function hashRecoveryCode(value) {
  const compact = typeof value === 'string' ? value.toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
  return compact.length === 12 ? sha256(`recovery:${compact}`) : null;
}

export function signToken(payload, expiresIn) {
  return jwt.sign(payload, env.authSecret, { ...JWT_OPTIONS, expiresIn });
}

// Returns the payload of a valid, unexpired token signed by this API; otherwise null.
export function verifyToken(token) {
  if (typeof token !== 'string' || !token) return null;
  try {
    return jwt.verify(token, env.authSecret, { algorithms: [JWT_OPTIONS.algorithm], issuer: JWT_OPTIONS.issuer });
  } catch {
    return null;
  }
}

export function normalizeProfile(input = {}, { requirePassword }) {
  const name = typeof input.name === 'string' ? input.name.trim().replace(/\s+/g, ' ') : '';
  if (name.length < 2 || name.length > 80) throw new AppError(422, 'El nombre debe tener entre 2 y 80 caracteres.');

  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  if (email.length > 160 || !EMAIL_PATTERN.test(email)) throw new AppError(422, 'Ingresa un correo válido.');

  const username = typeof input.username === 'string' ? input.username.trim().toLowerCase() : '';
  if (!USERNAME_PATTERN.test(username)) {
    throw new AppError(422, 'El usuario debe tener de 3 a 30 caracteres: letras minúsculas, números, punto o guion bajo.');
  }

  const password = input.password || null;
  if (requirePassword || password) {
    if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password) > MAX_PASSWORD_BYTES) {
      throw new AppError(422, 'La contraseña debe tener entre 8 y 72 caracteres.');
    }
  }
  return { name, email, username, password };
}
