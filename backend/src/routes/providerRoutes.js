import express from 'express';
import { getProviders, getProviderById, getReviews, addReview } from '../controllers/providerController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', getProviders);
router.get('/:id', getProviderById);
router.get('/:id/reviews', getReviews);
router.post('/:id/reviews', requireAuth, addReview);

export default router;
