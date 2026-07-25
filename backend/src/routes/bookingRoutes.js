import express from 'express';
import { createAppointment, getUserAppointments, getAllAppointments, createServiceBooking, cancelAppointment, rescheduleAppointment, createGuestAppointment } from '../controllers/bookingController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { validateBody, schemas } from '../middlewares/inputValidator.js';

const router = express.Router();

// Guest Booking (Public)
router.post('/guest-appointment', createGuestAppointment);

// Protected routes (user must be logged in to book or view appointments)
router.use(requireAuth);

router.post('/appointments', validateBody(schemas.createAppointment), createAppointment);
router.get('/appointments', getUserAppointments);
router.delete('/appointments/:id', cancelAppointment);
router.put('/appointments/:id/cancel', cancelAppointment); // frontend uses PUT .../cancel
router.put('/appointments/:id/reschedule', rescheduleAppointment);

// Service Bookings (Marketplace)
router.post('/services', createServiceBooking);
router.get('/all', getAllAppointments);

export default router;
