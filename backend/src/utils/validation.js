import { AppError } from './AppError.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function assertUuid(value, message = 'El identificador no es válido.') {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) throw new AppError(400, message);
}
