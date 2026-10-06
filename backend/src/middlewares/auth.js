import { authenticate } from '../services/authService.js';
import { AppError } from '../utils/AppError.js';

export async function requireAdmin(req, _res, next) {
  const header = req.get('authorization') || '';
  const session = header.startsWith('Bearer ') ? await authenticate(header.slice(7)) : null;
  if (!session) return next(new AppError(401, 'Tu sesión expiró. Inicia sesión nuevamente.'));
  req.session = session;
  next();
}

export function requireWriteAccess(req, _res, next) {
  if (req.session?.mode !== 'full') {
    return next(new AppError(403, 'Modo solo lectura: inicia sesión de nuevo cuando la base de datos esté disponible.'));
  }
  next();
}

export function requireOwner(req, _res, next) {
  if (req.session?.admin?.role !== 'OWNER') {
    return next(new AppError(403, 'Solo el administrador principal puede gestionar otras cuentas.'));
  }
  next();
}
