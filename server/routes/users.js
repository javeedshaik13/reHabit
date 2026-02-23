import express from 'express';
import dashboard from '../controllers/dashboardController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/stats', dashboard.getUserStats);
router.get('/leaderboard', dashboard.getLeaderboard);
router.get('/insights', dashboard.getAIInsights);
router.get('/heatmap/monthly', dashboard.getMonthlyHeatmap);
router.get('/analytics/consistency', dashboard.getAnalyticsConsistency);
router.get('/analytics/metrics', dashboard.getAnalyticsMetrics);
router.get('/analytics/feedback', dashboard.getAnalyticsFeedback);

export default router;
