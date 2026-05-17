import express from 'express';
import { getConversations, getChatHistory, deleteMessage } from '../controllers/messageController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All message routes are protected
router.use(requireAuth);

router.get('/conversations', getConversations);
router.get('/:partnerId', getChatHistory);
router.delete('/:messageId', deleteMessage);

export default router;
