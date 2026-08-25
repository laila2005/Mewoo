import express from 'express';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';
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
router.post('/', requireAuth, requireRole('trainer'), createProgram);
router.get('/mine', requireAuth, requireRole('trainer'), getMyPrograms);
router.put('/:id', requireAuth, requireRole('trainer'), updateProgram);
router.get('/:id/roster', requireAuth, requireRole('trainer'), getProgramRoster);

// Public: browse a trainer's active programs
router.get('/trainer/:trainerId', getTrainerPrograms);

// Pet owner: enroll, view, cancel
router.post('/:id/enroll', requireAuth, enrollInProgram);
router.get('/my-enrollments', requireAuth, getMyEnrollments);
router.delete('/enrollments/:id', requireAuth, cancelEnrollment);

// Progress notes — trainer writes, trainer + enrolled owner can read
router.post('/enrollments/:id/notes', requireAuth, requireRole('trainer'), addProgressNote);
router.get('/enrollments/:id/notes', requireAuth, getProgressNotes);

export default router;
