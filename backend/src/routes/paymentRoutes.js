import express from 'express';
import { initiateCheckout, paymobWebhook } from '../controllers/paymentController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protected route to start checkout process
router.post('/checkout', authenticate, initiateCheckout);

// Public route for Paymob to send webhook callbacks
router.post('/webhook', paymobWebhook);

export default router;
