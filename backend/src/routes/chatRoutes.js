import express from 'express';
import { sendChatRequest, checkChatStatus, getChatRequests, acceptChatRequest } from '../controllers/chatController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

router.post('/request', sendChatRequest);
router.get('/status', checkChatStatus);
router.get('/requests', getChatRequests);
router.put('/request/:id/accept', acceptChatRequest);

export default router;
