import express from 'express';
import { submitApplication, getMyApplications, getApplicationsForPet, updateApplicationStatus } from '../controllers/adoptionController.js';
import { getAdoptablePets } from '../controllers/petController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { validateBody, schemas } from '../middlewares/inputValidator.js';

const router = express.Router();

// Public
router.get('/pets', getAdoptablePets);

// Protected
router.post('/apply', requireAuth, validateBody(schemas.submitAdoptionApplication), submitApplication);
router.get('/my-applications', requireAuth, getMyApplications);
router.get('/pet/:petId/applications', requireAuth, getApplicationsForPet);
router.put('/:id/status', requireAuth, updateApplicationStatus);

export default router;
