import express from 'express';
import { getProviders, getReviews, addReview } from '../controllers/providerController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', getProviders);
router.get('/:id/reviews', getReviews);
router.post('/:id/reviews', requireAuth, addReview);

export default router;
