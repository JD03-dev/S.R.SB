import { getPublicAvailability, getPublicSchedule } from '../services/publicScheduleService.js';

export async function showAvailability(_req, res) {
  res.set('Cache-Control', 'no-store').json({ data: await getPublicAvailability() });
}

export async function showPublicSchedule(req, res) {
  res.set('Cache-Control', 'no-store').json({ data: await getPublicSchedule(req.params.publicCode) });
}
