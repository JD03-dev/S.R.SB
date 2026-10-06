import { UniqueConstraintError } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Admin, AdminSession } from '../models/index.js';
import { AppError } from '../utils/AppError.js';
import {
  generateRecoveryCode, hashPassword, hashRecoveryCode, normalizeProfile, sha256, signToken, verifyPassword, verifyToken,
} from '../utils/security.js';
import { assertUuid } from '../utils/validation.js';
import { adminWithBusiness, checkCredentials, serializeAdmin } from './authService.js';
import { findBusiness } from './businessService.js';

const CHANGE_TOKEN_MINUTES = 10;
const EXPIRED_CHANGE = 'La verificación expiró. Vuelve a verificar tu identidad.';

function duplicateToConflict(error) {
  if (error instanceof UniqueConstraintError) return new AppError(409, 'Ese usuario o correo ya está registrado.');
  return error;
}

// Changes when the password changes, so old change tokens stop working.
const passwordFingerprint = (admin) => sha256(admin.passwordHash).slice(0, 16);

async function newAccountFields(profile) {
  const recoveryCode = generateRecoveryCode();
  return {
    recoveryCode,
    fields: {
      name: profile.name,
      email: profile.email,
      username: profile.username,
      passwordHash: await hashPassword(profile.password),
      recoveryCodeHash: hashRecoveryCode(recoveryCode),
    },
  };
}

export async function registerOwner(input) {
  const profile = normalizeProfile(input, { requirePassword: true });
  const business = await findBusiness();
  const { recoveryCode, fields } = await newAccountFields(profile);
  try {
    const admin = await sequelize.transaction(async (transaction) => {
      await sequelize.query('LOCK TABLE admins IN SHARE ROW EXCLUSIVE MODE', { transaction });
      if ((await Admin.count({ transaction })) > 0) {
        throw new AppError(409, 'Ya existe una cuenta de administrador. Usa «Actualizar mis datos».');
      }
      return Admin.create({ ...fields, businessId: business.id, role: 'OWNER' }, { transaction });
    });
    admin.business = business;
    return { admin: serializeAdmin(admin), recoveryCode };
  } catch (error) {
    throw duplicateToConflict(error);
  }
}

export async function verifyAccountAccess({ method, username, password, recoveryCode } = {}) {
  let admin = null;
  if (method === 'password') {
    admin = await checkCredentials(username, password);
    if (!admin) throw new AppError(422, 'Usuario o contraseña incorrectos.');
  } else if (method === 'recovery') {
    const hash = hashRecoveryCode(recoveryCode);
    admin = hash && await Admin.findOne({ where: { recoveryCodeHash: hash }, include: adminWithBusiness });
    if (!admin) throw new AppError(422, 'El código de recuperación no es válido.');
  } else {
    throw new AppError(422, 'Elige cómo verificar tu identidad.');
  }

  const changeToken = signToken(
    { typ: 'account-change', sub: admin.id, via: method, pf: passwordFingerprint(admin) },
    `${CHANGE_TOKEN_MINUTES}m`,
  );
  return { changeToken, admin: serializeAdmin(admin) };
}

export async function updateAccountWithToken({ changeToken, ...input } = {}) {
  const ticket = verifyToken(changeToken);
  if (ticket?.typ !== 'account-change') throw new AppError(422, EXPIRED_CHANGE);
  const profile = normalizeProfile(input, { requirePassword: false });

  const admin = await Admin.findByPk(ticket.sub, { include: adminWithBusiness });
  if (!admin || passwordFingerprint(admin) !== ticket.pf) throw new AppError(422, EXPIRED_CHANGE);

  const changes = { name: profile.name, email: profile.email, username: profile.username };
  if (profile.password) changes.passwordHash = await hashPassword(profile.password);
  // A used recovery code is replaced so it cannot be reused.
  let recoveryCode = null;
  if (ticket.via === 'recovery') {
    recoveryCode = generateRecoveryCode();
    changes.recoveryCodeHash = hashRecoveryCode(recoveryCode);
  }

  try {
    await sequelize.transaction(async (transaction) => {
      await admin.update(changes, { transaction });
      if (profile.password) await AdminSession.destroy({ where: { adminId: admin.id }, transaction });
    });
  } catch (error) {
    throw duplicateToConflict(error);
  }
  return { admin: serializeAdmin(admin), recoveryCode };
}

async function requireCurrentPassword(admin, currentPassword) {
  if (!(await verifyPassword(currentPassword, admin.passwordHash))) {
    throw new AppError(422, 'La contraseña actual no es correcta.');
  }
}

export async function updateOwnProfile(admin, { currentPassword, ...input } = {}) {
  await requireCurrentPassword(admin, currentPassword);
  const profile = normalizeProfile(input, { requirePassword: false });
  const changes = { name: profile.name, email: profile.email, username: profile.username };
  if (profile.password) changes.passwordHash = await hashPassword(profile.password);
  try {
    await admin.update(changes);
  } catch (error) {
    throw duplicateToConflict(error);
  }
  return serializeAdmin(admin);
}

export async function regenerateRecoveryCode(admin, { currentPassword } = {}) {
  await requireCurrentPassword(admin, currentPassword);
  const recoveryCode = generateRecoveryCode();
  await admin.update({ recoveryCodeHash: hashRecoveryCode(recoveryCode) });
  return { recoveryCode };
}

export async function listAdmins(owner) {
  const admins = await Admin.findAll({
    where: { businessId: owner.businessId },
    include: adminWithBusiness,
    order: [['createdAt', 'ASC']],
  });
  return admins.map(serializeAdmin);
}

export async function createAdmin(owner, input) {
  const profile = normalizeProfile(input, { requirePassword: true });
  const { recoveryCode, fields } = await newAccountFields(profile);
  try {
    const admin = await Admin.create({ ...fields, businessId: owner.businessId, role: 'ADMIN', createdBy: owner.id });
    admin.business = owner.business;
    return { admin: serializeAdmin(admin), recoveryCode };
  } catch (error) {
    throw duplicateToConflict(error);
  }
}

// The owner can issue a new recovery code for another account (e.g. when it was lost).
// Codes are stored hashed, so the old one can never be shown; the new one is shown once.
export async function regenerateAccountRecoveryCode(owner, adminId) {
  assertUuid(adminId, 'La cuenta no es válida.');
  const admin = await Admin.findOne({ where: { id: adminId, businessId: owner.businessId } });
  if (!admin) throw new AppError(404, 'La cuenta no existe.');
  if (admin.role === 'OWNER') throw new AppError(422, 'Tu propio código se genera desde «Mi cuenta».');
  const recoveryCode = generateRecoveryCode();
  await admin.update({ recoveryCodeHash: hashRecoveryCode(recoveryCode) });
  return { recoveryCode };
}
