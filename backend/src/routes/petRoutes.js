import express from 'express';
import { createPet, getPets, getPetById, updatePet, deletePet, getAdoptablePets, getMatingPets, uploadMedicalRecord, addVaccination, getVaccinations, recommendAdoptablePets, getUpcomingVaccination } from '../controllers/petController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { validateBody, validateParamId, schemas } from '../middlewares/inputValidator.js';

const router = express.Router();

router.get('/adoptable', getAdoptablePets);
router.get('/mating', getMatingPets);
router.get('/recommend', recommendAdoptablePets);

router.use(requireAuth);

// Static authed routes BEFORE '/:id' so they aren't captured as an id param.
router.get('/upcoming-vaccination', getUpcomingVaccination);

router.post('/', validateBody(schemas.createPet), createPet);
router.get('/', getPets);
router.get('/:id', validateParamId(), getPetById);
router.put('/:id', validateParamId(), validateBody(schemas.updatePet), updatePet);
router.delete('/:id', validateParamId(), deletePet);
router.post('/:id/medical-records', validateParamId(), uploadMedicalRecord);
router.get('/:id/vaccinations', validateParamId(), getVaccinations);
router.post('/:id/vaccinations', validateParamId(), addVaccination);

export default router;
