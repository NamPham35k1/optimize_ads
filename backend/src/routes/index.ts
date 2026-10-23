import { Router } from 'express';
import { AccountController } from '../controllers/account.controller.js';
import { CampaignController } from '../controllers/campaign.controller.js';
import { RuleController } from '../controllers/rule.controller.js';
import { AuditController } from '../controllers/audit.controller.js';
import { NotificationController } from '../controllers/notification.controller.js';
import { SystemController } from '../controllers/system.controller.js';

const router = Router();

// Accounts API
router.get('/accounts', AccountController.listAccounts);
router.post('/accounts/connect', AccountController.connectLiveAccount);
router.post('/accounts/:id/sync', AccountController.syncAccount);
router.post('/accounts/seed-mock', AccountController.seedMock);

// Campaigns & Hierarchy API
router.get('/campaigns/hierarchy', CampaignController.getHierarchy);

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

export default router;
