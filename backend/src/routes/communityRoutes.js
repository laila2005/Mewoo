import express from 'express';
import { getPosts, createPost, toggleLike, getComments, addComment } from '../controllers/communityController.js';
import { requireAuth, optionalAuth } from '../middlewares/authMiddleware.js';
import { validateBody, validateParamId, schemas } from '../middlewares/inputValidator.js';

const router = express.Router();

// Get posts with optional auth (to check if user liked it)
router.get('/posts', optionalAuth, getPosts);
router.get('/posts/:id/comments', validateParamId('id'), getComments); // Read comments (public)

// Protected routes
router.use(requireAuth);
router.post('/posts', validateBody(schemas.createPost), createPost);
router.post('/posts/:id/like', validateParamId('id'), toggleLike);
router.post('/posts/:id/comments', validateParamId('id'), validateBody(schemas.addComment), addComment);

export default router;
