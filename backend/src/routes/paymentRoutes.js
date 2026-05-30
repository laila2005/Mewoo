import express from 'express';
import { initiateCheckout, paymobWebhook, simulatePaymentSuccess } from '../controllers/paymentController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Protected route to start checkout process
router.post('/checkout', requireAuth, initiateCheckout);

// Public route for Paymob to send webhook callbacks
router.post('/webhook', paymobWebhook);

// Protected route to securely simulate payment success
router.post('/simulate-success', requireAuth, simulatePaymentSuccess);

export default router;
