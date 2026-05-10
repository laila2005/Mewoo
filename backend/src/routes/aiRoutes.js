import express from 'express';
import { triageBridge } from '../controllers/aiIntegrationController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { validateBody, schemas } from '../middlewares/inputValidator.js';

const router = express.Router();

// Protected route: Only authenticated users can request AI triage
router.post('/triage', requireAuth, validateBody(schemas.aiTriage), triageBridge);

export default router;
