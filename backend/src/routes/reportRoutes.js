import express from 'express';
import { createReport, getReportReasons } from '../controllers/reportController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

// The reason list is public so the dialog and the server cannot drift apart.
router.get('/reasons', getReportReasons);

// Signed-in only. An anonymous report queue is a queue of noise, and there
// would be no way to apply the one-open-report-per-person rule.
router.post('/', requireAuth, createReport);

export default router;
