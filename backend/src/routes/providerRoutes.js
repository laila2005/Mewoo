import express from 'express';
import { getProviders, getProviderById, getReviews, addReview, getVetPatients, getVetPatientHistory } from '../controllers/providerController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { validateBody, validateParamId, schemas } from '../middlewares/inputValidator.js';

const router = express.Router();

router.get('/', getProviders);
// Vet patient endpoints — must precede '/:id' so they aren't captured by it.
router.get('/patients', requireAuth, getVetPatients);
router.get('/patients/:petId/history', requireAuth, getVetPatientHistory);
router.get('/:id', getProviderById);
router.get('/:id/reviews', validateParamId(), getReviews);
router.post('/:id/reviews', requireAuth, validateParamId(), validateBody(schemas.addReview), addReview);

export default router;
