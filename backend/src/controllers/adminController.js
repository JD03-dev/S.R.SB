import * as schedules from '../services/adminScheduleService.js';
import { getBusinessSettings, updateBusinessSettings } from '../services/businessService.js';

export async function showBusiness(_req, res) {
  res.json({ data: await getBusinessSettings() });
}

export async function updateBusiness(req, res) {
  res.json({ data: await updateBusinessSettings(req.body) });
}

export async function listSchedules(_req, res) {
  res.json({ data: await schedules.listSchedules() });
}

export async function createSchedule(req, res) {
  res.status(201).json({ data: await schedules.createSchedule(req.body) });
}

export async function showSchedule(req, res) {
  res.json({ data: await schedules.getSchedule(req.params.scheduleId) });
}

export async function updateDaysStatus(req, res) {
  res.json({ data: await schedules.setDaysStatus(req.params.scheduleId, req.body) });
}

export async function generateSlots(req, res) {
  res.json({ data: await schedules.generateDaySlots(req.params.dayId, req.body) });
}

export async function createSlot(req, res) {
  res.status(201).json({ data: await schedules.createSlot(req.params.dayId, req.body) });
}

export async function updateSlot(req, res) {
  res.json({ data: await schedules.updateSlot(req.params.slotId, req.body) });
}

export async function deleteSlot(req, res) {
  res.json({ data: await schedules.deleteSlot(req.params.slotId) });
}
