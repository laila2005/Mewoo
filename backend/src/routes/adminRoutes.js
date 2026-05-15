import express from 'express';
import { getAnalytics } from '../controllers/adminController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/analytics', requireAuth, getAnalytics);

export default router;
