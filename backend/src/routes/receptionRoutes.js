import express from 'express';
import { getSummary, getDay, setStatus, reschedule } from '../controllers/receptionController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { requireClinicAssistant } from '../middlewares/clinicScope.js';
import { validateParamId } from '../middlewares/inputValidator.js';

const router = express.Router();

// Deliberately a separate router from clinicRoutes. Those are vet-only seat
// management; these are assistant-only desk tools. Keeping them apart means
// neither guard can be widened by accident while editing the other.
router.use(requireAuth, requireClinicAssistant);

router.get('/summary', getSummary);
router.get('/appointments', getDay);
router.patch('/appointments/:id/status', validateParamId(), setStatus);
router.put('/appointments/:id/reschedule', validateParamId(), reschedule);

export default router;
