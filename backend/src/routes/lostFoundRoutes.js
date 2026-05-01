import express from 'express';
import { reportLostPet, getLostPets, updateLostPetStatus, reportFoundPet, getFoundReports } from '../controllers/lostFoundController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

// Lost Pets
router.post('/lost', reportLostPet);
router.get('/lost', getLostPets);
router.put('/lost/:id/status', updateLostPetStatus);

// Found Reports
router.post('/found', reportFoundPet);
router.get('/found', getFoundReports);

export default router;
