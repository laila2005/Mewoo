import express from 'express';
import { getPosts, getPostById, createPost, updatePost, toggleLike, getComments, addComment, toggleCommentReaction, getMyDeletedPosts, requestPostReview } from '../controllers/communityController.js';
import { requireAuth, optionalAuth } from '../middlewares/authMiddleware.js';
import { validateBody, validateParamId, schemas } from '../middlewares/inputValidator.js';

const router = express.Router();

// Get posts with optional auth (to check if user liked it)
router.get('/posts', optionalAuth, getPosts);
router.get('/posts/:id', validateParamId('id'), optionalAuth, getPostById);
router.get('/posts/:id/comments', validateParamId('id'), optionalAuth, getComments); // Read comments

// Protected routes
router.use(requireAuth);
router.post('/posts', validateBody(schemas.createPost), createPost);
router.get('/posts/deleted', getMyDeletedPosts); // Mount before params to avoid conflict
router.put('/posts/:id', validateParamId('id'), updatePost);
router.post('/posts/:id/like', validateParamId('id'), toggleLike);
router.post('/posts/:id/comments', validateParamId('id'), validateBody(schemas.addComment), addComment);
router.post('/posts/:postId/comments/:commentId/react', validateParamId('postId'), toggleCommentReaction);
router.put('/posts/:id/appeal', validateParamId('id'), requestPostReview);

export default router;
