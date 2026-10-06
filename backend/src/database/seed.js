import { sequelize } from '../config/database.js';
import { env } from '../config/env.js';
import { Business } from '../models/index.js';

try {
  await sequelize.authenticate();
  const [business, created] = await Business.findOrCreate({
    where: { id: '00000000-0000-4000-8000-000000000001' },
    defaults: {
      name: env.businessName,
      timezone: env.businessTimezone,
      openingTime: '08:00',
      closingTime: '20:00',
      breakStart: '12:00',
      breakEnd: '13:00',
      serviceDurationMinutes: 45,
    },
  });
  console.log(`${created ? 'Negocio creado' : 'Negocio existente'}: ${business.name}`);
} catch (error) {
  console.error('No se pudieron cargar los datos iniciales:', error.message);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
