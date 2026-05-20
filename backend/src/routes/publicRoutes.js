import express from 'express';
import { getPublicStats, getPublicPlans, getPublicProducts, getPublicShops } from '../controllers/publicController.js';

const router = express.Router();

router.get('/stats', getPublicStats);
router.get('/plans', getPublicPlans);
router.get('/products', getPublicProducts);
router.get('/shops', getPublicShops);

export default router;

