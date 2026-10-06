import { sequelize } from './database.js';

// The admin panel uses this to decide between full access and read-only mode.
export async function isDatabaseAvailable() {
  try {
    await sequelize.authenticate();
    await sequelize.query('SELECT id FROM businesses LIMIT 1');
    return true;
  } catch {
    return false;
  }
}
