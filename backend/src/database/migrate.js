import { fileURLToPath } from 'node:url';
import { Umzug, SequelizeStorage } from 'umzug';
import { sequelize } from '../config/database.js';

const migrator = new Umzug({
  migrations: { glob: ['*.js', { cwd: fileURLToPath(new URL('./migrations', import.meta.url)) }] },
  context: sequelize,
  storage: new SequelizeStorage({ sequelize }),
  logger: console,
});

try {
  await sequelize.authenticate();
  await migrator.up();
  console.log('Base de datos actualizada.');
} catch (error) {
  console.error('No se pudieron aplicar las migraciones:', error.message);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
