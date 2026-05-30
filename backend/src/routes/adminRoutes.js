import express from 'express';
import { 
    getAnalytics, 
    getUsers, 
    verifyProfile, 
    getAllServices, 
    getAllBookings, 
    toggleBanUser, 
    deleteUser, 
    getAllPosts, 
    deletePost, 
    getAllSubscriptions, 
    getAIInsights, 
    askAIQuery, 
    getModerationQueue, 
    restorePost,
    createAdminService,
    updateAdminService,
    deleteAdminService,
    createAdminPlan,
    updateAdminPlan,
    deleteAdminPlan,
    createAdminProduct,
    updateAdminProduct,
    deleteAdminProduct,
    getAllAdminProducts,
    getAllAdBanners,
    updateAdBannerStatus,
    getAuditLogs,
    getDBMetrics,
    runDBBackup,
    clearDiagnosticCache,
    optimizeDatabaseIndexes
} from '../controllers/adminController.js';
import { requireAuth, requireAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/analytics', requireAuth, getAnalytics);
router.get('/users', requireAuth, getUsers);
router.put('/users/:id/ban', requireAuth, toggleBanUser);
router.delete('/users/:id', requireAuth, deleteUser);
router.get('/services', requireAuth, getAllServices);
router.get('/bookings', requireAuth, getAllBookings);
router.put('/verify/:id', requireAuth, verifyProfile);
router.get('/posts', requireAuth, getAllPosts);
router.get('/posts/moderation', requireAuth, getModerationQueue);
router.put('/posts/:id/restore', requireAuth, restorePost);
router.delete('/posts/:id', requireAuth, deletePost);
router.get('/subscriptions', requireAuth, getAllSubscriptions);
router.get('/ai/insights', requireAuth, getAIInsights);
router.post('/ai/query', requireAuth, askAIQuery);

// Services CRUD (Locked down with requireAdmin)
router.post('/services', requireAuth, requireAdmin, createAdminService);
router.put('/services/:id', requireAuth, requireAdmin, updateAdminService);
router.delete('/services/:id', requireAuth, requireAdmin, deleteAdminService);

// Subscription Plans CRUD (Locked down with requireAdmin)
router.post('/plans', requireAuth, requireAdmin, createAdminPlan);
router.put('/plans/:id', requireAuth, requireAdmin, updateAdminPlan);
router.delete('/plans/:id', requireAuth, requireAdmin, deleteAdminPlan);

// Marketplace Products CRUD (Locked down with requireAdmin)
router.get('/products', requireAuth, requireAdmin, getAllAdminProducts);
router.post('/products', requireAuth, requireAdmin, createAdminProduct);
router.put('/products/:id', requireAuth, requireAdmin, updateAdminProduct);
router.delete('/products/:id', requireAuth, requireAdmin, deleteAdminProduct);

// Ad Banner Campaign Moderation
router.get('/ads', requireAuth, requireAdmin, getAllAdBanners);
router.put('/ads/:id/status', requireAuth, requireAdmin, updateAdBannerStatus);

// Audit Logs Route (Admin only)
router.get('/logs', requireAuth, requireAdmin, getAuditLogs);

// Database Health & Maintenance Routes (Admin only)
router.get('/db/metrics', requireAuth, requireAdmin, getDBMetrics);
router.post('/db/backup', requireAuth, requireAdmin, runDBBackup);
router.post('/db/clear-cache', requireAuth, requireAdmin, clearDiagnosticCache);
router.post('/db/optimize-indexes', requireAuth, requireAdmin, optimizeDatabaseIndexes);

export default router;
