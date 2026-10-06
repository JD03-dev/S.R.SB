import dotenv from 'dotenv';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

const port = Number(process.env.PORT || 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT debe ser un puerto válido.');
}

const nodeEnv = process.env.NODE_ENV || 'development';
if (nodeEnv === 'production' && (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32)) {
  throw new Error('AUTH_SECRET debe tener al menos 32 caracteres en producción.');
}

export const env = {
  nodeEnv,
  port,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL || 'postgres://srsb:srsb_local@localhost:5432/srsb',
  businessName: process.env.BUSINESS_NAME || 'Santiago Barber',
  businessTimezone: process.env.BUSINESS_TIMEZONE || 'America/Bogota',
  // Signs read-only sessions and account-change tokens. Without it they expire when the API restarts.
  authSecret: process.env.AUTH_SECRET || randomBytes(32).toString('hex'),
};
