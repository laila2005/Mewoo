import express from 'express';
import { createPet, getPets, getPetById, updatePet, deletePet } from '../controllers/petController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

router.post('/', createPet);
router.get('/', getPets);
router.get('/:id', getPetById);
router.put('/:id', updatePet);
router.delete('/:id', deletePet);

export default router;
