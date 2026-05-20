import express from 'express';
import { getPublicStats, getPublicPlans, getPublicProducts } from '../controllers/publicController.js';

const router = express.Router();

router.get('/stats', getPublicStats);
router.get('/plans', getPublicPlans);
router.get('/products', getPublicProducts);

export default router;

