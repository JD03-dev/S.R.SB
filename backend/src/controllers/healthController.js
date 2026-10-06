import { sequelize } from '../config/database.js';

export function health(_req, res) {
  res.json({ data: { status: 'ok', service: 'S.R.SB API', version: '0.1.0' } });
}

export async function readiness(_req, res) {
  try {
    await sequelize.authenticate();
    await sequelize.query('SELECT id FROM businesses LIMIT 1');
    res.json({ data: { status: 'ready', database: 'connected' } });
  } catch {
    res.status(503).json({ error: { message: 'PostgreSQL no está disponible o faltan las migraciones.' } });
  }
}
