import express from 'express';
import { getAnalytics, getUsers, verifyProfile, getAllServices, getAllBookings } from '../controllers/adminController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/analytics', requireAuth, getAnalytics);
router.get('/users', requireAuth, getUsers);
router.get('/services', requireAuth, getAllServices);
router.get('/bookings', requireAuth, getAllBookings);
router.put('/verify/:id', requireAuth, verifyProfile);

export default router;
