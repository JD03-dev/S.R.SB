import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, scryptSync } from 'node:crypto';
import jwt from 'jsonwebtoken';
import {
  generateRecoveryCode, hashPassword, hashRecoveryCode, needsRehash, normalizeProfile, signToken, verifyPassword,
  verifyToken,
} from '../src/utils/security.js';

test('las contraseñas se guardan con bcrypt y se verifican', async () => {
  const hash = await hashPassword('clave-segura-1');
  assert.match(hash, /^\$2[aby]\$12\$/);
  assert.ok(!hash.includes('clave-segura-1'));
  assert.notEqual(hash, await hashPassword('clave-segura-1'));
  assert.ok(await verifyPassword('clave-segura-1', hash));
  assert.ok(!(await verifyPassword('otra-clave', hash)));
  assert.ok(!(await verifyPassword('clave-segura-1', 'texto-plano')));
  assert.equal(needsRehash(hash), false);
});

test('acepta contraseñas antiguas en scrypt y pide migrarlas', async () => {
  const salt = randomBytes(16);
  const legacy = `scrypt$${salt.toString('base64')}$${scryptSync('clave-vieja-1', salt, 64).toString('base64')}`;
  assert.ok(await verifyPassword('clave-vieja-1', legacy));
  assert.ok(!(await verifyPassword('otra-clave', legacy)));
  assert.equal(needsRehash(legacy), true);
});

test('el código de recuperación tolera minúsculas y espacios', () => {
  const code = generateRecoveryCode();
  assert.match(code, /^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/);
  assert.equal(hashRecoveryCode(code.toLowerCase().replaceAll('-', ' ')), hashRecoveryCode(code));
  assert.equal(hashRecoveryCode('ABC'), null);
});

test('los JWT se verifican y rechazan alteraciones, otra clave, "none" y caducados', () => {
  const token = signToken({ typ: 'session', sid: 'abc' }, '1h');
  assert.equal(verifyToken(token).sid, 'abc');

  const [header, , signature] = token.split('.');
  const forgedPayload = Buffer.from(JSON.stringify({ typ: 'readonly', iss: 'srsb', exp: 9999999999 })).toString('base64url');
  assert.equal(verifyToken(`${header}.${forgedPayload}.${signature}`), null);
  assert.equal(verifyToken(jwt.sign({ typ: 'session' }, 'otra-clave', { issuer: 'srsb' })), null);
  assert.equal(verifyToken(jwt.sign({ typ: 'session', iss: 'srsb' }, null, { algorithm: 'none' })), null);
  assert.equal(verifyToken(signToken({ typ: 'readonly' }, -10)), null);
  assert.equal(verifyToken('no-es-un-jwt'), null);
  assert.equal(verifyToken(undefined), null);
});

test('valida y normaliza los datos de la cuenta', () => {
  const profile = normalizeProfile(
    { name: '  Santiago   Pérez ', email: ' Santi@Correo.com ', username: ' Santiago_B ', password: 'clave-segura' },
    { requirePassword: true },
  );
  assert.deepEqual(profile, { name: 'Santiago Pérez', email: 'santi@correo.com', username: 'santiago_b', password: 'clave-segura' });
  const base = { name: 'Ana', email: 'ana@correo.com', username: 'ana' };
  assert.equal(normalizeProfile(base, { requirePassword: false }).password, null);
  assert.throws(() => normalizeProfile(base, { requirePassword: true }));
  assert.throws(() => normalizeProfile({ ...base, password: 'corta' }, { requirePassword: false }));
  assert.throws(() => normalizeProfile({ ...base, password: 'x'.repeat(73) }, { requirePassword: false }));
  assert.throws(() => normalizeProfile({ ...base, email: 'sin-arroba' }, { requirePassword: false }));
  assert.throws(() => normalizeProfile({ ...base, username: 'ab' }, { requirePassword: false }));
  assert.throws(() => normalizeProfile({ ...base, username: 'con espacio' }, { requirePassword: false }));
});
