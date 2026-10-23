import { describe, it, expect } from 'vitest';
import { ConditionMatcher } from '../src/services/rule-engine/condition-matcher.js';
import { ResolvedMetrics } from '../src/services/meta-api/metric-resolver.js';

describe('ConditionMatcher Unit Tests', () => {
  const baseMetrics: ResolvedMetrics = {
    spend: 450000,
    impressions: 15000,
    clicks: 300,
    cpm: 30000,
    cpc: 1500,
    ctr: 2,
    messagingConversations: 3,
    costPerMessaging: 150000,
    leads: 0,
    purchases: 0,
    isZeroResults: false,
    hasSufficientData: true,
  };

  it('triggers violation when cost per message exceeds threshold with sufficient results', () => {
    const result = ConditionMatcher.evaluate(
      {
        metricType: 'COST_PER_MESSAGING',
        operator: 'GREATER_THAN',
        thresholdValue: 100000,
        minResults: 3,
        minSpend: 0,
      },
      baseMetrics
    );

    expect(result.conditionMet).toBe(true);
    expect(result.currentValue).toBe(150000);
    expect(result.isSufficientData).toBe(true);
  });

  it('does NOT trigger violation when messaging conversations are below minResults', () => {
    // Only 2 messages (minResults = 3)
    const lowSampleMetrics: ResolvedMetrics = {
      ...baseMetrics,
      messagingConversations: 2,
      costPerMessaging: 225000,
    };

    const result = ConditionMatcher.evaluate(
      {
        metricType: 'COST_PER_MESSAGING',
        operator: 'GREATER_THAN',
        thresholdValue: 100000,
        minResults: 3,
        minSpend: 0,
      },
      lowSampleMetrics
    );

    // Must not evaluate/trigger to protect campaign from premature shutdown
    expect(result.conditionMet).toBe(false);
    expect(result.isSufficientData).toBe(false);
    expect(result.reason).toContain('Chưa đủ dữ liệu tối thiểu');
  });

  it('triggers SPEND_WITHOUT_MESSAGES violation when spend exceeds threshold with 0 messages', () => {
    const zeroMsgMetrics: ResolvedMetrics = {
      ...baseMetrics,
      messagingConversations: 0,
      costPerMessaging: 0,
      spend: 250000,
      isZeroResults: true,
    };

    const result = ConditionMatcher.evaluate(
      {
        metricType: 'SPEND_WITHOUT_MESSAGES',
        operator: 'GREATER_THAN_OR_EQUAL',
        thresholdValue: 200000,
        minResults: 0,
        minSpend: 200000,
      },
      zeroMsgMetrics
    );

    expect(result.conditionMet).toBe(true);
    expect(result.currentValue).toBe(250000);
  });

  it('does NOT trigger SPEND_WITHOUT_MESSAGES if spend is below threshold', () => {
    const lowSpendZeroMsg: ResolvedMetrics = {
      ...baseMetrics,
      messagingConversations: 0,
      costPerMessaging: 0,
      spend: 50000,
      isZeroResults: true,
    };

    const result = ConditionMatcher.evaluate(
      {
        metricType: 'SPEND_WITHOUT_MESSAGES',
        operator: 'GREATER_THAN_OR_EQUAL',
        thresholdValue: 200000,
        minResults: 0,
        minSpend: 200000,
      },
      lowSpendZeroMsg
    );

    expect(result.conditionMet).toBe(false);
    expect(result.isSufficientData).toBe(false);
  });
});
