import express from 'express';
import { sendChatRequest, checkChatStatus, getChatRequests, acceptChatRequest, ignoreChatRequest } from '../controllers/chatController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

router.post('/request', sendChatRequest);
router.get('/status', checkChatStatus);
router.get('/requests', getChatRequests);
router.put('/request/:id/accept', acceptChatRequest);
router.put('/request/:id/ignore', ignoreChatRequest);

export default router;
