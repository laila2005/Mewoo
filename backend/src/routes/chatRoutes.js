import express from 'express';
import { sendChatRequest, checkChatStatus, getChatRequests, acceptChatRequest, ignoreChatRequest, reportSpam, removeSpam, getConnections } from '../controllers/chatController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

router.post('/request', sendChatRequest);
router.get('/status', checkChatStatus);
router.get('/requests', getChatRequests);
router.get('/connections', getConnections);
router.put('/request/:id/accept', acceptChatRequest);
router.put('/request/:id/ignore', ignoreChatRequest);
router.post('/spam', reportSpam);
router.post('/unspam', removeSpam);

export default router;

