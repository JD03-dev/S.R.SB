import * as accounts from '../services/accountService.js';
import { getAuthStatus, login, logout, serializeAdmin } from '../services/authService.js';

export async function status(_req, res) {
  res.json({ data: await getAuthStatus() });
}

export async function createSession(req, res) {
  res.json({ data: await login(req.body, req.ip) });
}

export function showSession(req, res) {
  const { mode, admin } = req.session;
  res.json({ data: { mode, admin: admin ? serializeAdmin(admin) : null } });
}

export async function endSession(req, res) {
  await logout(req.session);
  res.status(204).end();
}

export async function register(req, res) {
  res.status(201).json({ data: await accounts.registerOwner(req.body) });
}

export async function verifyAccount(req, res) {
  res.json({ data: await accounts.verifyAccountAccess(req.body) });
}

export async function updateAccount(req, res) {
  res.json({ data: await accounts.updateAccountWithToken(req.body) });
}

export async function updateMe(req, res) {
  res.json({ data: await accounts.updateOwnProfile(req.session.admin, req.body) });
}

export async function newRecoveryCode(req, res) {
  res.json({ data: await accounts.regenerateRecoveryCode(req.session.admin, req.body) });
}

export async function listAccounts(req, res) {
  res.json({ data: await accounts.listAdmins(req.session.admin) });
}

export async function createAccount(req, res) {
  res.status(201).json({ data: await accounts.createAdmin(req.session.admin, req.body) });
}

export async function newAccountRecoveryCode(req, res) {
  res.json({ data: await accounts.regenerateAccountRecoveryCode(req.session.admin, req.params.adminId) });
}
