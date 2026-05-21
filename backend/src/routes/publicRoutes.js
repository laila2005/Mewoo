import express from 'express';
import { getPublicStats, getPublicPlans, getPublicProducts, getPublicShops, getActiveAdBanners } from '../controllers/publicController.js';
import { optionalAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/stats', getPublicStats);
router.get('/plans', optionalAuth, getPublicPlans);
router.get('/products', getPublicProducts);
router.get('/shops', getPublicShops);
router.get('/ads', getActiveAdBanners);

export default router;

