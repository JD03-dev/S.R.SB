import { app } from './app.js';
import { sequelize } from './config/database.js';
import { env } from './config/env.js';

const server = app.listen(env.port, () => {
  console.log(`S.R.SB API disponible en http://localhost:${env.port}/api/health`);
});

server.on('error', (error) => {
  console.error('No se pudo iniciar la API:', error.message);
  process.exitCode = 1;
});

function shutdown() {
  server.close(async () => {
    await sequelize.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
