import express from 'express';
import { getProviders, getReviews, addReview } from '../controllers/providerController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { validateBody, validateParamId, schemas } from '../middlewares/inputValidator.js';

const router = express.Router();

router.get('/', getProviders);
router.get('/:id/reviews', validateParamId(), getReviews);
router.post('/:id/reviews', requireAuth, validateParamId(), validateBody(schemas.addReview), addReview);

export default router;
