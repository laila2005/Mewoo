import express from 'express';
import { createService, getServices, getServiceById, updateService } from '../controllers/serviceController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { validateBody, validateParamId, validateQuery, schemas } from '../middlewares/inputValidator.js';

const router = express.Router();

// Story 4: Whitelist query parameters for filtering
router.get('/', validateQuery(schemas.servicesQuery), getServices);
router.get('/:id', validateParamId(), getServiceById);

// Protected routes (for providers)
router.use(requireAuth);
router.post('/', validateBody(schemas.createService), createService);
router.put('/:id', validateParamId(), validateBody(schemas.updateService), updateService);

export default router;
