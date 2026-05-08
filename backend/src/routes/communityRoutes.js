import express from 'express';
import { getPosts, createPost, toggleLike, getComments, addComment } from '../controllers/communityController.js';
import { requireAuth, optionalAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Get posts with optional auth (to check if user liked it)
router.get('/posts', optionalAuth, getPosts);
router.get('/posts/:id/comments', getComments); // Read comments (public)

// Protected routes
router.use(requireAuth);
router.post('/posts', createPost);
router.post('/posts/:id/like', toggleLike);
router.post('/posts/:id/comments', addComment);

export default router;
