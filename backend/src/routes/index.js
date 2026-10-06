import { Router } from 'express';
import * as admin from '../controllers/adminController.js';
import * as auth from '../controllers/authController.js';
import { health, readiness } from '../controllers/healthController.js';
import * as reservations from '../controllers/reservationController.js';
import { showAvailability, showPublicSchedule } from '../controllers/scheduleController.js';
import { requireAdmin, requireOwner, requireWriteAccess } from '../middlewares/auth.js';
import { rateLimit } from '../middlewares/rateLimit.js';

const bookingLimit = rateLimit({ max: 10, windowMinutes: 10, message: 'Demasiadas reservas seguidas. Intenta en unos minutos.' });
const lookupLimit = rateLimit({ max: 20, windowMinutes: 10, message: 'Demasiados intentos. Intenta en unos minutos.' });
const accountLimit = rateLimit({ max: 10, windowMinutes: 10, message: 'Demasiados intentos. Intenta en unos minutos.' });

export const apiRouter = Router();
apiRouter.get('/health', health);
apiRouter.get('/health/ready', readiness);
apiRouter.get('/public/availability', showAvailability);
apiRouter.get('/public/schedules/:publicCode', showPublicSchedule);
apiRouter.post('/public/reservations', bookingLimit, reservations.create);
// Lookup and cancel use POST so the phone number never appears in URLs or logs.
apiRouter.post('/public/reservations/lookup', lookupLimit, reservations.lookup);
apiRouter.post('/public/reservations/cancel', lookupLimit, reservations.cancel);

apiRouter.get('/auth/status', auth.status);
apiRouter.post('/auth/login', auth.createSession);
apiRouter.get('/auth/session', requireAdmin, auth.showSession);
apiRouter.post('/auth/logout', requireAdmin, auth.endSession);
apiRouter.post('/auth/register', accountLimit, auth.register);
apiRouter.post('/auth/account/verify', accountLimit, auth.verifyAccount);
apiRouter.put('/auth/account', accountLimit, auth.updateAccount);

const adminRouter = Router();
adminRouter.use(requireAdmin);
adminRouter.get('/business', admin.showBusiness);
adminRouter.get('/schedules', admin.listSchedules);
adminRouter.get('/schedules/:scheduleId', admin.showSchedule);
adminRouter.get('/accounts', requireOwner, auth.listAccounts);

adminRouter.use(requireWriteAccess);
adminRouter.put('/me', auth.updateMe);
adminRouter.post('/me/recovery-code', auth.newRecoveryCode);
adminRouter.post('/accounts', requireOwner, auth.createAccount);
adminRouter.post('/accounts/:adminId/recovery-code', requireOwner, auth.newAccountRecoveryCode);
adminRouter.put('/business', admin.updateBusiness);
adminRouter.post('/schedules', admin.createSchedule);
adminRouter.patch('/schedules/:scheduleId/days', admin.updateDaysStatus);
adminRouter.post('/days/:dayId/slots/generate', admin.generateSlots);
adminRouter.post('/days/:dayId/slots', admin.createSlot);
adminRouter.patch('/slots/:slotId', admin.updateSlot);
adminRouter.delete('/slots/:slotId', admin.deleteSlot);

apiRouter.use('/admin', adminRouter);
