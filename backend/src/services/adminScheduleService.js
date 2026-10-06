import { UniqueConstraintError } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Reservation, ScheduleDay, TimeSlot, WeeklySchedule } from '../models/index.js';
import { AppError } from '../utils/AppError.js';
import { assertUuid } from '../utils/validation.js';
import {
  addDays, isDateOnly, isMonday, isTime, mondayOf, timeToMinutes, todayInZone, utcToZonedTime, zonedToUtc,
} from '../utils/time.js';
import { findBusiness, validateBusinessHours } from './businessService.js';

const DAY_STATUSES = ['DRAFT', 'PUBLISHED', 'DISABLED'];
const ACTIVE_RESERVATION = ['CONFIRMED', 'COMPLETED'];

const slotInclude = {
  model: TimeSlot,
  as: 'slots',
  required: false,
  include: [{ model: Reservation, as: 'reservations', attributes: ['id', 'status'], required: false }],
};

function serializeSlot(slot, timeZone) {
  const reservations = slot.reservations || [];
  return {
    id: slot.id,
    start: utcToZonedTime(slot.startsAt, timeZone),
    end: utcToZonedTime(slot.endsAt, timeZone),
    isBlocked: slot.isBlocked,
    hasActiveReservation: reservations.some((item) => ACTIVE_RESERVATION.includes(item.status)),
    hasReservationHistory: reservations.length > 0,
  };
}

function serializeDay(day, timeZone) {
  const slots = [...(day.slots || [])].sort((a, b) => a.startsAt - b.startsAt);
  return { id: day.id, date: day.date, status: day.status, slots: slots.map((slot) => serializeSlot(slot, timeZone)) };
}

function serializeSchedule(schedule, timeZone) {
  const days = [...(schedule.days || [])].sort((a, b) => a.date.localeCompare(b.date));
  return {
    id: schedule.id,
    weekStart: schedule.weekStart,
    weekEnd: addDays(schedule.weekStart, 6),
    publicCode: schedule.publicCode,
    days: days.map((day) => serializeDay(day, timeZone)),
  };
}

async function loadSchedule(scheduleId, timeZone, transaction) {
  const schedule = await WeeklySchedule.findByPk(scheduleId, {
    include: [{ model: ScheduleDay, as: 'days', include: [slotInclude] }],
    transaction,
  });
  if (!schedule) throw new AppError(404, 'La agenda no existe.');
  return serializeSchedule(schedule, timeZone);
}

async function loadDay(dayId, timeZone, transaction) {
  const day = await ScheduleDay.findByPk(dayId, { include: [slotInclude], transaction });
  return serializeDay(day, timeZone);
}

// Every change to a day locks its row so edits, publication and bookings are serialized.
export async function lockDay(dayId, transaction) {
  assertUuid(dayId, 'El día no es válido.');
  const day = await ScheduleDay.findByPk(dayId, { transaction, lock: transaction.LOCK.UPDATE });
  if (!day) throw new AppError(404, 'El día no existe.');
  return day;
}

function assertEditableDate(day, timeZone) {
  if (day.date < todayInZone(timeZone)) throw new AppError(422, 'No se pueden modificar días que ya pasaron.');
}

function daySlots(day, transaction) {
  return TimeSlot.findAll({
    where: { scheduleDayId: day.id },
    include: [{ model: Reservation, as: 'reservations', attributes: ['id', 'status'], required: false }],
    transaction,
  });
}

const hasActiveReservation = (slot) => slot.reservations.some((item) => ACTIVE_RESERVATION.includes(item.status));

function parseRange({ start, end }, day, timeZone) {
  if (!isTime(start) || !isTime(end)) throw new AppError(422, 'Las horas deben tener formato HH:mm.');
  if (timeToMinutes(start) >= timeToMinutes(end)) throw new AppError(422, 'La hora de inicio debe ser anterior a la de fin.');
  return { startsAt: zonedToUtc(day.date, start, timeZone), endsAt: zonedToUtc(day.date, end, timeZone) };
}

function assertNoOverlap(slots, range, ignoreId) {
  const overlap = slots.find((slot) => slot.id !== ignoreId
    && slot.startsAt < range.endsAt && range.startsAt < slot.endsAt);
  if (overlap) throw new AppError(409, 'El horario se cruza con otro espacio del mismo día.');
}

export async function listSchedules() {
  const business = await findBusiness();
  const schedules = await WeeklySchedule.findAll({
    where: { businessId: business.id },
    include: [{
      model: ScheduleDay, as: 'days', attributes: ['id', 'date', 'status'],
      include: [{ model: TimeSlot, as: 'slots', attributes: ['id', 'isBlocked', 'startsAt', 'endsAt'], required: false }],
    }],
    order: [['weekStart', 'DESC']],
  });
  return schedules.map((schedule) => {
    const days = schedule.days.map((day) => ({
      id: day.id,
      date: day.date,
      status: day.status,
      slotCount: day.slots.length,
      openSlotCount: day.slots.filter((slot) => !slot.isBlocked).length,
    })).sort((a, b) => a.date.localeCompare(b.date));
    return { id: schedule.id, weekStart: schedule.weekStart, weekEnd: addDays(schedule.weekStart, 6), publicCode: schedule.publicCode, days };
  });
}

export async function getSchedule(scheduleId) {
  assertUuid(scheduleId, 'La agenda no es válida.');
  const business = await findBusiness();
  return loadSchedule(scheduleId, business.timezone);
}

export async function createSchedule({ weekStart } = {}) {
  if (!isDateOnly(weekStart) || !isMonday(weekStart)) {
    throw new AppError(422, 'La semana debe iniciar un lunes (formato AAAA-MM-DD).');
  }
  const business = await findBusiness();
  if (weekStart < mondayOf(todayInZone(business.timezone))) {
    throw new AppError(422, 'No se pueden crear agendas de semanas pasadas.');
  }

  try {
    const scheduleId = await sequelize.transaction(async (transaction) => {
      const schedule = await WeeklySchedule.create({ businessId: business.id, weekStart }, { transaction });
      await ScheduleDay.bulkCreate(
        Array.from({ length: 7 }, (_, index) => ({ weeklyScheduleId: schedule.id, date: addDays(weekStart, index) })),
        { transaction },
      );
      return schedule.id;
    });
    return loadSchedule(scheduleId, business.timezone);
  } catch (error) {
    if (error instanceof UniqueConstraintError) throw new AppError(409, 'Ya existe una agenda para esa semana.');
    throw error;
  }
}

export async function generateDaySlots(dayId, input = {}) {
  const business = await findBusiness();
  const { slots } = validateBusinessHours({
    openingTime: input.openingTime ?? business.openingTime?.slice(0, 5),
    closingTime: input.closingTime ?? business.closingTime?.slice(0, 5),
    breakStart: input.breakStart !== undefined ? input.breakStart : business.breakStart?.slice(0, 5),
    breakEnd: input.breakEnd !== undefined ? input.breakEnd : business.breakEnd?.slice(0, 5),
    serviceDurationMinutes: input.serviceDurationMinutes ?? business.serviceDurationMinutes,
  });

  return sequelize.transaction(async (transaction) => {
    const day = await lockDay(dayId, transaction);
    assertEditableDate(day, business.timezone);
    const existing = await daySlots(day, transaction);
    if (existing.some((slot) => slot.reservations.length > 0)) {
      throw new AppError(409, 'Este día ya tiene reservas. Edita sus horarios uno por uno para no afectarlas.');
    }
    await TimeSlot.destroy({ where: { scheduleDayId: day.id }, transaction });
    await TimeSlot.bulkCreate(slots.map((slot) => ({
      scheduleDayId: day.id,
      startsAt: zonedToUtc(day.date, slot.start, business.timezone),
      endsAt: zonedToUtc(day.date, slot.end, business.timezone),
    })), { transaction });
    return loadDay(day.id, business.timezone, transaction);
  });
}

export async function createSlot(dayId, input = {}) {
  const business = await findBusiness();
  return sequelize.transaction(async (transaction) => {
    const day = await lockDay(dayId, transaction);
    assertEditableDate(day, business.timezone);
    const range = parseRange(input, day, business.timezone);
    assertNoOverlap(await daySlots(day, transaction), range);
    await TimeSlot.create({ scheduleDayId: day.id, ...range }, { transaction });
    return loadDay(day.id, business.timezone, transaction);
  });
}

async function findSlotWithLockedDay(slotId, transaction) {
  assertUuid(slotId, 'El horario no es válido.');
  const found = await TimeSlot.findByPk(slotId, { attributes: ['scheduleDayId'], transaction });
  if (!found) throw new AppError(404, 'El horario no existe.');
  const day = await lockDay(found.scheduleDayId, transaction);
  const slots = await daySlots(day, transaction);
  return { day, slots, slot: slots.find((item) => item.id === slotId) };
}

export async function updateSlot(slotId, input = {}) {
  const business = await findBusiness();
  return sequelize.transaction(async (transaction) => {
    const { day, slots, slot } = await findSlotWithLockedDay(slotId, transaction);
    assertEditableDate(day, business.timezone);
    const changes = {};

    if (input.start !== undefined || input.end !== undefined) {
      const range = parseRange({
        start: input.start ?? utcToZonedTime(slot.startsAt, business.timezone),
        end: input.end ?? utcToZonedTime(slot.endsAt, business.timezone),
      }, day, business.timezone);
      const moved = range.startsAt.getTime() !== slot.startsAt.getTime() || range.endsAt.getTime() !== slot.endsAt.getTime();
      if (moved && hasActiveReservation(slot)) {
        throw new AppError(409, 'Este horario tiene una reserva confirmada; no se puede cambiar su hora.');
      }
      assertNoOverlap(slots, range, slot.id);
      Object.assign(changes, range);
    }

    if (input.isBlocked !== undefined) {
      if (typeof input.isBlocked !== 'boolean') throw new AppError(422, 'El bloqueo debe ser verdadero o falso.');
      if (input.isBlocked && hasActiveReservation(slot)) {
        throw new AppError(409, 'Este horario tiene una reserva confirmada; no se puede bloquear.');
      }
      changes.isBlocked = input.isBlocked;
    }

    await slot.update(changes, { transaction });
    return loadDay(day.id, business.timezone, transaction);
  });
}

export async function deleteSlot(slotId) {
  const business = await findBusiness();
  return sequelize.transaction(async (transaction) => {
    const { day, slot } = await findSlotWithLockedDay(slotId, transaction);
    assertEditableDate(day, business.timezone);
    if (slot.reservations.length > 0) {
      throw new AppError(409, 'Este horario tiene reservas registradas; bloquéalo en lugar de eliminarlo.');
    }
    await slot.destroy({ transaction });
    return loadDay(day.id, business.timezone, transaction);
  });
}

export async function setDaysStatus(scheduleId, { dayIds, status } = {}) {
  assertUuid(scheduleId, 'La agenda no es válida.');
  if (!DAY_STATUSES.includes(status)) throw new AppError(422, 'El estado del día no es válido.');
  if (!Array.isArray(dayIds) || dayIds.length === 0 || dayIds.length > 7) {
    throw new AppError(422, 'Selecciona al menos un día.');
  }
  const business = await findBusiness();

  await sequelize.transaction(async (transaction) => {
    // Sorted ids give a consistent lock order between concurrent requests.
    for (const dayId of [...new Set(dayIds)].sort()) {
      const day = await lockDay(dayId, transaction);
      if (day.weeklyScheduleId !== scheduleId) throw new AppError(422, 'Uno de los días no pertenece a esta agenda.');
      if (day.status === status) continue;
      assertEditableDate(day, business.timezone);
      const slots = await daySlots(day, transaction);

      if (status === 'PUBLISHED' && !slots.some((slot) => !slot.isBlocked)) {
        throw new AppError(422, 'Para publicar un día primero genera o agrega horarios disponibles.');
      }
      if (status !== 'PUBLISHED' && slots.some(hasActiveReservation)) {
        throw new AppError(409, 'Un día con reservas confirmadas no se puede ocultar ni deshabilitar.');
      }
      await day.update({ status }, { transaction });
    }
  });

  return loadSchedule(scheduleId, business.timezone);
}
