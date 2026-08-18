import express from 'express';
import { createAppointment, getUserAppointments, getAllAppointments, createServiceBooking, cancelAppointment, rescheduleAppointment, createGuestAppointment, updateAppointmentStatus, getAppointmentIcs } from '../controllers/bookingController.js';
import { requireAuth, requireAdmin } from '../middlewares/authMiddleware.js';
import { validateBody, schemas } from '../middlewares/inputValidator.js';

const router = express.Router();

// Guest Booking (Public)
router.post('/guest-appointment', createGuestAppointment);

// Downloadable calendar entry — opened natively by iOS/Android/Outlook.
// Mounted BEFORE requireAuth on purpose: this link is clicked from an EMAIL, in
// a browser with no Authorization header. Access is proven by a signed ?t=
// token instead (see services/calendarLinks.js), so the link works without a
// session but cannot be guessed.
router.get('/appointments/:id/calendar.ics', getAppointmentIcs);

// Protected routes (user must be logged in to book or view appointments)
router.use(requireAuth);

router.post('/appointments', validateBody(schemas.createAppointment), createAppointment);
router.get('/appointments', getUserAppointments);
router.delete('/appointments/:id', cancelAppointment);
router.put('/appointments/:id/cancel', cancelAppointment); // frontend uses PUT .../cancel
router.put('/appointments/:id/reschedule', rescheduleAppointment);
// The provider's Work Tracker confirms/completes/cancels here. This route was
// MISSING while the dashboard already called it — the 404 was swallowed client
// side, so a "confirmed" appointment silently stayed pending.
router.put('/appointments/:id/status', updateAppointmentStatus);

// Service Bookings (Marketplace)
router.post('/services', createServiceBooking);
// F-09: this returned EVERY appointment on the platform — pet, vet, and the
// full name and email address of every owner — to any authenticated account,
// whatever its role. It is an admin report, so it now requires an admin.
router.get('/all', requireAdmin, getAllAppointments);

export default router;
