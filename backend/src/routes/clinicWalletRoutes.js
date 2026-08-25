import express from 'express';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { getWallet, depositToWallet } from '../controllers/clinicWalletController.js';

const router = express.Router();

router.get('/:vetId', requireAuth, getWallet);
router.post('/:vetId/deposit', requireAuth, depositToWallet);

export default router;
