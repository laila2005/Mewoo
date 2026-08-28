import express from 'express';
import { 
    getPublicStats, 
    getPublicPlans, 
    getPublicProducts, 
    getPublicProductById, 
    getProductReviews, 
    addProductReview, 
    getPublicShops,
    getActiveAdBanners,
    getOsmShops,
    getPublicFeatureFlags,
    validatePartnerInvite
} from '../controllers/publicController.js';
import { getShopBySlug, resolveShopSlug, toggleFollowShop } from '../controllers/shopController.js';
import { requireAuth, optionalAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/stats', getPublicStats);
router.get('/feature-flags', getPublicFeatureFlags);
router.get('/plans', optionalAuth, getPublicPlans);
router.get('/products', getPublicProducts);
router.get('/products/:id', getPublicProductById);
router.get('/products/:id/reviews', getProductReviews);
router.post('/products/:id/reviews', requireAuth, addProductReview);
router.get('/shops', getPublicShops);
// Storefronts. `resolve` is declared before `:slug` so a shop can never be
// named in a way that shadows it.
router.get('/shops/resolve', resolveShopSlug);
// optionalAuth so a signed-in visitor sees their follow state and an owner can
// preview a shop that is still pending approval.
router.get('/shops/:slug', optionalAuth, getShopBySlug);
router.post('/shops/:slug/follow', requireAuth, toggleFollowShop);
// Beta partner invite check for the /beta-partner landing page. Answers only
// { valid, label?, role? } — never the usage counts or the expiry.
router.get('/partner-invite/:code', validatePartnerInvite);
router.get('/osm-shops', getOsmShops);
router.get('/ads', getActiveAdBanners);

export default router;

