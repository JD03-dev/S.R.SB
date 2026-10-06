import { Op } from 'sequelize';
import { Business, Reservation, ScheduleDay, TimeSlot, WeeklySchedule } from '../models/index.js';
import { AppError } from '../utils/AppError.js';
import { addDays, todayInZone, utcToZonedTime } from '../utils/time.js';
import { assertUuid } from '../utils/validation.js';
import { findBusiness } from './businessService.js';

const ACTIVE_RESERVATION = ['CONFIRMED', 'COMPLETED'];

// Public view grouped by week: only published, future, unblocked slots. Never exposes customers.
async function publishedWeeks(business, scheduleWhere = {}) {
  const now = new Date();
  const days = await ScheduleDay.findAll({
    where: { status: 'PUBLISHED', date: { [Op.gte]: todayInZone(business.timezone, now) } },
    include: [
      {
        model: WeeklySchedule,
        as: 'schedule',
        attributes: ['id', 'weekStart'],
        where: { businessId: business.id, ...scheduleWhere },
      },
      {
        model: TimeSlot,
        as: 'slots',
        where: { isBlocked: false, startsAt: { [Op.gt]: now } },
        include: [{
          model: Reservation,
          as: 'reservations',
          attributes: ['id'],
          where: { status: { [Op.in]: ACTIVE_RESERVATION } },
          required: false,
        }],
      },
    ],
    order: [['date', 'ASC'], [{ model: TimeSlot, as: 'slots' }, 'startsAt', 'ASC']],
  });

  const weeks = new Map();
  for (const day of days) {
    const { weekStart } = day.schedule;
    if (!weeks.has(weekStart)) weeks.set(weekStart, { weekStart, weekEnd: addDays(weekStart, 6), days: [] });
    weeks.get(weekStart).days.push({
      date: day.date,
      slots: day.slots.map((slot) => ({
        id: slot.id,
        start: utcToZonedTime(slot.startsAt, business.timezone),
        end: utcToZonedTime(slot.endsAt, business.timezone),
        available: slot.reservations.length === 0,
      })),
    });
  }
  return [...weeks.values()].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

const serializeBusiness = (business) => ({ name: business.name });

export async function getPublicAvailability() {
  const business = await findBusiness();
  return { business: serializeBusiness(business), weeks: await publishedWeeks(business) };
}

export async function getPublicSchedule(publicCode) {
  assertUuid(publicCode, 'El enlace de la agenda no es válido.');
  const schedule = await WeeklySchedule.findOne({
    where: { publicCode },
    include: [{ model: Business, as: 'business' }],
  });
  if (!schedule) throw new AppError(404, 'Esta agenda no existe.');
  return {
    business: serializeBusiness(schedule.business),
    weeks: await publishedWeeks(schedule.business, { id: schedule.id }),
  };
}
