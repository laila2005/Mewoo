import express from 'express';
import { getShopDetails, updateShopDetails, addProduct, getVendorProducts, updateProduct, deleteProduct } from '../controllers/vendorController.js';
import { requireAuth as authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All vendor routes require authentication
router.use(authMiddleware);

// Middleware to check if user is a vendor
const vendorCheck = (req, res, next) => {
    if (req.user.role !== 'vendor') {
        return res.status(403).json({ error: 'Vendor access required' });
    }
    next();
};

router.use(vendorCheck);

router.get('/shop', getShopDetails);
router.put('/shop', updateShopDetails);
router.get('/products', getVendorProducts);
router.post('/products', addProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

export default router;
