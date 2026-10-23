import cron, { ScheduledTask } from 'node-cron';
import prisma from '../../db.js';
import { RuleEvaluator } from '../rule-engine/rule-evaluator.js';
import { config } from '../../config/index.js';

export class CareScheduler {
  private static task: ScheduledTask | null = null;
  private static isRunning = false;

  /**
   * Start the automated background care scheduler.
   */
  public static start(): void {
    if (this.task) {
      console.log('[CareScheduler] Scheduler is already running.');
      return;
    }

    const cronPattern = config.schedulerCron;
    console.log(`[CareScheduler] Starting scheduler with pattern: "${cronPattern}"`);

    this.task = cron.schedule(cronPattern, async () => {
      await this.runCycle();
    });
  }

  /**
   * Stop the background scheduler.
   */
  public static stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      console.log('[CareScheduler] Scheduler stopped.');
    }
  }

  /**
   * Run a full care cycle across all active rules.
   */
  public static async runCycle(): Promise<{ evaluatedCount: number; errors: string[] }> {
    if (this.isRunning) {
      console.log('[CareScheduler] Previous cycle is still running. Skipping to avoid overlap.');
      return { evaluatedCount: 0, errors: ['Previous cycle still in progress'] };
    }

    this.isRunning = true;
    const errors: string[] = [];
    let evaluatedCount = 0;

    try {
      // Step 1: Find all active rules
      const activeRules = await prisma.careRule.findMany({
        where: { isEnabled: true },
        include: { adAccount: true },
      });

      console.log(`[CareScheduler] Running care cycle for ${activeRules.length} active rules...`);

      for (const rule of activeRules) {
        try {
          // Check if it's time to check this rule based on checkIntervalMinutes
          if (rule.lastCheckedAt) {
            const minutesSinceLastCheck =
              (Date.now() - new Date(rule.lastCheckedAt).getTime()) / (1000 * 60);
            if (minutesSinceLastCheck < rule.checkIntervalMinutes) {
              continue; // Interval not elapsed yet
            }
          }

          console.log(`[CareScheduler] Evaluating rule: "${rule.name}" (${rule.id})`);
          await RuleEvaluator.evaluateRule(rule.id);
          evaluatedCount++;
        } catch (ruleErr: any) {
          console.error(`[CareScheduler Error] Failed evaluating rule ${rule.id}:`, ruleErr.message);
          errors.push(`Rule ${rule.id} failed: ${ruleErr.message}`);
        }
      }
    } catch (cycleErr: any) {
      console.error('[CareScheduler Error] Critical error during scheduler cycle:', cycleErr.message);
      errors.push(`Cycle error: ${cycleErr.message}`);
    } finally {
      this.isRunning = false;
    }

    return { evaluatedCount, errors };
  }
}
