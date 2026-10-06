import { Business } from '../models/index.js';
import { AppError } from '../utils/AppError.js';
import { isTime } from '../utils/time.js';
import { generateSlots } from './slotGenerator.js';

const shortTime = (value) => (value ? String(value).slice(0, 5) : null);

export function serializeBusiness(business) {
  return {
    name: business.name,
    timezone: business.timezone,
    openingTime: shortTime(business.openingTime),
    closingTime: shortTime(business.closingTime),
    breakStart: shortTime(business.breakStart),
    breakEnd: shortTime(business.breakEnd),
    serviceDurationMinutes: business.serviceDurationMinutes,
  };
}

export async function findBusiness(options = {}) {
  const business = await Business.findOne({ order: [['createdAt', 'ASC']], ...options });
  if (!business) throw new AppError(409, 'No hay un negocio configurado. Ejecuta npm.cmd run db:seed.');
  return business;
}

// Validates business hours and returns them normalized with the slots they produce; throws 422 when invalid.
export function validateBusinessHours(input) {
  const hours = {
    openingTime: input.openingTime,
    closingTime: input.closingTime,
    breakStart: input.breakStart || null,
    breakEnd: input.breakEnd || null,
    serviceDurationMinutes: Number(input.serviceDurationMinutes),
  };
  for (const key of ['openingTime', 'closingTime']) {
    if (!isTime(hours[key])) throw new AppError(422, 'Las horas deben tener formato HH:mm.');
  }
  if (Boolean(hours.breakStart) !== Boolean(hours.breakEnd)) {
    throw new AppError(422, 'Indica el inicio y el fin del descanso, o deja ambos vacíos.');
  }
  if (!Number.isInteger(hours.serviceDurationMinutes)
    || hours.serviceDurationMinutes < 5 || hours.serviceDurationMinutes > 480) {
    throw new AppError(422, 'La duración debe ser un número entero entre 5 y 480 minutos.');
  }

  try {
    const slots = generateSlots({
      openingTime: hours.openingTime,
      closingTime: hours.closingTime,
      durationMinutes: hours.serviceDurationMinutes,
      breaks: hours.breakStart ? [{ start: hours.breakStart, end: hours.breakEnd }] : [],
    });
    if (slots.length === 0) throw new Error('El horario no permite generar ningún espacio.');
    return { hours, slots };
  } catch (error) {
    throw new AppError(422, error.message);
  }
}

export async function getBusinessSettings() {
  return serializeBusiness(await findBusiness());
}

export async function updateBusinessSettings(input = {}) {
  const business = await findBusiness();
  const { hours } = validateBusinessHours(input);
  await business.update(hours);
  return serializeBusiness(business);
}
