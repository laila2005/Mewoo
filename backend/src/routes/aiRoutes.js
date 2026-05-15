import express from 'express';
import { agenticTriage } from '../controllers/aiAgentController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { validateBody, schemas } from '../middlewares/inputValidator.js';

const router = express.Router();

// Protected route: Only authenticated users can request AI triage
router.post('/triage', requireAuth, validateBody(schemas.aiTriage), agenticTriage);

export default router;
