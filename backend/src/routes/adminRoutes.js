import express from 'express';
import { getAnalytics, getUsers, verifyProfile, getAllServices, getAllBookings, toggleBanUser, deleteUser, getAllPosts, deletePost, getAllSubscriptions } from '../controllers/adminController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/analytics', requireAuth, getAnalytics);
router.get('/users', requireAuth, getUsers);
router.put('/users/:id/ban', requireAuth, toggleBanUser);
router.delete('/users/:id', requireAuth, deleteUser);
router.get('/services', requireAuth, getAllServices);
router.get('/bookings', requireAuth, getAllBookings);
router.put('/verify/:id', requireAuth, verifyProfile);
router.get('/posts', requireAuth, getAllPosts);
router.delete('/posts/:id', requireAuth, deletePost);
router.get('/subscriptions', requireAuth, getAllSubscriptions);

export default router;
