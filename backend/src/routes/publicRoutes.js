import express from 'express';
import { 
    getPublicStats, 
    getPublicPlans, 
    getPublicProducts, 
    getPublicProductById, 
    getProductReviews, 
    addProductReview, 
    getPublicShops, 
    getActiveAdBanners 
} from '../controllers/publicController.js';
import { requireAuth, optionalAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/stats', getPublicStats);
router.get('/plans', optionalAuth, getPublicPlans);
router.get('/products', getPublicProducts);
router.get('/products/:id', getPublicProductById);
router.get('/products/:id/reviews', getProductReviews);
router.post('/products/:id/reviews', requireAuth, addProductReview);
router.get('/shops', getPublicShops);
router.get('/ads', getActiveAdBanners);

export default router;

