import { Request, Response } from 'express';
import prisma from '../db.js';

export class AuditController {
  public static async getAutomationActions(req: Request, res: Response): Promise<void> {
    try {
      const { adAccountId, status, limit = 100 } = req.query;

      const whereClause: any = {};
      if (adAccountId) whereClause.adAccountId = String(adAccountId);
      if (status) whereClause.status = String(status);

      const actions = await prisma.automationAction.findMany({
        where: whereClause,
        include: {
          rule: {
            select: {
              name: true,
              isDryRun: true,
            },
          },
          adAccount: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { executedAt: 'desc' },
        take: parseInt(String(limit), 10),
      });

      res.json({ success: true, data: actions });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getRuleEvaluations(req: Request, res: Response): Promise<void> {
    try {
      const { ruleId, adAccountId, status, limit = 100 } = req.query;

      const whereClause: any = {};
      if (ruleId) whereClause.ruleId = String(ruleId);
      if (adAccountId) whereClause.adAccountId = String(adAccountId);
      if (status) whereClause.status = String(status);

      const evaluations = await prisma.ruleEvaluation.findMany({
        where: whereClause,
        include: {
          rule: {
            select: {
              name: true,
              scope: true,
              metricType: true,
              isDryRun: true,
            },
          },
        },
        orderBy: { evaluationTime: 'desc' },
        take: parseInt(String(limit), 10),
      });

      res.json({ success: true, data: evaluations });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
