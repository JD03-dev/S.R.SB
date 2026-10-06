import { Op, UniqueConstraintError } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Customer, Reservation, ScheduleDay, TimeSlot } from '../models/index.js';
import { AppError } from '../utils/AppError.js';
import {
  CANCELLATION_LIMIT_HOURS, canCancel, generateReservationCode, normalizeColombianMobile,
  normalizeCustomerName, normalizeReservationCode,
} from '../utils/reservationRules.js';
import { utcToZonedTime } from '../utils/time.js';
import { assertUuid } from '../utils/validation.js';
import { lockDay } from './adminScheduleService.js';
import { findBusiness } from './businessService.js';

const SLOT_TAKEN = 'Este horario acaba de ser reservado por otra persona. Elige otro.';
const CODE_NOT_FOUND = 'No encontramos una reserva con ese código.';
const MAX_PHONE_RESULTS = 50;

function requirePhone(value) {
  const phone = normalizeColombianMobile(value);
  if (!phone) throw new AppError(422, 'Ingresa un celular colombiano de 10 dígitos que empiece por 3.');
  return phone;
}

function requireCode(value) {
  const code = normalizeReservationCode(value);
  if (!code) throw new AppError(422, 'El código tiene el formato SB-XXXXXX.');
  return code;
}

// The code is the only secret that allows cancelling, so phone lookups never return it.
function serializeReservation(reservation, timeZone, { includeCode = true } = {}) {
  const { slot, customer } = reservation;
  return {
    id: reservation.id,
    code: includeCode ? reservation.code : null,
    status: reservation.status,
    name: customer.name,
    date: slot.day.date,
    start: utcToZonedTime(slot.startsAt, timeZone),
    end: utcToZonedTime(slot.endsAt, timeZone),
    canCancel: reservation.status === 'CONFIRMED' && canCancel(slot.startsAt),
  };
}

const reservationInclude = [
  { model: Customer, as: 'customer' },
  { model: TimeSlot, as: 'slot', include: [{ model: ScheduleDay, as: 'day' }] },
];

async function uniqueCode(transaction) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateReservationCode();
    if (!(await Reservation.findOne({ where: { code }, attributes: ['id'], transaction }))) return code;
  }
  throw new AppError(503, 'No pudimos generar el código de la reserva. Intenta de nuevo.');
}

export async function createReservation({ slotId, name, phone } = {}) {
  assertUuid(slotId, 'Selecciona un horario válido.');
  const customerName = normalizeCustomerName(name);
  if (!customerName) throw new AppError(422, 'Ingresa tu nombre (entre 2 y 80 caracteres).');
  const customerPhone = requirePhone(phone);
  const business = await findBusiness();

  try {
    const reservationId = await sequelize.transaction(async (transaction) => {
      const found = await TimeSlot.findByPk(slotId, { attributes: ['scheduleDayId'], transaction });
      if (!found) throw new AppError(404, 'El horario no existe.');

      // Same lock used by the admin panel: bookings and schedule edits on a day never interleave.
      const day = await lockDay(found.scheduleDayId, transaction);
      const slot = await TimeSlot.findByPk(slotId, { transaction });
      if (day.status !== 'PUBLISHED') throw new AppError(409, 'Este día ya no está disponible para reservas.');
      if (slot.isBlocked) throw new AppError(409, 'Este horario ya no está disponible. Elige otro.');
      if (slot.startsAt <= new Date()) throw new AppError(409, 'Este horario ya pasó. Elige otro.');

      const taken = await Reservation.findOne({
        where: { timeSlotId: slot.id, status: { [Op.in]: ['CONFIRMED', 'COMPLETED'] } },
        attributes: ['id'],
        transaction,
      });
      if (taken) throw new AppError(409, SLOT_TAKEN);

      // Atomic upsert: two bookings with the same new phone cannot collide on the unique index.
      const [[customer]] = await sequelize.query(`
        INSERT INTO customers (id, name, phone, created_at, updated_at)
        VALUES (gen_random_uuid(), :name, :phone, NOW(), NOW())
        ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()
        RETURNING id
      `, { replacements: { name: customerName, phone: customerPhone }, transaction });

      const reservation = await Reservation.create({
        timeSlotId: slot.id,
        customerId: customer.id,
        code: await uniqueCode(transaction),
      }, { transaction });
      return reservation.id;
    });

    const reservation = await Reservation.findByPk(reservationId, { include: reservationInclude });
    return serializeReservation(reservation, business.timezone);
  } catch (error) {
    // Last line of defense: the partial unique index on active reservations per slot.
    if (error instanceof UniqueConstraintError) throw new AppError(409, SLOT_TAKEN);
    throw error;
  }
}

async function findByCode(code) {
  const reservation = await Reservation.findOne({ where: { code: requireCode(code) }, include: reservationInclude });
  if (!reservation) throw new AppError(404, CODE_NOT_FOUND);
  return reservation;
}

// Lookup by code returns that reservation; by phone, every reservation made with that number.
export async function lookupReservations({ code, phone } = {}) {
  const business = await findBusiness();
  if (code) {
    return { byPhone: false, reservations: [serializeReservation(await findByCode(code), business.timezone)] };
  }
  if (phone) {
    const reservations = await Reservation.findAll({
      include: [
        { model: Customer, as: 'customer', where: { phone: requirePhone(phone) } },
        { model: TimeSlot, as: 'slot', include: [{ model: ScheduleDay, as: 'day' }] },
      ],
      order: [[{ model: TimeSlot, as: 'slot' }, 'startsAt', 'DESC']],
      limit: MAX_PHONE_RESULTS,
    });
    return {
      byPhone: true,
      reservations: reservations.map((item) => serializeReservation(item, business.timezone, { includeCode: false })),
    };
  }
  throw new AppError(422, 'Ingresa tu código de reserva o tu celular.');
}

export async function cancelReservation({ code } = {}) {
  const business = await findBusiness();
  const owned = await findByCode(code);

  await sequelize.transaction(async (transaction) => {
    await lockDay(owned.slot.scheduleDayId, transaction);
    const reservation = await Reservation.findByPk(owned.id, { transaction, lock: transaction.LOCK.UPDATE });
    if (reservation.status !== 'CONFIRMED') throw new AppError(409, 'Esta reserva ya no está activa.');
    if (!canCancel(owned.slot.startsAt)) {
      throw new AppError(422, `Solo puedes cancelar hasta ${CANCELLATION_LIMIT_HOURS} horas antes. Escríbele a Santiago.`);
    }
    await reservation.update({ status: 'CANCELLED', cancelledAt: new Date() }, { transaction });
  });

  await owned.reload({ include: reservationInclude });
  return serializeReservation(owned, business.timezone);
}
