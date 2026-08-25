import express from 'express';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';
import { validateBody, validateParamId, schemas } from '../middlewares/inputValidator.js';
import {
    createProgram,
    updateProgram,
    getMyPrograms,
    getProgramRoster,
    getTrainerPrograms,
    enrollInProgram,
    getMyEnrollments,
    cancelEnrollment,
    addProgressNote,
    getProgressNotes,
} from '../controllers/trainingProgramController.js';

const router = express.Router();

// Trainer-only: manage own programs
router.post('/', requireAuth, requireRole('trainer'), validateBody(schemas.createTrainingProgram), createProgram);
router.get('/mine', requireAuth, requireRole('trainer'), getMyPrograms);
router.put('/:id', requireAuth, requireRole('trainer'), validateParamId(), validateBody(schemas.updateTrainingProgram), updateProgram);
router.get('/:id/roster', requireAuth, requireRole('trainer'), validateParamId(), getProgramRoster);

// Public: browse a trainer's active programs
router.get('/trainer/:trainerId', validateParamId('trainerId'), getTrainerPrograms);

// Pet owner: enroll, view, cancel
router.post('/:id/enroll', requireAuth, validateParamId(), validateBody(schemas.enrollInProgram), enrollInProgram);
router.get('/my-enrollments', requireAuth, getMyEnrollments);
router.delete('/enrollments/:id', requireAuth, validateParamId('id'), cancelEnrollment);

// Progress notes — trainer writes, trainer + enrolled owner can read
router.post('/enrollments/:id/notes', requireAuth, requireRole('trainer'), validateParamId('id'), validateBody(schemas.addProgressNote), addProgressNote);
router.get('/enrollments/:id/notes', requireAuth, validateParamId('id'), getProgressNotes);

export default router;
