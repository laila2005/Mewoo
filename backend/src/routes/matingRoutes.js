import express from 'express';
import { 
    submitMatingRequest, 
    getIncomingMatingRequests, 
    getOutgoingMatingRequests, 
    updateMatingStatus 
} from '../controllers/matingController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { validateBody, validateParamId } from '../middlewares/inputValidator.js';
import { schemas } from '../middlewares/inputValidator.js';

const router = express.Router();

router.use(requireAuth);

router.post('/request', validateBody(schemas.submitMatingRequest), submitMatingRequest);
router.get('/incoming', getIncomingMatingRequests);
router.get('/outgoing', getOutgoingMatingRequests);
router.put('/request/:id/status', validateParamId('id'), validateBody(schemas.updateMatingStatus), updateMatingStatus);

export default router;
