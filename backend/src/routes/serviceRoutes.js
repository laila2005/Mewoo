import express from 'express';
import { createService, getServices, getServiceById, updateService } from '../controllers/serviceController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', getServices);
router.get('/:id', getServiceById);

// Protected routes (for providers)
router.use(requireAuth);
router.post('/', createService);
router.put('/:id', updateService);

export default router;
