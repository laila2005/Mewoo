import express from 'express';
import { createPet, getPets, getPetById, updatePet, deletePet, getAdoptablePets, getMatingPets } from '../controllers/petController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { validateBody, validateParamId, schemas } from '../middlewares/inputValidator.js';

const router = express.Router();

router.get('/adoptable', getAdoptablePets);
router.get('/mating', getMatingPets);

router.use(requireAuth);

router.post('/', validateBody(schemas.createPet), createPet);
router.get('/', getPets);
router.get('/:id', validateParamId(), getPetById);
router.put('/:id', validateParamId(), validateBody(schemas.updatePet), updatePet);
router.delete('/:id', validateParamId(), deletePet);

export default router;
