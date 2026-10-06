import { randomUUID } from 'node:crypto';
import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import { isDatabaseAvailable } from '../config/databaseStatus.js';
import { Admin, AdminSession, Business } from '../models/index.js';
import { AppError } from '../utils/AppError.js';
import {
  DUMMY_PASSWORD_HASH, hashPassword, needsRehash, sha256, signToken, verifyPassword, verifyToken,
} from '../utils/security.js';

export const SESSION_IDLE_MINUTES = 30;
const SESSION_MAX_HOURS = 12;
const IDLE_MS = SESSION_IDLE_MINUTES * 60 * 1000;
const MAX_MS = SESSION_MAX_HOURS * 3600 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const failedAttempts = new Map();

export function serializeAdmin(admin) {
  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    username: admin.username,
    role: admin.role,
    businessName: admin.business?.name,
  };
}

export const adminWithBusiness = [{ model: Business, as: 'business', attributes: ['name'] }];

export function findAdminByIdentifier(identifier, options = {}) {
  const value = typeof identifier === 'string' ? identifier.trim().toLowerCase() : '';
  if (!value) return null;
  return Admin.findOne({ where: value.includes('@') ? { email: value } : { username: value }, include: adminWithBusiness, ...options });
}

// Returns the admin only when the password matches; always spends the same hashing time.
export async function checkCredentials(identifier, password) {
  const admin = await findAdminByIdentifier(identifier);
  const valid = await verifyPassword(password, admin?.passwordHash ?? DUMMY_PASSWORD_HASH);
  return admin && valid ? admin : null;
}

function checkLock(clientKey) {
  const entry = failedAttempts.get(clientKey);
  if (entry && entry.count >= MAX_FAILED_ATTEMPTS && entry.until > Date.now()) {
    throw new AppError(429, 'Demasiados intentos fallidos. Intenta de nuevo en unos minutos.');
  }
}

function registerFailure(clientKey) {
  const entry = failedAttempts.get(clientKey);
  const active = entry && entry.until > Date.now();
  failedAttempts.set(clientKey, { count: active ? entry.count + 1 : 1, until: Date.now() + LOCK_MINUTES * 60 * 1000 });
}

const staleSessions = () => ({
  [Op.or]: [
    { lastSeenAt: { [Op.lt]: new Date(Date.now() - IDLE_MS) } },
    { createdAt: { [Op.lt]: new Date(Date.now() - MAX_MS) } },
  ],
});

// The JWT carries the session id; the server-side row enforces one active session and allows logout.
async function startSession(admin) {
  const sessionId = randomUUID();
  const token = signToken({ typ: 'session', sub: admin.id, sid: sessionId }, `${SESSION_MAX_HOURS}h`);
  await sequelize.transaction(async (transaction) => {
    // Serializes concurrent logins; the unique index on admin_sessions is the final guarantee.
    await sequelize.query('LOCK TABLE admin_sessions IN SHARE ROW EXCLUSIVE MODE', { transaction });
    await AdminSession.destroy({ where: staleSessions(), transaction });
    const active = await AdminSession.findOne({
      include: [{ model: Admin, as: 'admin', attributes: ['id', 'name', 'username'] }],
      transaction,
    });
    if (active && active.adminId !== admin.id) {
      throw new AppError(409, `${active.admin.name} (@${active.admin.username}) tiene la sesión activa. Podrás entrar cuando cierre sesión o tras ${SESSION_IDLE_MINUTES} minutos sin actividad.`);
    }
    // The same admin logging in again replaces their previous session.
    if (active) await active.destroy({ transaction });
    await AdminSession.create({ id: sessionId, adminId: admin.id, tokenHash: sha256(token) }, { transaction });
  });
  return token;
}

export async function getAuthStatus() {
  const databaseAvailable = await isDatabaseAvailable();
  return { databaseAvailable, hasAccounts: databaseAvailable ? (await Admin.count()) > 0 : null };
}

export async function login({ username, password } = {}, clientKey = 'unknown') {
  if (!(await isDatabaseAvailable())) {
    return { token: signToken({ typ: 'readonly' }, `${SESSION_MAX_HOURS}h`), mode: 'readonly', admin: null };
  }

  checkLock(clientKey);
  if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
    throw new AppError(400, 'Ingresa usuario y contraseña.');
  }
  const admin = await checkCredentials(username, password);
  if (!admin) {
    registerFailure(clientKey);
    throw new AppError(401, 'Usuario o contraseña incorrectos.');
  }
  failedAttempts.delete(clientKey);
  if (needsRehash(admin.passwordHash)) await admin.update({ passwordHash: await hashPassword(password) });

  return { token: await startSession(admin), mode: 'full', admin: serializeAdmin(admin) };
}

export async function authenticate(token) {
  const claims = verifyToken(token);
  if (claims?.typ === 'readonly') return { mode: 'readonly', admin: null };
  if (claims?.typ !== 'session' || typeof claims.sid !== 'string') return null;

  const session = await AdminSession.findOne({
    where: { id: claims.sid, adminId: claims.sub, tokenHash: sha256(token) },
    include: [{ model: Admin, as: 'admin', include: adminWithBusiness }],
  });
  if (!session) return null;
  const now = Date.now();
  if (now - session.lastSeenAt.getTime() > IDLE_MS || now - session.createdAt.getTime() > MAX_MS) {
    await session.destroy();
    return null;
  }
  if (now - session.lastSeenAt.getTime() > 60 * 1000) await session.update({ lastSeenAt: new Date() });
  return { mode: 'full', admin: session.admin, sessionId: session.id };
}

export async function logout(session) {
  if (session?.sessionId) await AdminSession.destroy({ where: { id: session.sessionId } });
}
