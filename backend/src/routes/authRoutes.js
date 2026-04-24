import express from 'express';
import { register, login } from '../controllers/authController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected route example
router.get('/me', requireAuth, (req, res) => {
    res.status(200).json({ user: req.user });
});

export default router;
