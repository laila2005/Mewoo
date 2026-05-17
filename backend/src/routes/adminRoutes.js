import express from 'express';
import { getAnalytics, getUsers, verifyProfile } from '../controllers/adminController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/analytics', requireAuth, getAnalytics);
router.get('/users', requireAuth, getUsers);
router.put('/verify/:id', requireAuth, verifyProfile);

export default router;
