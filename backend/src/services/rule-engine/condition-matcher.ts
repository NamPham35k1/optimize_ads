import { ResolvedMetrics, MetricResolver } from '../meta-api/metric-resolver.js';

export interface ConditionRuleConfig {
  metricType: string; // "COST_PER_MESSAGING", "SPEND_WITHOUT_MESSAGES", "CPM", "CPC", "CTR", "TOTAL_SPEND"
  operator: string;   // "GREATER_THAN", "GREATER_THAN_OR_EQUAL", "LESS_THAN", "LESS_THAN_OR_EQUAL"
  thresholdValue: number;
  minResults: number; // e.g. at least 3 messages before evaluating cost per message
  minSpend: number;   // e.g. spent at least 200,000 VND for zero-message rule
}

export interface MatchResult {
  conditionMet: boolean;
  currentValue: number;
  thresholdValue: number;
  isSufficientData: boolean;
  reason: string;
}

export class ConditionMatcher {
  /**
   * Compares two numbers with an operator.
   */
  public static compare(left: number, op: string, right: number): boolean {
    switch (op) {
      case 'GREATER_THAN':
        return left > right;
      case 'GREATER_THAN_OR_EQUAL':
        return left >= right;
      case 'LESS_THAN':
        return left < right;
      case 'LESS_THAN_OR_EQUAL':
        return left <= right;
      default:
        return false;
    }
  }

  public static getOperatorSymbol(op: string): string {
    switch (op) {
      case 'GREATER_THAN':
        return '>';
      case 'GREATER_THAN_OR_EQUAL':
        return '>=';
      case 'LESS_THAN':
        return '<';
      case 'LESS_THAN_OR_EQUAL':
        return '<=';
      default:
        return op;
    }
  }

  /**
   * Evaluate if an entity's metrics match the rule condition.
   */
  public static evaluate(rule: ConditionRuleConfig, metrics: ResolvedMetrics): MatchResult {
    const symbol = this.getOperatorSymbol(rule.operator);

    // Case 1: Special rule for High Spend with Zero Messages
    if (rule.metricType === 'SPEND_WITHOUT_MESSAGES') {
      const spend = metrics.spend;
      const effectiveMinSpend = rule.minSpend > 0 ? rule.minSpend : rule.thresholdValue;

      if (metrics.messagingConversations === 0) {
        if (spend >= effectiveMinSpend) {
          return {
            conditionMet: true,
            currentValue: spend,
            thresholdValue: effectiveMinSpend,
            isSufficientData: true,
            reason: `Đã chi tiêu ${spend.toLocaleString('vi-VN')} đ nhưng chưa có tin nhắn nào (vượt ngưỡng chi ${effectiveMinSpend.toLocaleString('vi-VN')} đ)`,
          };
        } else {
          return {
            conditionMet: false,
            currentValue: spend,
            thresholdValue: effectiveMinSpend,
            isSufficientData: false,
            reason: `Chưa có tin nhắn nhưng chi tiêu (${spend.toLocaleString('vi-VN')} đ) chưa đạt ngưỡng tối thiểu ${effectiveMinSpend.toLocaleString('vi-VN')} đ để đánh giá`,
          };
        }
      } else {
        return {
          conditionMet: false,
          currentValue: spend,
          thresholdValue: effectiveMinSpend,
          isSufficientData: true,
          reason: `Chiến dịch đã có ${metrics.messagingConversations} tin nhắn, không áp dụng quy tắc 0 kết quả`,
        };
      }
    }

    // Case 2: Cost Per Messaging Conversation
    if (rule.metricType === 'COST_PER_MESSAGING') {
      // Must have at least minResults messages before evaluating average cost!
      if (metrics.messagingConversations < rule.minResults) {
        return {
          conditionMet: false,
          currentValue: metrics.costPerMessaging,
          thresholdValue: rule.thresholdValue,
          isSufficientData: false,
          reason: `Chưa đủ dữ liệu tối thiểu: Mới có ${metrics.messagingConversations}/${rule.minResults} tin nhắn. Không đánh giá sớm để tránh tắt oan.`,
        };
      }

      const isViolating = this.compare(metrics.costPerMessaging, rule.operator, rule.thresholdValue);
      return {
        conditionMet: isViolating,
        currentValue: metrics.costPerMessaging,
        thresholdValue: rule.thresholdValue,
        isSufficientData: true,
        reason: isViolating
          ? `Chi phí mỗi tin nhắn (${metrics.costPerMessaging.toLocaleString('vi-VN')} đ) ${symbol} ngưỡng ${rule.thresholdValue.toLocaleString('vi-VN')} đ (Đã có ${metrics.messagingConversations} tin nhắn)`
          : `Chi phí mỗi tin nhắn (${metrics.costPerMessaging.toLocaleString('vi-VN')} đ) nằm trong ngưỡng an toàn ${symbol} ${rule.thresholdValue.toLocaleString('vi-VN')} đ`,
      };
    }

    // Case 3: Other standard metrics (CPM, CPC, CTR, TOTAL_SPEND)
    const currentValue = MetricResolver.extractValueByMetricType(metrics, rule.metricType);
    const isViolating = this.compare(currentValue, rule.operator, rule.thresholdValue);

    return {
      conditionMet: isViolating,
      currentValue,
      thresholdValue: rule.thresholdValue,
      isSufficientData: metrics.hasSufficientData,
      reason: isViolating
        ? `Chỉ số ${rule.metricType} (${currentValue}) ${symbol} ngưỡng ${rule.thresholdValue}`
        : `Chỉ số ${rule.metricType} (${currentValue}) trong giới hạn an toàn`,
    };
  }
}
