import express from 'express';
import { agenticTriage } from '../controllers/aiAgentController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Protected route: Only authenticated users can request AI triage
router.post('/triage', requireAuth, agenticTriage);

export default router;
