import express from 'express';
import { createAssistant, listAssistants, setAssistantStatus, removeAssistant } from '../controllers/clinicController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';
import { validateParamId } from '../middlewares/inputValidator.js';

const router = express.Router();

// Clinic team management — vet-only.
router.use(requireAuth, requireRole('vet'));

router.get('/assistants', listAssistants);
router.post('/assistants', createAssistant);
router.patch('/assistants/:id/status', validateParamId(), setAssistantStatus);
router.delete('/assistants/:id', validateParamId(), removeAssistant);

export default router;
