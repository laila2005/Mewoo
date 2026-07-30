import express from 'express';
import { reportLostPet, getLostPets, updateLostPetStatus, reportFoundPet, getFoundReports, matchLostPets } from '../controllers/lostFoundController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { validateBody, validateParamId, schemas } from '../middlewares/inputValidator.js';

const router = express.Router();

// Public — anyone can browse lost/found pets + run a match search
router.get('/lost', getLostPets);
router.get('/found', getFoundReports);
router.post('/match', matchLostPets);

// Protected — must be logged in to report
router.post('/lost', requireAuth, validateBody(schemas.reportLostPet), reportLostPet);
router.post('/found', requireAuth, validateBody(schemas.reportFoundPet), reportFoundPet);
router.put('/lost/:id/status', requireAuth, validateParamId(), validateBody(schemas.updateLostPetStatus), updateLostPetStatus);

export default router;
