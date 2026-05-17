import express from 'express';
import { agenticTriage } from '../controllers/aiAgentController.js';
import { optionalAuth } from '../middlewares/authMiddleware.js';
import { validateBody, schemas } from '../middlewares/inputValidator.js';

const router = express.Router();

// Protected route: Authenticated users get booking privileges, guests can just chat
router.post('/triage', optionalAuth, validateBody(schemas.aiTriage), agenticTriage);

export default router;
