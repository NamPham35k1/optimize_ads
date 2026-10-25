import prisma from '../../db.js';
import { CareRule } from '@prisma/client';
import { MetaService } from '../meta-api/meta-service.js';
import { MetricResolver, ResolvedMetrics } from '../meta-api/metric-resolver.js';
import { ConditionMatcher, MatchResult } from './condition-matcher.js';
import { ActionExecutor, ActionResult } from './action-executor.js';

export interface EvaluatedEntityResult {
  entityId: string;
  entityName: string;
  entityType: 'CAMPAIGN' | 'ADSET' | 'AD';
  metrics: ResolvedMetrics;
  matchResult: MatchResult;
  consecutiveViolations: number;
  willTriggerAction: boolean;
  actionResult?: ActionResult;
}

export interface RuleEvaluationSummary {
  ruleId: string;
  ruleName: string;
  scope: string;
  totalEvaluated: number;
  totalViolations: number;
  totalActionsTriggered: number;
  isDryRun: boolean;
  entities: EvaluatedEntityResult[];
}

export class RuleEvaluator {
  /**
   * Evaluates an existing CareRule against database and Meta data.
   */
  public static async evaluateRule(ruleId: string): Promise<RuleEvaluationSummary> {
    const rule = await prisma.careRule.findUnique({
      where: { id: ruleId },
      include: { adAccount: true },
    });

    if (!rule) {
      throw new Error(`Rule ${ruleId} not found`);
    }

    if (!rule.isEnabled) {
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        scope: rule.scope,
        totalEvaluated: 0,
        totalViolations: 0,
        totalActionsTriggered: 0,
        isDryRun: rule.isDryRun,
        entities: [],
      };
    }

    const { client, accessToken } = await MetaService.getClientForAccount(rule.adAccountId);
    const targetEntities = await this.resolveTargetEntities(rule);
    const results: EvaluatedEntityResult[] = [];

    let consecutiveViolations = rule.currentConsecutiveViolations;
    let anyEntityViolated = false;

    for (const entity of targetEntities) {
      // Fetch insights
      const level = rule.scope.toLowerCase() as 'campaign' | 'adset' | 'ad';
      const rawInsight = await client.getInsights(
        entity.id,
        level,
        rule.reportingWindow.toLowerCase(),
        accessToken
      );

      const metrics = MetricResolver.resolve(rawInsight);

      const matchResult = ConditionMatcher.evaluate(
        {
          metricType: rule.metricType,
          operator: rule.operator,
          thresholdValue: rule.thresholdValue,
          minResults: rule.minResults,
          minSpend: rule.minSpend,
        },
        metrics
      );

      let entityConsecutive = consecutiveViolations;
      let willTrigger = false;
      let actionResult: ActionResult | undefined = undefined;

      if (matchResult.conditionMet) {
        anyEntityViolated = true;
        entityConsecutive += 1;
        if (entityConsecutive >= rule.consecutiveViolationsRequired) {
          willTrigger = true;
          // Execute action (either dry run or real pause)
          if (rule.action === 'PAUSE') {
            actionResult = await ActionExecutor.executePause({
              ruleId: rule.id,
              adAccountId: rule.adAccountId,
              entityType: rule.scope as 'CAMPAIGN' | 'ADSET' | 'AD',
              entityId: entity.id,
              entityName: entity.name,
              isDryRun: rule.isDryRun,
              reason: matchResult.reason,
            });
          }
        }
      } else {
        // Reset consecutive count if condition is not met
        entityConsecutive = 0;
      }

      // Record RuleEvaluation history in DB
      await prisma.ruleEvaluation.create({
        data: {
          ruleId: rule.id,
          adAccountId: rule.adAccountId,
          entityType: rule.scope,
          entityId: entity.id,
          entityName: entity.name,
          metricType: rule.metricType,
          currentValue: matchResult.currentValue,
          thresholdValue: matchResult.thresholdValue,
          conditionMet: matchResult.conditionMet,
          consecutiveCount: entityConsecutive,
          actionProposed: willTrigger ? rule.action : 'NONE',
          actionTaken: actionResult ? actionResult.actionTaken : 'NONE',
          status: willTrigger
            ? rule.isDryRun
              ? 'DRY_RUN_LOGGED'
              : 'EXECUTED'
            : matchResult.conditionMet
            ? 'VIOLATED'
            : 'PASSED',
          details: JSON.stringify({
            metrics,
            matchResult,
            reason: matchResult.reason,
          }),
        },
      });

      results.push({
        entityId: entity.id,
        entityName: entity.name,
        entityType: rule.scope as any,
        metrics,
        matchResult,
        consecutiveViolations: entityConsecutive,
        willTriggerAction: willTrigger,
        actionResult,
      });
    }

    // Update rule consecutive state and timestamp
    await prisma.careRule.update({
      where: { id: rule.id },
      data: {
        currentConsecutiveViolations: anyEntityViolated ? consecutiveViolations + 1 : 0,
        lastCheckedAt: new Date(),
        lastViolatedAt: anyEntityViolated ? new Date() : rule.lastViolatedAt,
      },
    });

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      scope: rule.scope,
      totalEvaluated: results.length,
      totalViolations: results.filter((r) => r.matchResult.conditionMet).length,
      totalActionsTriggered: results.filter((r) => r.willTriggerAction).length,
      isDryRun: rule.isDryRun,
      entities: results,
    };
  }

  /**
   * Rule Simulator: test a draft or existing rule configuration without saving or executing anything.
   */
  public static async simulate(
    adAccountId: string,
    ruleConfig: {
      scope: 'CAMPAIGN' | 'ADSET' | 'AD';
      targetMode: 'ALL_ACTIVE' | 'SELECTED';
      targetEntityIds: string[];
      metricType: string;
      operator: string;
      thresholdValue: number;
      reportingWindow: string;
      minResults: number;
      minSpend: number;
      consecutiveViolationsRequired: number;
      action: string;
    }
  ): Promise<RuleEvaluationSummary> {
    const { client, accessToken } = await MetaService.getClientForAccount(adAccountId);

    const mockRuleObj = {
      adAccountId,
      scope: ruleConfig.scope,
      targetMode: ruleConfig.targetMode,
      targetEntityIds: JSON.stringify(ruleConfig.targetEntityIds || []),
    };

    const targetEntities = await this.resolveTargetEntities(mockRuleObj);
    const results: EvaluatedEntityResult[] = [];

    for (const entity of targetEntities) {
      const level = ruleConfig.scope.toLowerCase() as 'campaign' | 'adset' | 'ad';
      const rawInsight = await client.getInsights(
        entity.id,
        level,
        ruleConfig.reportingWindow.toLowerCase(),
        accessToken
      );

      const metrics = MetricResolver.resolve(rawInsight);

      const matchResult = ConditionMatcher.evaluate(
        {
          metricType: ruleConfig.metricType,
          operator: ruleConfig.operator,
          thresholdValue: ruleConfig.thresholdValue,
          minResults: ruleConfig.minResults,
          minSpend: ruleConfig.minSpend,
        },
        metrics
      );

      const willTrigger = matchResult.conditionMet;

      results.push({
        entityId: entity.id,
        entityName: entity.name,
        entityType: ruleConfig.scope,
        metrics,
        matchResult,
        consecutiveViolations: matchResult.conditionMet ? 1 : 0,
        willTriggerAction: willTrigger,
        actionResult: {
          success: true,
          actionTaken: 'DRY_RUN',
          message: willTrigger
            ? `[Mô phỏng] Đối tượng sẽ bị ${ruleConfig.action === 'PAUSE' ? 'tạm dừng' : 'cảnh báo'} nếu vi phạm đủ ${ruleConfig.consecutiveViolationsRequired} lần`
            : '[Mô phỏng] Đối tượng không vi phạm điều kiện',
          isVerified: true,
        },
      });
    }

    return {
      ruleId: 'simulator_preview',
      ruleName: 'Mô phỏng quy tắc',
      scope: ruleConfig.scope,
      totalEvaluated: results.length,
      totalViolations: results.filter((r) => r.matchResult.conditionMet).length,
      totalActionsTriggered: results.filter((r) => r.willTriggerAction).length,
      isDryRun: true,
      entities: results,
    };
  }

  /**
   * Helper to resolve target entities based on targetMode and scope.
   */
  private static async resolveTargetEntities(rule: {
    adAccountId: string;
    scope: string;
    targetMode: string;
    targetEntityIds: string;
  }): Promise<Array<{ id: string; name: string }>> {
    let selectedIds: string[] = [];
    try {
      selectedIds = JSON.parse(rule.targetEntityIds || '[]');
    } catch {
      selectedIds = [];
    }

    if (rule.scope === 'CAMPAIGN') {
      const campaigns = await prisma.campaignSnapshot.findMany({
        where: {
          adAccountId: rule.adAccountId,
          status: 'ACTIVE',
          ...(rule.targetMode === 'SELECTED' && selectedIds.length > 0
            ? { fbCampaignId: { in: selectedIds } }
            : {}),
        },
      });
      return campaigns.map((c) => ({ id: c.fbCampaignId, name: c.name }));
    } else if (rule.scope === 'ADSET') {
      const adsets = await prisma.adSetSnapshot.findMany({
        where: {
          adAccountId: rule.adAccountId,
          status: 'ACTIVE',
          ...(rule.targetMode === 'SELECTED' && selectedIds.length > 0
            ? {
                OR: [
                  { fbCampaignId: { in: selectedIds } },
                  { fbAdSetId: { in: selectedIds } },
                ],
              }
            : {}),
        },
      });
      return adsets.map((s) => ({ id: s.fbAdSetId, name: s.name }));
    } else {
      const ads = await prisma.adSnapshot.findMany({
        where: {
          adAccountId: rule.adAccountId,
          status: 'ACTIVE',
          ...(rule.targetMode === 'SELECTED' && selectedIds.length > 0
            ? {
                OR: [
                  { fbCampaignId: { in: selectedIds } },
                  { fbAdId: { in: selectedIds } },
                ],
              }
            : {}),
        },
      });
      return ads.map((a) => ({ id: a.fbAdId, name: a.name }));
    }
  }
}
