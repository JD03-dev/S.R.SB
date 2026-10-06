import { Sequelize } from 'sequelize';
import { env } from './env.js';

export const sequelize = new Sequelize(env.databaseUrl, {
  dialect: 'postgres',
  logging: false,
  pool: { max: 5, min: 0, acquire: 5000, idle: 10000 },
  dialectOptions: { connectionTimeoutMillis: 5000 },
  define: { underscored: true, timestamps: true },
});
