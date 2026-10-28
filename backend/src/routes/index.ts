import { Router } from 'express';
import { AccountController } from '../controllers/account.controller.js';
import { CampaignController } from '../controllers/campaign.controller.js';
import { RuleController } from '../controllers/rule.controller.js';
import { AuditController } from '../controllers/audit.controller.js';
import { NotificationController } from '../controllers/notification.controller.js';
import { SystemController } from '../controllers/system.controller.js';
import { AuthController } from '../controllers/auth.controller.js';
import { PancakeController } from '../controllers/pancake.controller.js';

const router = Router();

// Healthcheck
router.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'Auto Ads Care', timestamp: new Date().toISOString() });
});

// Authentication & Sub-Account Management API
router.post('/auth/login', AuthController.login);
router.get('/auth/me', AuthController.getMe);
router.get('/users', AuthController.listUsers);
router.post('/users', AuthController.createUser);
router.put('/users/:id', AuthController.updateUser);
router.delete('/users/:id', AuthController.deleteUser);

// Accounts API
router.get('/accounts', AccountController.listAccounts);
router.post('/accounts/connect', AccountController.connectLiveAccount);
router.post('/accounts/:id/sync', AccountController.syncAccount);
router.post('/accounts/seed-mock', AccountController.seedMock);

// POS Pancake & Financial Analytics API
router.get('/pancake/shops', PancakeController.listShops);
router.post('/pancake/shops', PancakeController.connectShop);
router.post('/pancake/shops/:id/sync', PancakeController.syncShop);
router.delete('/pancake/shops/:id', PancakeController.deleteShop);
router.get('/pancake/stats', PancakeController.getFinancialStats);
router.post('/pancake/seed-mock', PancakeController.seedMockOrders);

// Campaigns & Hierarchy API
router.get('/campaigns/hierarchy', CampaignController.getHierarchy);
router.post('/campaigns/toggle-status', CampaignController.toggleStatus);

// Care Rules API
router.get('/rules', RuleController.getRules);
router.post('/rules', RuleController.createRule);
router.put('/rules/:id', RuleController.updateRule);
router.patch('/rules/:id/toggle-enabled', RuleController.toggleEnabled);
router.patch('/rules/:id/toggle-live-mode', RuleController.toggleLiveMode);
router.delete('/rules/:id', RuleController.deleteRule);
router.post('/rules/simulate', RuleController.simulate);
router.post('/rules/:id/evaluate-now', RuleController.evaluateNow);

// Audit & Execution History API
router.get('/audit/actions', AuditController.getAutomationActions);
router.get('/audit/evaluations', AuditController.getRuleEvaluations);

// Notifications API
router.get('/notifications', NotificationController.getNotifications);
router.patch('/notifications/:id/read', NotificationController.markRead);

// System & Dashboard API
router.get('/system/status', SystemController.getSystemStatus);
router.post('/system/emergency-stop', SystemController.toggleEmergencyStop);
router.post('/system/trigger-scheduler', SystemController.triggerScheduler);
router.get('/dashboard/summary', SystemController.getDashboardSummary);

// Telegram Mobile Alert & Remote Control API
import { TelegramController } from '../controllers/telegram.controller.js';
router.get('/telegram/config', TelegramController.getConfig);
router.post('/telegram/config', TelegramController.updateConfig);
router.post('/telegram/test', TelegramController.testConnection);
router.post('/telegram/report-now', TelegramController.sendReportNow);

export default router;
