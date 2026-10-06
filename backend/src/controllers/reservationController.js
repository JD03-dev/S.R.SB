import { cancelReservation, createReservation, lookupReservations } from '../services/reservationService.js';

export async function create(req, res) {
  res.status(201).json({ data: await createReservation(req.body) });
}

export async function lookup(req, res) {
  res.set('Cache-Control', 'no-store').json({ data: await lookupReservations(req.body) });
}

export async function cancel(req, res) {
  res.json({ data: await cancelReservation(req.body) });
}
