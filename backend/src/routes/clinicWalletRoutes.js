import express from 'express';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { validateBody, validateParamId, schemas } from '../middlewares/inputValidator.js';
import { getWallet, depositToWallet } from '../controllers/clinicWalletController.js';

const router = express.Router();

router.get('/:vetId', requireAuth, validateParamId('vetId'), getWallet);
router.post('/:vetId/deposit', requireAuth, validateParamId('vetId'), validateBody(schemas.depositToWallet), depositToWallet);

export default router;
