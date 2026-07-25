import express from 'express';
import { 
    getAnalytics,
    getAnalyticsTimeseries,
    getUsers,
    verifyProfile, 
    getAllServices, 
    getAllBookings,
    updateBookingStatus,
    toggleBanUser,
    updateUserRole,
    deleteUser, 
    getAllPosts, 
    deletePost, 
    getAllSubscriptions,
    updateSubscriptionStatus,
    getAIInsights, 
    askAIQuery, 
    getModerationQueue, 
    restorePost,
    getPlatformSettings,
    updateCommissionRate,
    createAdminService,
    updateAdminService,
    deleteAdminService,
    getAdminPlans,
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

// NOTE: every admin route below carries requireAdmin as well as requireAuth.
// Previously many were requireAuth-only, which let ANY logged-in user (owner/
// vet/vendor) ban/delete users, approve vet credentials, delete posts, and read
// all-platform PII — a privilege-escalation hole. requireAdmin closes it.
router.get('/analytics', requireAuth, requireAdmin, getAnalytics);
router.get('/analytics/timeseries', requireAuth, requireAdmin, getAnalyticsTimeseries);
router.get('/users', requireAuth, requireAdmin, getUsers);
router.put('/users/:id/ban', requireAuth, requireAdmin, toggleBanUser);
router.put('/users/:id/role', requireAuth, requireAdmin, updateUserRole);
router.delete('/users/:id', requireAuth, requireAdmin, deleteUser);
router.get('/services', requireAuth, requireAdmin, getAllServices);
router.get('/bookings', requireAuth, requireAdmin, getAllBookings);
router.put('/bookings/:id/status', requireAuth, requireAdmin, updateBookingStatus);
router.put('/verify/:id', requireAuth, requireAdmin, verifyProfile);
router.get('/posts', requireAuth, requireAdmin, getAllPosts);
router.get('/posts/moderation', requireAuth, requireAdmin, getModerationQueue);
router.put('/posts/:id/restore', requireAuth, requireAdmin, restorePost);
router.delete('/posts/:id', requireAuth, requireAdmin, deletePost);
router.get('/subscriptions', requireAuth, requireAdmin, getAllSubscriptions);
router.put('/subscriptions/:id/status', requireAuth, requireAdmin, updateSubscriptionStatus);
router.get('/ai/insights', requireAuth, requireAdmin, getAIInsights);
router.post('/ai/query', requireAuth, requireAdmin, askAIQuery);

// Platform settings — commission rate (admin only)
router.get('/settings', requireAuth, requireAdmin, getPlatformSettings);
router.put('/settings/commission', requireAuth, requireAdmin, updateCommissionRate);

// Services CRUD (Locked down with requireAdmin)
router.post('/services', requireAuth, requireAdmin, createAdminService);
router.put('/services/:id', requireAuth, requireAdmin, updateAdminService);
router.delete('/services/:id', requireAuth, requireAdmin, deleteAdminService);

// Subscription Plans CRUD (Locked down with requireAdmin)
router.get('/plans', requireAuth, requireAdmin, getAdminPlans);
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
