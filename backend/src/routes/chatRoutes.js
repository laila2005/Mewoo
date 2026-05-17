import express from 'express';
import { sendChatRequest, checkChatStatus } from '../controllers/chatController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

router.post('/request', sendChatRequest);
router.get('/status', checkChatStatus);

export default router;
