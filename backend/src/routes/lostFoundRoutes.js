import express from 'express';
import { reportLostPet, getLostPets, updateLostPetStatus, reportFoundPet, getFoundReports } from '../controllers/lostFoundController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { validateBody, validateParamId, schemas } from '../middlewares/inputValidator.js';

const router = express.Router();

router.use(requireAuth);

// Lost Pets
router.post('/lost', validateBody(schemas.reportLostPet), reportLostPet);
router.get('/lost', getLostPets);
router.put('/lost/:id/status', validateParamId(), validateBody(schemas.updateLostPetStatus), updateLostPetStatus);

// Found Reports
router.post('/found', validateBody(schemas.reportFoundPet), reportFoundPet);
router.get('/found', getFoundReports);

export default router;
