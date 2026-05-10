import express from 'express';
import { createAppointment, getUserAppointments, getAllAppointments } from '../controllers/bookingController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Protected routes (user must be logged in to book or view appointments)
router.use(requireAuth);

router.post('/appointments', createAppointment);
router.get('/appointments', getUserAppointments);

// Admin: Get all bookings system-wide
router.get('/all', getAllAppointments);

export default router;
