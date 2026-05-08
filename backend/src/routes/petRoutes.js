import express from 'express';
import { createPet, getPets, getPetById, updatePet, deletePet, getAdoptablePets, getMatingPets } from '../controllers/petController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/adoptable', getAdoptablePets);
router.get('/mating', getMatingPets);

router.use(requireAuth);

router.post('/', createPet);
router.get('/', getPets);
router.get('/:id', getPetById);
router.put('/:id', updatePet);
router.delete('/:id', deletePet);

export default router;
