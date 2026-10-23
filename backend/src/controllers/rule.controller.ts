import { Request, Response } from 'express';
import prisma from '../db.js';
import { RuleEvaluator } from '../services/rule-engine/rule-evaluator.js';

export class RuleController {
  public static async getRules(req: Request, res: Response): Promise<void> {
    try {
      const { adAccountId } = req.query;
      const whereClause = adAccountId ? { adAccountId: String(adAccountId) } : {};

      const rules = await prisma.careRule.findMany({
        where: whereClause,
        include: {
          adAccount: {
            select: {
              name: true,
              currency: true,
              isMock: true,
            },
          },
          _count: {
            select: {
              ruleEvaluations: true,
              automationActions: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ success: true, data: rules });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async createRule(req: Request, res: Response): Promise<void> {
    try {
      const {
        adAccountId,
        name,
        scope = 'ADSET',
        targetMode = 'ALL_ACTIVE',
        targetEntityIds = [],
        metricType = 'COST_PER_MESSAGING',
        operator = 'GREATER_THAN',
        thresholdValue,
        currency = 'VND',
        reportingWindow = 'TODAY',
        minResults = 3,
        minSpend = 0,
        consecutiveViolationsRequired = 2,
        checkIntervalMinutes = 15,
        action = 'PAUSE',
        isDryRun = true, // Mandatory default
        isEnabled = true,
      } = req.body;

      if (!adAccountId || !name || thresholdValue === undefined) {
        res.status(400).json({
          success: false,
          error: 'Tên quy tắc, tài khoản quảng cáo và giá trị ngưỡng là bắt buộc',
        });
        return;
      }

      const rule = await prisma.careRule.create({
        data: {
          adAccountId,
          name,
          scope,
          targetMode,
          targetEntityIds: JSON.stringify(targetEntityIds),
          metricType,
          operator,
          thresholdValue: parseFloat(thresholdValue),
          currency,
          reportingWindow,
          minResults: parseInt(minResults, 10),
          minSpend: parseFloat(minSpend || 0),
          consecutiveViolationsRequired: parseInt(consecutiveViolationsRequired, 10),
          checkIntervalMinutes: parseInt(checkIntervalMinutes, 10),
          action,
          isDryRun: Boolean(isDryRun),
          isEnabled: Boolean(isEnabled),
        },
      });

      res.status(201).json({ success: true, data: rule });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async updateRule(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const updates = req.body;

      if (updates.targetEntityIds && Array.isArray(updates.targetEntityIds)) {
        updates.targetEntityIds = JSON.stringify(updates.targetEntityIds);
      }

      const rule = await prisma.careRule.update({
        where: { id },
        data: updates,
      });

      res.json({ success: true, data: rule });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async toggleLiveMode(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const { isDryRun, confirmLiveMode } = req.body;

      // Mandatory Safety: If activating Live Mode (isDryRun = false), require explicit confirmation
      if (isDryRun === false && !confirmLiveMode) {
        res.status(400).json({
          success: false,
          error:
            'Chuyển sang Chế độ Thật (Live Mode) có thể tạm dừng quảng cáo thực tế trên Meta. Bạn phải xác nhận rõ ràng "confirmLiveMode: true".',
        });
        return;
      }

      const rule = await prisma.careRule.update({
        where: { id },
        data: { isDryRun: Boolean(isDryRun) },
      });

      res.json({
        success: true,
        message: rule.isDryRun
          ? 'Đã chuyển sang chế độ Thử nghiệm (Dry Run - An toàn)'
          : 'Đã kích hoạt Chế độ Thật (Live Mode) - Các vi phạm sẽ thực sự tạm dừng quảng cáo trên Meta!',
        data: rule,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async toggleEnabled(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const rule = await prisma.careRule.findUnique({ where: { id } });
      if (!rule) {
        res.status(404).json({ success: false, error: 'Rule not found' });
        return;
      }

      const updated = await prisma.careRule.update({
        where: { id },
        data: { isEnabled: !rule.isEnabled },
      });

      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async deleteRule(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      await prisma.careRule.delete({ where: { id } });
      res.json({ success: true, message: 'Đã xóa quy tắc thành công' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async simulate(req: Request, res: Response): Promise<void> {
    try {
      const {
        adAccountId,
        scope = 'ADSET',
        targetMode = 'ALL_ACTIVE',
        targetEntityIds = [],
        metricType = 'COST_PER_MESSAGING',
        operator = 'GREATER_THAN',
        thresholdValue,
        reportingWindow = 'TODAY',
        minResults = 3,
        minSpend = 0,
        consecutiveViolationsRequired = 2,
        action = 'PAUSE',
      } = req.body;

      if (!adAccountId || thresholdValue === undefined) {
        res.status(400).json({ success: false, error: 'Thiếu thông tin để mô phỏng' });
        return;
      }

      const result = await RuleEvaluator.simulate(adAccountId, {
        scope,
        targetMode,
        targetEntityIds,
        metricType,
        operator,
        thresholdValue: parseFloat(thresholdValue),
        reportingWindow,
        minResults: parseInt(minResults, 10),
        minSpend: parseFloat(minSpend || 0),
        consecutiveViolationsRequired: parseInt(consecutiveViolationsRequired, 10),
        action,
      });

      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async evaluateNow(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const result = await RuleEvaluator.evaluateRule(id);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
